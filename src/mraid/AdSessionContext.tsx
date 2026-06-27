import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import type { View } from 'react-native';

import { MraidPlacementType, useMraidController } from '@/mraid';
import type { UseMraidControllerResult } from '@/mraid';
import { performNativeAction } from './nativeActions';

// The measured screen-space rect of the inline "slot" where the ad renders
// when MRAID state is "default". Captured via View.measureInWindow on the
// placeholder rendered inside AdRendererScreen.
export interface InlineRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AdSessionContextValue extends UseMraidControllerResult {
  creativeHtml: string;
  setCreativeHtml: (html: string) => void;
  inlineRect: InlineRect | null;
  registerInlineSlot: (node: View | null) => void;
  // Non-null while playVideo() has an active video to show full-screen.
  // VideoWatcher (in navigation/) reacts to this to push/pop the player route.
  videoUrl: string | null;
  closeVideo: () => void;
  // User-controlled toggle for whether the inline ad preview is shown.
  // Doesn't apply while the creative itself is in "expanded"/"resized" —
  // those always render regardless, since the creative triggered them.
  isAdVisible: boolean;
  toggleAdVisible: () => void;
}

const AdSessionContext = createContext<AdSessionContextValue | null>(null);

interface AdSessionProviderProps {
  children: ReactNode;
}

// Lives once at the app root. Owns the single MraidController/WebView
// instance for whichever creative is currently loaded, so screens never
// each create their own — there is exactly one "ad session" at a time,
// matching how the app is actually used (test one creative at a time).
export function AdSessionProvider({ children }: AdSessionProviderProps) {
  const { width, height } = useWindowDimensions();
  const [creativeHtml, setCreativeHtmlState] = useState('');
  const [inlineRect, setInlineRect] = useState<InlineRect | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAdVisible, setIsAdVisible] = useState(false);
  const slotNodeRef = useRef<View | null>(null);

  // useMraidController's options (including onNativeAction) are needed at
  // construction time, but logging a result requires the hook's own
  // return value, which doesn't exist yet at that point. A ref breaks the
  // cycle: the callback below is stable, and by the time any async action
  // resolves, mraidRef.current has already been set from the latest render.
  const mraidRef = useRef<UseMraidControllerResult | null>(null);

  // eslint-disable-next-line react-hooks/refs -- intentional .current unwrap at render time: useRef(fn).current gives a stable callback reference without triggering re-renders; the value is frozen at construction and never reassigned
  const handleNativeAction = useRef((method: string, args: unknown[]) => {
    if (method === 'playVideo') {
      setVideoUrl(String(args[0]));
      mraidRef.current?.logActionResult(method, true, 'Opening native video player.');

      return;
    }

    performNativeAction(method, args).then((result) => {
      mraidRef.current?.logActionResult(method, result.success, result.message);
    });
  }).current;

  const mraid = useMraidController({
    placementType: MraidPlacementType.Interstitial,
    adSize: { width, height },
    screenSize: { width, height },
    onNativeAction: handleNativeAction,
  });

  // eslint-disable-next-line react-hooks/refs -- intentional latest-value ref pattern: writing mraidRef.current during render keeps the callback closure below always pointing at the current hook result without adding it as a useMemo dep (which would cause stale-closure bugs)
  mraidRef.current = mraid;

  // Called via the inline slot's ref. Measures its on-screen position so
  // the overlay can draw the WebView in exactly the right place while
  // state is "default". Deferred with requestAnimationFrame because
  // calling measureInWindow synchronously inside onLayout can return
  // coordinates from a layout pass that hasn't fully committed yet,
  // especially right after sibling content above the slot changes size.
  const registerInlineSlot = (node: View | null) => {
    slotNodeRef.current = node;

    if (node === null) {
      return;
    }

    requestAnimationFrame(() => {
      node.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        setInlineRect({ x, y, width: measuredWidth, height: measuredHeight });
      });
    });
  };

  const closeVideo = () => {
    setVideoUrl(null);
  };

  const toggleAdVisible = () => {
    setIsAdVisible((previous) => !previous);
  };

  const value = useMemo<AdSessionContextValue>(
    () => ({
      ...mraid,
      creativeHtml,
      // Wraps the raw state setter so the controller resets its per-session
      // flags before the WebView receives new source HTML. Both `mraid` and
      // `creativeHtml` are already deps of this memo, so the comparison and
      // the reset call always see current values.
      setCreativeHtml: (html: string) => {
        if (html !== creativeHtml) {
          mraid.resetForNewCreative();
        }

        setCreativeHtmlState(html);
      },
      inlineRect,
      registerInlineSlot,
      videoUrl,
      closeVideo,
      isAdVisible,
      toggleAdVisible,
    }),
    [mraid, creativeHtml, inlineRect, videoUrl, isAdVisible],
  );

  return <AdSessionContext.Provider value={value}>{children}</AdSessionContext.Provider>;
}

export function useAdSession(): AdSessionContextValue {
  const context = useContext(AdSessionContext);

  if (context === null) {
    throw new Error('useAdSession must be used within an AdSessionProvider.');
  }

  return context;
}
