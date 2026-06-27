import { renderHook, act, waitFor } from '@testing-library/react-native';
import { loadSettings, saveSettings } from './settingsStorage';
import { useSettings } from './useSettings';
import { DEFAULT_SETTINGS } from '@/types/settings';

jest.mock('./settingsStorage', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
}));

const mockLoadSettings = loadSettings as jest.Mock;
const mockSaveSettings = saveSettings as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadSettings.mockResolvedValue(DEFAULT_SETTINGS);
  mockSaveSettings.mockResolvedValue(undefined);
});

describe('useSettings', () => {
  it('starts with isLoading true and transitions to false after load completes', async () => {
    // Control when loadSettings resolves so we can observe isLoading=true first.
    let resolveLoad!: (v: typeof DEFAULT_SETTINGS) => void;
    mockLoadSettings.mockImplementation(
      () =>
        new Promise<typeof DEFAULT_SETTINGS>((r) => {
          resolveLoad = r;
        }),
    );

    const { result } = await renderHook(() => useSettings());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveLoad(DEFAULT_SETTINGS);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('exposes the loaded settings when AsyncStorage had a saved value', async () => {
    const saved = { ...DEFAULT_SETTINGS, networkCode: '54321' };
    mockLoadSettings.mockResolvedValue(saved);

    const { result } = await renderHook(() => useSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.networkCode).toBe('54321');
  });

  it('updateSettings merges the partial update into state immediately', async () => {
    const { result } = await renderHook(() => useSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updateSettings({ networkCode: '99999' });
    });

    expect(result.current.settings.networkCode).toBe('99999');
    // Other fields remain at their loaded default values.
    expect(result.current.settings.renderPath).toBe(DEFAULT_SETTINGS.renderPath);
  });

  it('saveStatus transitions to "saved" after a successful persist', async () => {
    const { result } = await renderHook(() => useSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updateSettings({ networkCode: '11111' });
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });
  });

  it('saveStatus transitions to "error" when the persist call rejects', async () => {
    mockSaveSettings.mockRejectedValue(new Error('Disk full'));

    const { result } = await renderHook(() => useSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updateSettings({ networkCode: 'fail' });
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
    });
  });
});
