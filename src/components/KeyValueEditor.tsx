import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { NEUTRAL } from '@/constants/colors';
import type { KeyValuePair } from '@/types/settings';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}

let idCounter = 0;

function generateId(): string {
  idCounter += 1;

  return `kv_${Date.now()}_${idCounter}`;
}

export function KeyValueEditor({ pairs, onChange }: KeyValueEditorProps) {
  const handleAddPair = () => {
    onChange([...pairs, { id: generateId(), key: '', value: '' }]);
  };

  const handleRemovePair = (id: string) => {
    onChange(pairs.filter((pair) => pair.id !== id));
  };

  const handleUpdatePair = (id: string, field: 'key' | 'value', text: string) => {
    onChange(pairs.map((pair) => (pair.id === id ? { ...pair, [field]: text } : pair)));
  };

  return (
    <View>
      {pairs.map((pair) => {
        return (
          <View key={pair.id} style={styles.row}>
            <TextInput
              style={[styles.input, styles.keyInput]}
              placeholder="key"
              placeholderTextColor={NEUTRAL.textSecondary}
              value={pair.key}
              onChangeText={(text) => {
                handleUpdatePair(pair.id, 'key', text);
              }}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.valueInput]}
              placeholder="value"
              placeholderTextColor={NEUTRAL.textSecondary}
              value={pair.value}
              onChangeText={(text) => {
                handleUpdatePair(pair.id, 'value', text);
              }}
              autoCapitalize="none"
            />
            <Pressable
              style={styles.removeButton}
              onPress={() => {
                handleRemovePair(pair.id);
              }}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </Pressable>
          </View>
        );
      })}
      <Pressable style={styles.addButton} onPress={handleAddPair}>
        <Text style={styles.addButtonText}>+ Add key-value</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: NEUTRAL.textPrimary,
    fontSize: 14,
  },
  keyInput: {
    flex: 1,
  },
  valueInput: {
    flex: 1,
  },
  removeButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 16,
  },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});
