import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings, saveSettings } from './settingsStorage';
import { DEFAULT_SETTINGS } from '@/types/settings';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadSettings', () => {
  it('returns DEFAULT_SETTINGS when AsyncStorage has no stored value', async () => {
    mockGetItem.mockResolvedValue(null);

    const result = await loadSettings();

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('returns DEFAULT_SETTINGS when the stored value is corrupted JSON', async () => {
    mockGetItem.mockResolvedValue('{not: valid json');

    const result = await loadSettings();

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial stored object with defaults (handles missing fields from older versions)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ networkCode: '12345' }));

    const result = await loadSettings();

    // Provided field is used, everything else falls back to defaults.
    expect(result.networkCode).toBe('12345');
    expect(result.adUnitPath).toBe(DEFAULT_SETTINGS.adUnitPath);
    expect(result.renderPath).toBe(DEFAULT_SETTINGS.renderPath);
    expect(result.keyValues).toEqual(DEFAULT_SETTINGS.keyValues);
  });

  it('returns the full stored settings when the stored object is complete', async () => {
    const stored = {
      networkCode: '99',
      adUnitPath: '/test/unit',
      keyValues: [{ id: 'kv1', key: 'env', value: 'prod' }],
      renderPath: 'sdkRender' as const,
    };
    mockGetItem.mockResolvedValue(JSON.stringify(stored));

    const result = await loadSettings();

    expect(result).toEqual(stored);
  });
});

describe('saveSettings', () => {
  it('calls AsyncStorage.setItem with the correct key and serialized JSON', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      networkCode: '77777',
    };

    await saveSettings(settings);

    expect(mockSetItem).toHaveBeenCalledWith('@mraid-tester/settings', JSON.stringify(settings));
  });
});
