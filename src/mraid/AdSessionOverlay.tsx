import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { MraidPlacementType, MraidState } from '@/mraid';
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
//
// zIndex and elevation are set explicitly on the container so the overlay
// renders above the React Navigation native stack on Android (where
// elevation from the navigation header otherwise draws on top of sibling
// Views without an explicit elevation, regardless of React tree order).
export function AdSessionOverlay() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    webViewRef,
    injectedJavaScriptBeforeContentLoaded,
    state,
    onMessage,
    onLoadEnd,
    creativeHtml,
    inlineRect,
    isAdVisible,
    toggleAdVisible,
    logActionResult,
  } = useAdSession();

  // Android limitation: isTopFrame and navigationType are not available in
  // onShouldStartLoadWithRequest on Android (navigationType is always 'other',
  // isTopFrame is undefined) — a documented react-native-webview constraint.
  // Intercepting navigations without those signals would break iframes inside
  // real ad creatives (they'd open in Safari instead of loading inside the
  // WebView). We allow all navigations on Android and rely on onOpenWindow
  // (target="_blank") and mraid.open() as the reliable click-through paths there.
  //
  // On iOS, we only intercept when both conditions are true:
  //   • isTopFrame === true  — the main document is navigating, not an iframe
  //   • navigationType === 'click'  — originated from a real user tap, not a
  //     redirect, reload, form submit, or programmatic navigation
  const handleShouldStartLoadWithRequest = (request: {
    url: string;
    isTopFrame?: boolean;
    navigationType: string;
  }): boolean => {
    if (Platform.OS !== 'ios') {
      return true;
    }

    if (request.isTopFrame === true && request.navigationType === 'click') {
      void openExternalUrl(request.url, logActionResult);
      return false;
    }

    return true;
  };

  // window.open() / target="_blank" triggers onOpenWindow instead of
  // onShouldStartLoadWithRequest. This path is reliable on both platforms
  // and is the primary click-through interception mechanism on Android.
  const handleOpenWindow = (event: { nativeEvent: { targetUrl: string } }): void => {
    void openExternalUrl(event.nativeEvent.targetUrl, logActionResult);
  };

  // The creative itself forcing expanded/resized always takes priority over
  // the user's show/hide toggle — you can't "hide" an ad that just expanded.
  const isForcedVisible = state.state === MraidState.Expanded || state.state === MraidState.Resized;
  const shouldShowAd = creativeHtml.length > 0 && (isAdVisible || isForcedVisible);

  const rect = shouldShowAd
    ? computeVisualRect({
        mraidState: state.state,
        placementType: state.placementType,
        inlineRect,
        screenWidth,
        screenHeight,
        resizedWidth: state.resizeProperties?.width ?? state.defaultPosition.width,
        resizedHeight: state.resizeProperties?.height ?? state.defaultPosition.height,
      })
    : OFFSCREEN_RECT;

  if (__DEV__) {
    console.log('[AdSessionOverlay]', {
      shouldShowAd,
      placementType: state.placementType,
      mraidState: state.state,
      creativeHtmlLength: creativeHtml.length,
      isAdVisible,
      isForcedVisible,
      rect,
      screenWidth,
      screenHeight,
    });
  }

  const showCloseButton = shouldShowAd && state.placementType === MraidPlacementType.Interstitial;

  return (
    <View
      style={[
        styles.container,
        {
          top: rect.y,
          left: rect.x,
          width: rect.width,
          height: rect.height,
          pointerEvents: shouldShowAd && state.state !== MraidState.Hidden ? 'auto' : 'none',
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
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onOpenWindow={handleOpenWindow}
        style={styles.webView}
      />
      {showCloseButton ? (
        <Pressable
          style={[styles.closeButton, { top: insets.top + 12, right: 12 }]}
          onPress={toggleAdVisible}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Opens a URL in the system browser. Logs the outcome via logActionResult so
// the operator can see click-through activity in the Call Log Panel.
// Extracted from the component to avoid recreating it on every render.
async function openExternalUrl(
  url: string,
  logActionResult: (method: string, success: boolean, message: string) => void,
): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    logActionResult('navigation', false, `Cannot open URL in system browser: "${url}".`);
    return;
  }

  await Linking.openURL(url);
  logActionResult('navigation', true, `Opened in system browser: "${url}".`);
}

interface ComputeVisualRectOptions {
  mraidState: string;
  placementType: string;
  inlineRect: InlineRect | null;
  screenWidth: number;
  screenHeight: number;
  resizedWidth: number;
  resizedHeight: number;
}

export function computeVisualRect(options: ComputeVisualRectOptions): InlineRect {
  if (options.mraidState === MraidState.Hidden) {
    return OFFSCREEN_RECT;
  }

  // Per spec, interstitial placements are already fullscreen — there's no
  // inline slot to measure, and trying to fit a screen-sized View inside
  // the normal scrolling layout (like inline ads do) just pushes
  // everything else off-screen. Go fullscreen directly, regardless of
  // mraidState, the moment an interstitial creative is shown.
  if (options.placementType === MraidPlacementType.Interstitial) {
    return { x: 0, y: 0, width: options.screenWidth, height: options.screenHeight };
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
    // Explicit z-ordering ensures the overlay paints above the React
    // Navigation native stack on both platforms. On Android, elevation
    // from the navigation header (Material default: ~4dp) can occlude
    // sibling Views that have no elevation even if they appear later in
    // the React tree. On iOS, zIndex alone is sufficient.
    zIndex: 999,
    elevation: 999,
  },
  webView: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    // pointerEvents is auto by default; no need to override since the
    // parent container is also auto when shouldShowAd is true.
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
