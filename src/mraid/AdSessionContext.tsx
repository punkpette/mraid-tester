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
  const [creativeHtml, setCreativeHtml] = useState('');
  const [inlineRect, setInlineRect] = useState<InlineRect | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const slotNodeRef = useRef<View | null>(null);

  // useMraidController's options (including onNativeAction) are needed at
  // construction time, but logging a result requires the hook's own
  // return value, which doesn't exist yet at that point. A ref breaks the
  // cycle: the callback below is stable, and by the time any async action
  // resolves, mraidRef.current has already been set from the latest render.
  const mraidRef = useRef<UseMraidControllerResult | null>(null);

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
    placementType: MraidPlacementType.Inline,
    adSize: { width: 300, height: 250 },
    screenSize: { width, height },
    onNativeAction: handleNativeAction,
  });

  mraidRef.current = mraid;

  // Called via the inline slot's ref. Measures its on-screen position so
  // the overlay can draw the WebView in exactly the right place while
  // state is "default".
  const registerInlineSlot = (node: View | null) => {
    slotNodeRef.current = node;

    if (node === null) {
      return;
    }

    node.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setInlineRect({ x, y, width: measuredWidth, height: measuredHeight });
    });
  };

  const closeVideo = () => {
    setVideoUrl(null);
  };

  const value = useMemo<AdSessionContextValue>(
    () => ({
      ...mraid,
      creativeHtml,
      setCreativeHtml,
      inlineRect,
      registerInlineSlot,
      videoUrl,
      closeVideo,
    }),
    [mraid, creativeHtml, inlineRect, videoUrl],
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
