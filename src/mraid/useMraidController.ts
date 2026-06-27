import { useMemo, useRef, useSyncExternalStore } from 'react';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';

import { buildBridgeScript } from './bridgeScript';
import { MraidController } from './MraidController';
import type { MraidControllerOptions } from './MraidController';
import type { MraidControllerState, MraidPlacementTypeValue, MraidSize } from './types';

export interface UseMraidControllerResult {
  webViewRef: React.RefObject<WebView | null>;
  injectedJavaScriptBeforeContentLoaded: string;
  state: MraidControllerState;
  // Wire this directly to <WebView onMessage={...}>.
  onMessage: (event: WebViewMessageEvent) => void;
  // Wire this directly to <WebView onLoadEnd={...}> so the controller can
  // start pushing commands once the native WebView instance is mounted.
  onLoadEnd: () => void;
  // Lets async native action handlers (storePicture, etc.) report their
  // outcome back into the call log after the fact.
  logActionResult: (method: string, success: boolean, message: string) => void;
  // Lets the Ad Size Selector change the ad's logical size/placement
  // before (or between) creative loads.
  setAdSize: (size: MraidSize) => void;
  setPlacementType: (placementType: MraidPlacementTypeValue) => void;
  // Resets per-creative session state (hasFiredReady, calledMethods, MRAID
  // state) so the next creative gets a clean slate without remounting the
  // WebView. Must be called before setCreativeHtml changes the source.
  resetForNewCreative: () => void;
}

// `useSyncExternalStore` is the most efficient way to subscribe a React
// component to a plain external store like MraidController: React only
// re-renders when the snapshot actually changes, and there's no extra
// state copy living inside this hook.
export function useMraidController(options: MraidControllerOptions): UseMraidControllerResult {
  const controllerRef = useRef<MraidController | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = new MraidController(options);
  }

  const controller = controllerRef.current;
  const webViewRef = useRef<WebView | null>(null);

  const state = useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getState(),
  );

  const injectedJavaScriptBeforeContentLoaded = useMemo(
    // eslint-disable-next-line react-hooks/refs -- intentional: controller is controllerRef.current, a stable singleton created once; reading it inside useMemo during render is safe because its identity never changes after construction
    () => buildBridgeScript(controller.getState()),
    [controller],
  );

  const onLoadEnd = useMemo(() => {
    return () => {
      controller.attachWebView((javaScript) => {
        webViewRef.current?.injectJavaScript(javaScript);
      });
    };
  }, [controller]);

  const onMessage = useMemo(() => {
    return (event: WebViewMessageEvent) => {
      controller.handleBridgeMessage(event.nativeEvent.data);
    };
  }, [controller]);

  const logActionResult = useMemo(() => {
    return (method: string, success: boolean, message: string) => {
      controller.logActionResult(method, success, message);
    };
  }, [controller]);

  const setAdSize = useMemo(() => {
    return (size: MraidSize) => {
      controller.setAdSize(size);
    };
  }, [controller]);

  const setPlacementType = useMemo(() => {
    return (placementType: MraidPlacementTypeValue) => {
      controller.setPlacementType(placementType);
    };
  }, [controller]);

  const resetForNewCreative = useMemo(() => {
    return () => {
      controller.resetForNewCreative();
    };
  }, [controller]);

  return {
    webViewRef,
    injectedJavaScriptBeforeContentLoaded,
    state,
    onMessage,
    onLoadEnd,
    logActionResult,
    setAdSize,
    setPlacementType,
    resetForNewCreative,
  };
}
