import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AdEventType, GAMBannerAd, GAMInterstitialAd } from 'react-native-google-mobile-ads';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdSizeSelector } from '@/components/AdSizeSelector';
import { CallLogPanel } from '@/components/CallLogPanel';
import { StatusPanel } from '@/components/StatusPanel';
import { NEUTRAL } from '@/constants/colors';
import type { AdSizePreset } from '@/constants/adSizes';
import { useSettings } from '@/config/useSettings';
import { MraidPlacementType } from '@/mraid';
import { useAdSession } from '@/mraid/AdSessionContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  buildGamAdUnitPath,
  fetchTaglessCreative,
  getInterstitialRequestSize,
} from '@/services/gamTaglessRequest';
import type { KeyValuePair } from '@/types/settings';
import { decodeHtmlEntities } from '@/utils/htmlEntities';

type ActiveMode = 'modeA' | 'modeB';

// Converts key-value pairs to the plain object that GAMBannerAd's
// requestOptions.customTargeting expects. Entries with a blank key are skipped.
function keyValuesToRecord(keyValues: KeyValuePair[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const kv of keyValues) {
    if (kv.key.length > 0) {
      result[kv.key] = kv.value;
    }
  }

  return result;
}

// The "home" screen. Two modes:
//
// Mode B (Manual Paste) — paste a raw creative HTML string, load it into the
// MRAID mock WebView via AdSessionOverlay. The existing slot/interstitial
// layout and Show/Hide toggle are used unchanged.
//
// Mode A (GAM) — load a real creative from Google Ad Manager. The render path
// (from Settings) determines how the creative is surfaced:
//   • sdkRender — GAMBannerAd renders the creative inline in this screen.
//     The MRAID mock WebView is not involved, so there is no Show/Hide toggle
//     and no registerInlineSlot call.
//   • tagless  — fetchTaglessCreative() fetches the raw HTML and feeds it into
//     the same MRAID mock flow as Mode B.
//
// The WebView for the MRAID mock lives in AdSessionOverlay at the app root,
// never inside this screen — its visual position is driven by inlineRect.
export default function AdRendererScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    state,
    creativeHtml,
    setCreativeHtml,
    registerInlineSlot,
    setAdSize,
    setPlacementType,
    isAdVisible,
    toggleAdVisible,
    logActionResult,
  } = useAdSession();
  const { settings } = useSettings();

  const [activeMode, setActiveMode] = useState<ActiveMode>('modeB');
  const [draftHtml, setDraftHtml] = useState(creativeHtml);
  // sdkRender state: whether the GAMBannerAd has been requested.
  const [showGamBanner, setShowGamBanner] = useState(false);
  // Incrementing this key forces GAMBannerAd to remount on each "Request Ad"
  // press, which triggers a fresh ad request instead of reusing the cached one.
  const [gamRequestKey, setGamRequestKey] = useState(0);
  const [isTaglessLoading, setIsTaglessLoading] = useState(false);
  const slotViewRef = useRef<View | null>(null);
  const interstitialListenersRef = useRef<(() => void)[]>([]);

  const isInterstitial = state.placementType === MraidPlacementType.Interstitial;

  // Cleanup GAMInterstitialAd event listeners when mode or placement type changes,
  // or when the component unmounts, so stale listeners don't fire on a dead instance.
  useEffect(() => {
    return () => {
      for (const unsub of interstitialListenersRef.current) {
        unsub();
      }

      interstitialListenersRef.current = [];
    };
  }, [activeMode, state.placementType]);
  const isSdkRender = settings.renderPath === 'sdkRender';
  const fullAdUnitPath = buildGamAdUnitPath(settings.networkCode, settings.adUnitPath);

  // Switching to Mode A hides the MRAID mock WebView to avoid visual
  // overlap with GAMBannerAd when sdkRender is the active path.
  const handleModeChange = (newMode: ActiveMode) => {
    if (newMode === 'modeA' && isAdVisible) {
      toggleAdVisible();
    }

    for (const unsub of interstitialListenersRef.current) {
      unsub();
    }

    interstitialListenersRef.current = [];

    setActiveMode(newMode);
    setShowGamBanner(false);
  };

  const handleLoadCreative = () => {
    setCreativeHtml(decodeHtmlEntities(draftHtml));
  };

  const handleSlotLayout = () => {
    registerInlineSlot(slotViewRef.current);
  };

  const handleSelectPreset = (preset: AdSizePreset) => {
    if (preset.isInterstitial) {
      setPlacementType(MraidPlacementType.Interstitial);
      setAdSize({ width: screenWidth, height: screenHeight });

      return;
    }

    setPlacementType(MraidPlacementType.Inline);
    setAdSize({ width: preset.width, height: preset.height });
  };

  const handleApplyCustomSize = (width: number, height: number) => {
    setPlacementType(MraidPlacementType.Inline);
    setAdSize({ width, height });
  };

  const handleRequestAd = () => {
    if (isSdkRender) {
      if (isInterstitial) {
        // Imperative interstitial flow: cleanup prior listeners, create a fresh
        // instance, subscribe to lifecycle events, and call .load().
        // The ad presents itself fullscreen on LOADED; no inline component needed.
        for (const unsub of interstitialListenersRef.current) {
          unsub();
        }

        interstitialListenersRef.current = [];

        const ad = GAMInterstitialAd.createForAdRequest(fullAdUnitPath, {
          customTargeting: keyValuesToRecord(settings.keyValues),
        });

        interstitialListenersRef.current = [
          ad.addAdEventListener(AdEventType.LOADED, () => {
            ad.show();
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            logActionResult('sdkRender', true, 'Interstitial closed');
          }),
          ad.addAdEventListener(AdEventType.ERROR, (error) => {
            logActionResult('sdkRender', false, error.message);
          }),
        ];

        ad.load();

        return;
      }

      // Banner (inline) path: remount GAMBannerAd to trigger a fresh request.
      setShowGamBanner(true);
      setGamRequestKey((k) => k + 1);

      return;
    }

    // Tagless path. GAM interstitial units only match on IAB standard sizes
    // (320x480 portrait / 480x320 landscape), not the real device pixel size.
    const { width: requestWidth, height: requestHeight } = isInterstitial
      ? getInterstitialRequestSize(screenWidth, screenHeight)
      : { width: state.defaultPosition.width, height: state.defaultPosition.height };

    setIsTaglessLoading(true);
    fetchTaglessCreative({
      networkCode: settings.networkCode,
      adUnitPath: settings.adUnitPath,
      width: requestWidth,
      height: requestHeight,
      keyValues: settings.keyValues,
    }).then((result) => {
      setIsTaglessLoading(false);
      // Log both fills and no-fills so the operator can distinguish "no ad
      // matched" from a genuine network failure in the Call Log Panel.
      logActionResult('tagless', result.success, result.message);

      if (result.success && result.html !== undefined) {
        setCreativeHtml(decodeHtmlEntities(result.html));
      }
    });
  };

  // Header row for the ad preview area in MRAID-mock flows (Mode B and Mode A
  // tagless). Not rendered in Mode A sdkRender — the SDK owns the ad lifecycle
  // and there is nothing for the user to show/hide manually.
  const renderAdPreviewHeader = () => {
    const isDisabled = creativeHtml.length === 0;

    return (
      <View style={styles.slotHeader}>
        <Text style={styles.label}>Ad Preview</Text>
        <Pressable
          style={[styles.toggleButton, isDisabled ? styles.toggleButtonDisabled : null]}
          onPress={toggleAdVisible}
          disabled={isDisabled}
        >
          <Text style={styles.toggleButtonText}>{isAdVisible ? 'Hide Ad' : 'Show Ad'}</Text>
        </Pressable>
      </View>
    );
  };

  // Dashed inline slot: occupies the exact screen-space rect that
  // AdSessionOverlay uses to position the MRAID mock WebView.
  // Used by Mode B and Mode A tagless for non-interstitial placements.
  const renderInlineSlot = () => {
    return (
      <>
        {renderAdPreviewHeader()}
        <View style={styles.slotWrapper}>
          <View
            ref={(node) => {
              slotViewRef.current = node;
            }}
            onLayout={handleSlotLayout}
            style={[
              styles.slot,
              { width: state.defaultPosition.width, height: state.defaultPosition.height },
            ]}
          >
            {creativeHtml.length === 0 ? (
              <Text style={styles.slotPlaceholderText}>No creative loaded</Text>
            ) : null}
            {creativeHtml.length > 0 && !isAdVisible ? (
              <Text style={styles.slotPlaceholderText}>Ad hidden — tap &quot;Show Ad&quot;</Text>
            ) : null}
          </View>
        </View>
      </>
    );
  };

  // Shown instead of the inline slot when placementType is "interstitial" and
  // the MRAID mock WebView is in use. The overlay handles fullscreen
  // positioning; there is no inline slot to measure or render here.
  const renderInterstitialNotice = () => {
    return (
      <View style={styles.interstitialNotice}>
        {renderAdPreviewHeader()}
        <Text style={[styles.slotPlaceholderText, styles.interstitialNoticeBody]}>
          Interstitial — renders fullscreen. Tap &quot;Show Ad&quot; to preview.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusPanel state={state} />

      {/* Mode toggle — above all mode-specific content. */}
      <View style={styles.modeToggle}>
        <Pressable
          style={[styles.modeTab, activeMode === 'modeB' ? styles.modeTabActive : null]}
          onPress={() => {
            handleModeChange('modeB');
          }}
        >
          <Text
            style={[styles.modeTabText, activeMode === 'modeB' ? styles.modeTabTextActive : null]}
          >
            Mode B — Manual Paste
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, activeMode === 'modeA' ? styles.modeTabActive : null]}
          onPress={() => {
            handleModeChange('modeA');
          }}
        >
          <Text
            style={[styles.modeTabText, activeMode === 'modeA' ? styles.modeTabTextActive : null]}
          >
            Mode A — GAM
          </Text>
        </Pressable>
      </View>

      {activeMode === 'modeA' ? (
        <>
          {/* Summary of the active GAM configuration — read-only here, edit
              via Settings. */}
          <View style={styles.modeAPanel}>
            <View style={styles.modeASummary}>
              <Text style={styles.modeASummaryRow}>
                <Text style={styles.modeASummaryLabel}>Ad unit: </Text>
                {fullAdUnitPath.length > 1 ? fullAdUnitPath : '(not configured — open Settings)'}
              </Text>
              <Text style={styles.modeASummaryRow}>
                <Text style={styles.modeASummaryLabel}>Render path: </Text>
                {isSdkRender ? 'SDK render (black box)' : 'Tagless → MRAID mock'}
              </Text>
            </View>

            <View style={styles.toolbarButtons}>
              <Pressable
                style={styles.settingsButton}
                onPress={() => {
                  navigation.navigate('Settings');
                }}
              >
                <Text style={styles.settingsButtonText}>Settings</Text>
              </Pressable>
              <Pressable
                style={[styles.loadButton, isTaglessLoading ? styles.loadButtonDisabled : null]}
                onPress={handleRequestAd}
                disabled={isTaglessLoading}
              >
                <Text style={styles.loadButtonText}>
                  {isTaglessLoading ? 'Requesting…' : 'Request Ad'}
                </Text>
              </Pressable>
            </View>
          </View>

          <AdSizeSelector
            selectedWidth={state.defaultPosition.width}
            selectedHeight={state.defaultPosition.height}
            isInterstitialSelected={isInterstitial}
            onSelectPreset={handleSelectPreset}
            onApplyCustom={handleApplyCustomSize}
          />

          {isSdkRender ? (
            isInterstitial ? (
              // Interstitial via SDK: the ad presents itself fullscreen via the
              // imperative GAMInterstitialAd API — no inline component to render here.
              <View style={styles.interstitialNotice}>
                <Text style={[styles.slotPlaceholderText, styles.interstitialNoticeBody]}>
                  Interstitial (SDK) — tap &quot;Request Ad&quot; to load and show fullscreen.
                </Text>
              </View>
            ) : (
              // Banner path: GAMBannerAd is displayed inline in this screen.
              // No registerInlineSlot call — the MRAID mock WebView stays
              // off-screen and does not compete with the SDK-rendered creative.
              <View style={styles.sdkBannerArea}>
                <Text style={styles.label}>Ad Preview (SDK)</Text>
                {showGamBanner ? (
                  <GAMBannerAd
                    key={gamRequestKey}
                    unitId={fullAdUnitPath}
                    sizes={[`${state.defaultPosition.width}x${state.defaultPosition.height}`]}
                    requestOptions={{ customTargeting: keyValuesToRecord(settings.keyValues) }}
                  />
                ) : (
                  <Text style={styles.slotPlaceholderText}>
                    Tap &quot;Request Ad&quot; to load via GAM SDK.
                  </Text>
                )}
              </View>
            )
          ) : // Tagless: same MRAID mock slot/overlay flow as Mode B.
          isInterstitial ? (
            renderInterstitialNotice()
          ) : (
            renderInlineSlot()
          )}
        </>
      ) : (
        <>
          <View style={styles.toolbar}>
            <TextInput
              style={styles.htmlInput}
              placeholder="Paste creative HTML here…"
              placeholderTextColor={NEUTRAL.textSecondary}
              value={draftHtml}
              onChangeText={setDraftHtml}
              multiline
              numberOfLines={3}
            />
            <View style={styles.toolbarButtons}>
              <Pressable style={styles.loadButton} onPress={handleLoadCreative}>
                <Text style={styles.loadButtonText}>Load Creative</Text>
              </Pressable>
              <Pressable
                style={styles.settingsButton}
                onPress={() => {
                  navigation.navigate('Settings');
                }}
              >
                <Text style={styles.settingsButtonText}>Settings</Text>
              </Pressable>
            </View>
          </View>

          <AdSizeSelector
            selectedWidth={state.defaultPosition.width}
            selectedHeight={state.defaultPosition.height}
            isInterstitialSelected={isInterstitial}
            onSelectPreset={handleSelectPreset}
            onApplyCustom={handleApplyCustomSize}
          />

          {isInterstitial ? renderInterstitialNotice() : renderInlineSlot()}
        </>
      )}

      <CallLogPanel log={state.log} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEUTRAL.background,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeTabActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A5F',
  },
  modeTabText: {
    color: NEUTRAL.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeTabTextActive: {
    color: '#60A5FA',
  },
  modeAPanel: {
    padding: 12,
    gap: 8,
  },
  modeASummary: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  modeASummaryRow: {
    color: NEUTRAL.textPrimary,
    fontSize: 12,
  },
  modeASummaryLabel: {
    color: NEUTRAL.textSecondary,
    fontWeight: '600',
  },
  sdkBannerArea: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  toolbar: {
    padding: 12,
    gap: 8,
  },
  htmlInput: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: NEUTRAL.textPrimary,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  toolbarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  loadButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadButtonDisabled: {
    opacity: 0.5,
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  settingsButton: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  settingsButtonText: {
    color: NEUTRAL.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  label: {
    color: NEUTRAL.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  slotWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  slot: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPlaceholderText: {
    color: NEUTRAL.textSecondary,
    fontSize: 12,
  },
  interstitialNotice: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  interstitialNoticeBody: {
    paddingHorizontal: 12,
  },
});
