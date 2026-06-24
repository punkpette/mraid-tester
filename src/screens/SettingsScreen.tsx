import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyValueEditor } from '@/components/KeyValueEditor';
import { NEUTRAL } from '@/constants/colors';
import { useSettings } from '@/config/useSettings';
import type { RenderPath } from '@/types/settings';

interface RenderPathOptionProps {
  label: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

function RenderPathOption({ label, description, isSelected, onPress }: RenderPathOptionProps) {
  return (
    <Pressable
      style={[styles.renderPathOption, isSelected ? styles.renderPathOptionSelected : null]}
      onPress={onPress}
    >
      <Text style={styles.renderPathLabel}>{label}</Text>
      <Text style={styles.renderPathDescription}>{description}</Text>
    </Pressable>
  );
}

function renderSaveStatusLabel(status: string): string {
  if (status === 'saving') {
    return 'Saving…';
  }

  if (status === 'saved') {
    return 'Saved';
  }

  if (status === 'error') {
    return 'Failed to save';
  }

  return '';
}

// Settings screen for Mode A (GAM traffic): network code, ad unit path, and
// custom key-values, all persisted in AsyncStorage so anyone who clones
// the repo can configure it without rebuilding (per spec).
export default function SettingsScreen() {
  const { settings, isLoading, saveStatus, updateSettings } = useSettings();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>Loading settings…</Text>
      </SafeAreaView>
    );
  }

  const handleSelectRenderPath = (renderPath: RenderPath) => {
    updateSettings({ renderPath });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.saveStatus}>{renderSaveStatusLabel(saveStatus)}</Text>
        </View>

        <Text style={styles.label}>Network Code</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123456789"
          placeholderTextColor={NEUTRAL.textSecondary}
          value={settings.networkCode}
          onChangeText={(text) => {
            updateSettings({ networkCode: text });
          }}
          autoCapitalize="none"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Ad Unit Path</Text>
        <TextInput
          style={styles.input}
          placeholder="/123456789/test-ad-unit"
          placeholderTextColor={NEUTRAL.textSecondary}
          value={settings.adUnitPath}
          onChangeText={(text) => {
            updateSettings({ adUnitPath: text });
          }}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Render Path</Text>
        <View style={styles.renderPathRow}>
          <RenderPathOption
            label="SDK Render"
            description="Official Google Mobile Ads SDK. No custom logging."
            isSelected={settings.renderPath === 'sdkRender'}
            onPress={() => {
              handleSelectRenderPath('sdkRender');
            }}
          />
          <RenderPathOption
            label="Tagless"
            description="Raw creative into our own MRAID bridge. Full logging."
            isSelected={settings.renderPath === 'tagless'}
            onPress={() => {
              handleSelectRenderPath('tagless');
            }}
          />
        </View>

        <Text style={styles.label}>Custom Key-Values</Text>
        <KeyValueEditor
          pairs={settings.keyValues}
          onChange={(keyValues) => {
            updateSettings({ keyValues });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEUTRAL.background,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: NEUTRAL.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  saveStatus: {
    color: NEUTRAL.textSecondary,
    fontSize: 12,
  },
  label: {
    color: NEUTRAL.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: NEUTRAL.textPrimary,
    fontSize: 15,
  },
  renderPathRow: {
    flexDirection: 'row',
    gap: 10,
  },
  renderPathOption: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  renderPathOptionSelected: {
    borderColor: '#3B82F6',
  },
  renderPathLabel: {
    color: NEUTRAL.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  renderPathDescription: {
    color: NEUTRAL.textSecondary,
    fontSize: 11,
  },
});
