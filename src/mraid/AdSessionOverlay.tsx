import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { MraidState } from '@/mraid';
import { useAdSession } from './AdSessionContext';
import type { InlineRect } from './AdSessionContext';

const OFFSCREEN_RECT: InlineRect = { x: 0, y: -9999, width: 1, height: 1 };

// Renders the single, persistent WebView for the whole app. It is mounted
// exactly once, here, at the root — never inside a navigator screen — so
// expand()/resize()/close() never trigger a remount (which would reload
// the creative and lose all of its JS state mid-session).
//
// Its position is purely visual: which screen-space rect it occupies is
// derived from the current MRAID state. React Navigation, in parallel,
// pushes a transparent route so the native back button and screen
// lifecycle behave correctly, but that route never renders the WebView
// itself — this component always paints on top of it.
export function AdSessionOverlay() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    webViewRef,
    injectedJavaScriptBeforeContentLoaded,
    state,
    onMessage,
    onLoadEnd,
    creativeHtml,
    inlineRect,
  } = useAdSession();

  const rect = computeVisualRect({
    mraidState: state.state,
    inlineRect,
    screenWidth,
    screenHeight,
    resizedWidth: state.resizeProperties?.width ?? state.defaultPosition.width,
    resizedHeight: state.resizeProperties?.height ?? state.defaultPosition.height,
  });

  return (
    <View
      style={[
        styles.container,
        {
          top: rect.y,
          left: rect.x,
          width: rect.width,
          height: rect.height,
          pointerEvents: state.state === MraidState.Hidden ? 'none' : 'auto',
        },
      ]}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={creativeHtml.length > 0 ? { html: creativeHtml } : { html: '<html></html>' }}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
        style={styles.webView}
      />
    </View>
  );
}

interface ComputeVisualRectOptions {
  mraidState: string;
  inlineRect: InlineRect | null;
  screenWidth: number;
  screenHeight: number;
  resizedWidth: number;
  resizedHeight: number;
}

function computeVisualRect(options: ComputeVisualRectOptions): InlineRect {
  if (options.mraidState === MraidState.Hidden) {
    return OFFSCREEN_RECT;
  }

  if (options.mraidState === MraidState.Expanded) {
    return { x: 0, y: 0, width: options.screenWidth, height: options.screenHeight };
  }

  if (options.mraidState === MraidState.Resized) {
    // Simplified placement: centered resize. A future iteration can honor
    // resizeProperties.offsetX/offsetY and customClosePosition precisely.
    const x = (options.screenWidth - options.resizedWidth) / 2;
    const y = (options.screenHeight - options.resizedHeight) / 2;

    return { x, y, width: options.resizedWidth, height: options.resizedHeight };
  }

  if (options.inlineRect !== null) {
    return options.inlineRect;
  }

  return OFFSCREEN_RECT;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  webView: {
    flex: 1,
  },
});
