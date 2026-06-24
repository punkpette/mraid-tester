import { useMemo, useRef, useSyncExternalStore } from 'react';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';

import { buildBridgeScript } from './bridgeScript';
import { MraidController } from './MraidController';
import type { MraidControllerOptions } from './MraidController';
import type { MraidControllerState } from './types';

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

  return {
    webViewRef,
    injectedJavaScriptBeforeContentLoaded,
    state,
    onMessage,
    onLoadEnd,
    logActionResult,
  };
}
