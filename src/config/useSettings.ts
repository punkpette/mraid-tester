import { useCallback, useEffect, useState } from 'react';

import { loadSettings, saveSettings } from './settingsStorage';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { AppSettings } from '@/types/settings';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseSettingsResult {
  settings: AppSettings;
  isLoading: boolean;
  saveStatus: SaveStatus;
  // Merges a partial update into local state immediately (so the UI feels
  // instant), then persists the full object to AsyncStorage.
  updateSettings: (partial: Partial<AppSettings>) => void;
}

// Settings are small (a few strings + a handful of key-value pairs), so
// writing on every change is cheap — no debounce needed here. If this ever
// grows to something larger, debounce the persist call, not the local
// state update.
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    let isMounted = true;

    loadSettings().then((loaded) => {
      if (!isMounted) {
        return;
      }

      setSettings(loaded);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...partial };

      setSaveStatus('saving');
      saveSettings(next)
        .then(() => {
          setSaveStatus('saved');
        })
        .catch(() => {
          setSaveStatus('error');
        });

      return next;
    });
  }, []);

  return { settings, isLoading, saveStatus, updateSettings };
}
