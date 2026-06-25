import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { NEUTRAL } from '@/constants/colors';
import { IAB_AD_SIZE_PRESETS } from '@/constants/adSizes';
import type { AdSizePreset } from '@/constants/adSizes';

interface AdSizeSelectorProps {
  selectedWidth: number;
  selectedHeight: number;
  onSelectPreset: (preset: AdSizePreset) => void;
  onApplyCustom: (width: number, height: number) => void;
}

function isPresetSelected(preset: AdSizePreset, width: number, height: number): boolean {
  if (preset.isInterstitial) {
    // Interstitial sizes itself to the full screen, so it never matches a
    // fixed width/height — it's flagged separately via placementType
    // upstream. Here we just never highlight it as "selected" by size.
    return false;
  }

  return preset.width === width && preset.height === height;
}

export function AdSizeSelector({
  selectedWidth,
  selectedHeight,
  onSelectPreset,
  onApplyCustom,
}: AdSizeSelectorProps) {
  const [customWidth, setCustomWidth] = useState(String(selectedWidth));
  const [customHeight, setCustomHeight] = useState(String(selectedHeight));

  const handleApplyCustom = () => {
    const width = parseInt(customWidth, 10);
    const height = parseInt(customHeight, 10);

    if (Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0) {
      return;
    }

    onApplyCustom(width, height);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ad Size</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {IAB_AD_SIZE_PRESETS.map((preset) => {
          const isSelected = isPresetSelected(preset, selectedWidth, selectedHeight);

          return (
            <Pressable
              key={preset.id}
              style={[styles.chip, isSelected ? styles.chipSelected : null]}
              onPress={() => {
                onSelectPreset(preset);
              }}
            >
              <Text style={[styles.chipLabel, isSelected ? styles.chipLabelSelected : null]}>
                {preset.label}
              </Text>
              {!preset.isInterstitial ? (
                <Text style={styles.chipDimensions}>
                  {preset.width}×{preset.height}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.customRow}>
        <TextInput
          style={[styles.input, styles.customInput]}
          placeholder="Width"
          placeholderTextColor={NEUTRAL.textSecondary}
          value={customWidth}
          onChangeText={setCustomWidth}
          keyboardType="number-pad"
        />
        <Text style={styles.customSeparator}>×</Text>
        <TextInput
          style={[styles.input, styles.customInput]}
          placeholder="Height"
          placeholderTextColor={NEUTRAL.textSecondary}
          value={customHeight}
          onChangeText={setCustomHeight}
          keyboardType="number-pad"
        />
        <Pressable style={styles.applyButton} onPress={handleApplyCustom}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  label: {
    color: NEUTRAL.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  row: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  chipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A5F',
  },
  chipLabel: {
    color: NEUTRAL.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: '#60A5FA',
  },
  chipDimensions: {
    color: NEUTRAL.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: NEUTRAL.textPrimary,
    fontSize: 13,
  },
  customInput: {
    flex: 1,
  },
  customSeparator: {
    color: NEUTRAL.textSecondary,
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
