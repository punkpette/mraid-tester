import { StyleSheet, Text, View } from 'react-native';

import { NEUTRAL, STATE_COLORS } from '@/constants/colors';
import type { MraidControllerState } from '@/mraid';

interface StatusPanelProps {
  state: MraidControllerState;
}

interface StatusItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

function StatusItem({ label, value, valueColor }: StatusItemProps) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function formatSize(size: { width: number; height: number }): string {
  return `${size.width}×${size.height}`;
}

// Always-visible panel summarizing the MRAID controller's current state.
// Kept as a thin presentational component: all the real state lives in
// MraidController, this just formats it for display.
export function StatusPanel({ state }: StatusPanelProps) {
  const stateColor = STATE_COLORS[state.state];

  return (
    <View style={styles.container}>
      <StatusItem label="Placement" value={state.placementType} />
      <StatusItem label="State" value={state.state} valueColor={stateColor} />
      <StatusItem label="Screen" value={formatSize(state.screenSize)} />
      <StatusItem label="Max Size" value={formatSize(state.maxSize)} />
      <StatusItem
        label="Viewable"
        value={state.isViewable ? 'Yes' : 'No'}
        valueColor={state.isViewable ? '#10B981' : '#EF4444'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: NEUTRAL.surface,
    borderBottomColor: NEUTRAL.border,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  item: {
    minWidth: 80,
  },
  label: {
    color: NEUTRAL.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: NEUTRAL.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});
