import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { GAMBannerAd } from 'react-native-google-mobile-ads';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdSizeSelector } from '@/components/AdSizeSelector';
import { CallLogPanel } from '@/components/CallLogPanel';
import { StatusPanel } from '@/components/StatusPanel';
import { useSettings } from '@/config/useSettings';
import type { AdSizePreset } from '@/constants/adSizes';
import { NEUTRAL } from '@/constants/colors';
import { MraidPlacementType } from '@/mraid';
import { useAdSession } from '@/mraid/AdSessionContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  buildGamAdUnitPath,
  fetchTaglessCreative,
} from '@/services/gamTaglessRequest';

type ActiveMode = 'modeA' | 'modeB';

// The "home" screen. Supports two modes toggled at the top:
//   Mode A (GAM): requests a real ad from Google Ad Manager via either the
//     official SDK render path or a tagless HTTP request.
//   Mode B (Manual): paste HTML directly — the original creative tester flow.
// In both modes the MRAID controller, Status Panel, Ad Size Selector, and
// Call Log Panel remain active.
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
    logActionResult,
  } = useAdSession();
  const { settings } = useSettings();

  const [activeMode, setActiveMode] = useState<ActiveMode>('modeB');
  const [draftHtml, setDraftHtml] = useState(creativeHtml);
  const [sdkBannerActive, setSdkBannerActive] = useState(false);
  const [isRequestingAd, setIsRequestingAd] = useState(false);

  const slotViewRef = useRef<View | null>(null);

  const handleLoadCreative = () => {
    setCreativeHtml(draftHtml);
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

  const handleRequestAd = async (): Promise<void> => {
    if (settings.renderPath === 'sdkRender') {
      setSdkBannerActive(true);

      return;
    }

    setIsRequestingAd(true);

    const result = await fetchTaglessCreative({
      networkCode: settings.networkCode,
      adUnitPath: settings.adUnitPath,
      width: state.defaultPosition.width,
      height: state.defaultPosition.height,
      keyValues: settings.keyValues,
    });

    setIsRequestingAd(false);

    if (result.success && result.html !== undefined) {
      setCreativeHtml(result.html);
    }

    logActionResult('tagless', result.success, result.message);
  };

  const fullAdUnitPath = buildGamAdUnitPath(settings.networkCode, settings.adUnitPath);
  const adSizeString = `${state.defaultPosition.width}x${state.defaultPosition.height}`;

  const renderPathLabel = settings.renderPath === 'sdkRender' ? 'SDK Render' : 'Tagless';

  // Only show the GAM SDK banner when Mode A is active, sdkRender is selected,
  // and the user has pressed "Request Ad". In that case we skip registerInlineSlot
  // so the MRAID WebView overlay stays offscreen and does not compete visually.
  const showSdkBanner =
    activeMode === 'modeA' && settings.renderPath === 'sdkRender' && sdkBannerActive;

  return (
    <SafeAreaView style={styles.container}>
      <StatusPanel state={state} />

      <View style={styles.modeToggle}>
        <Pressable
          style={[styles.modeTab, activeMode === 'modeA' && styles.modeTabActive]}
          onPress={() => {
            setActiveMode('modeA');
          }}
        >
          <Text style={[styles.modeTabText, activeMode === 'modeA' && styles.modeTabTextActive]}>
            Mode A (GAM)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, activeMode === 'modeB' && styles.modeTabActive]}
          onPress={() => {
            setActiveMode('modeB');
          }}
        >
          <Text style={[styles.modeTabText, activeMode === 'modeB' && styles.modeTabTextActive]}>
            Mode B (Manual)
          </Text>
        </Pressable>
      </View>

      {activeMode === 'modeA' && (
        <View style={styles.modeAPanel}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {settings.networkCode.length > 0 ? settings.networkCode : '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ad Unit</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {settings.adUnitPath.length > 0 ? settings.adUnitPath : '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Render Path</Text>
              <Text style={styles.summaryValue}>{renderPathLabel}</Text>
            </View>
          </View>
          <View style={styles.modeAButtons}>
            <Pressable
              style={styles.settingsButton}
              onPress={() => {
                navigation.navigate('Settings');
              }}
            >
              <Text style={styles.settingsButtonText}>Settings</Text>
            </Pressable>
            <Pressable
              style={[styles.requestButton, isRequestingAd && styles.requestButtonDisabled]}
              disabled={isRequestingAd}
              onPress={() => {
                void handleRequestAd();
              }}
            >
              <Text style={styles.requestButtonText}>
                {isRequestingAd ? 'Requesting…' : 'Request Ad'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {activeMode === 'modeB' && (
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
      )}

      <AdSizeSelector
        selectedWidth={state.defaultPosition.width}
        selectedHeight={state.defaultPosition.height}
        onSelectPreset={handleSelectPreset}
        onApplyCustom={handleApplyCustomSize}
      />

      {/* Slot area. When sdkRender is active we render the GAMBannerAd directly and
          skip registerInlineSlot so the MRAID WebView overlay stays offscreen. In all
          other cases we render the placeholder View that the overlay measures. */}
      <View style={styles.slotWrapper}>
        {showSdkBanner ? (
          <GAMBannerAd
            unitId={fullAdUnitPath}
            sizes={[adSizeString]}
            requestOptions={{
              customTargeting: Object.fromEntries(
                settings.keyValues
                  .filter((kv) => kv.key.length > 0)
                  .map((kv): [string, string] => [kv.key, kv.value]),
              ),
            }}
          />
        ) : (
          <View
            ref={(node) => {
              slotViewRef.current = node;
            }}
            onLayout={handleSlotLayout}
            style={[
              styles.slot,
              { width: state.defaultPosition.width, height: state.defaultPosition.height },
            ]}
          />
        )}
      </View>

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
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: NEUTRAL.surface,
  },
  modeTabActive: {
    backgroundColor: '#3B82F6',
  },
  modeTabText: {
    color: NEUTRAL.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  modeAPanel: {
    padding: 12,
    gap: 8,
  },
  summaryCard: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: NEUTRAL.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    color: NEUTRAL.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    marginLeft: 8,
    textAlign: 'right',
  },
  modeAButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  slotWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  slot: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
