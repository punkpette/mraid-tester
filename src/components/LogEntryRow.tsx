import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NEUTRAL, SEVERITY_COLORS } from '@/constants/colors';
import type { MraidLogEntry } from '@/mraid';

interface LogEntryRowProps {
  entry: MraidLogEntry;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => {
    return String(value).padStart(2, '0');
  };

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(
    date.getMilliseconds(),
  ).padStart(3, '0')}`;
}

// Wrapped in React.memo so scrolling through hundreds of log entries
// doesn't re-render rows that haven't changed. Comparison falls back to
// the default shallow prop check, which works here since `entry` objects
// are never mutated in place (MraidController always creates new ones).
export const LogEntryRow = memo(function LogEntryRow({ entry }: LogEntryRowProps) {
  const severityColor = SEVERITY_COLORS[entry.severity];

  return (
    <View style={styles.row}>
      <View style={[styles.severityBar, { backgroundColor: severityColor }]} />
      <View style={styles.content}>
        <View style={styles.headerLine}>
          <Text style={[styles.source, { color: severityColor }]}>{entry.source}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(entry.timestamp)}</Text>
        </View>
        <Text style={styles.message}>{entry.message}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomColor: NEUTRAL.border,
    borderBottomWidth: 1,
  },
  severityBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  source: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 11,
    color: NEUTRAL.textSecondary,
  },
  message: {
    fontSize: 13,
    color: NEUTRAL.textPrimary,
  },
});
