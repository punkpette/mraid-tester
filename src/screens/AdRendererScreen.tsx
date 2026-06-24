import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallLogPanel } from '@/components/CallLogPanel';
import { StatusPanel } from '@/components/StatusPanel';
import { NEUTRAL } from '@/constants/colors';
import { useAdSession } from '@/mraid/AdSessionContext';
import type { RootStackParamList } from '@/navigation/types';

const INLINE_AD_WIDTH = 300;
const INLINE_AD_HEIGHT = 250;

// The "home" screen: paste a creative's HTML (Mode B manual tag paste),
// see the inline slot it will render into, the always-visible Status
// Panel, and the Call Log Panel. The WebView itself lives in
// AdSessionOverlay at the app root — this screen only reserves and
// measures the slot it should visually occupy while MRAID state is
// "default".
export default function AdRendererScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, creativeHtml, setCreativeHtml, registerInlineSlot } = useAdSession();
  const [draftHtml, setDraftHtml] = useState(creativeHtml);
  const slotViewRef = useRef<View | null>(null);

  const handleLoadCreative = () => {
    setCreativeHtml(draftHtml);
  };

  const handleSlotLayout = () => {
    registerInlineSlot(slotViewRef.current);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusPanel state={state} />

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

      {/* This View is the inline ad slot. It renders nothing itself — its
          only job is to occupy space so AdSessionOverlay knows where to
          visually place the real WebView. */}
      <View style={styles.slotWrapper}>
        <View
          ref={(node) => {
            slotViewRef.current = node;
          }}
          onLayout={handleSlotLayout}
          style={styles.slot}
        />
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
    width: INLINE_AD_WIDTH,
    height: INLINE_AD_HEIGHT,
    backgroundColor: NEUTRAL.surface,
    borderColor: NEUTRAL.border,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
