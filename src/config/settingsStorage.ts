import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS } from '@/types/settings';
import type { AppSettings } from '@/types/settings';

const STORAGE_KEY = '@mraid-tester/settings';

// Loads persisted settings, falling back to defaults if nothing was saved
// yet or if the stored value is corrupted (e.g. from an older app version
// with a different shape).
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
