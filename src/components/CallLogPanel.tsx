import { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { NEUTRAL } from '@/constants/colors';
import type { MraidLogEntry } from '@/mraid';
import { LogEntryRow } from './LogEntryRow';

interface CallLogPanelProps {
  log: MraidLogEntry[];
}

function renderItem({ item }: ListRenderItemInfo<MraidLogEntry>) {
  return <LogEntryRow entry={item} />;
}

function keyExtractor(item: MraidLogEntry): string {
  return item.id;
}

// The call log is the heart of the app per spec, so it needs to stay smooth
// even with hundreds of entries (MraidController caps at 500). FlatList
// only renders what's on screen, unlike a ScrollView + .map which would
// mount every row up front.
export function CallLogPanel({ log }: CallLogPanelProps) {
  const listRef = useRef<FlatList<MraidLogEntry>>(null);

  const handleContentSizeChange = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  if (log.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No MRAID calls yet. Load a creative to see activity.</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={log}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.list}
      onContentSizeChange={handleContentSizeChange}
      // Tuned for a log that can grow to ~500 short rows: keeps memory
      // bounded without over-rendering off-screen items.
      windowSize={7}
      maxToRenderPerBatch={20}
      initialNumToRender={20}
      removeClippedSubviews={true}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: NEUTRAL.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEUTRAL.background,
    padding: 24,
  },
  emptyText: {
    color: NEUTRAL.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
