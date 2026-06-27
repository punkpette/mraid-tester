import { act, fireEvent, render } from '@testing-library/react-native';

import { AdSizeSelector } from './AdSizeSelector';
import { IAB_AD_SIZE_PRESETS } from '@/constants/adSizes';
import type { AdSizePreset } from '@/constants/adSizes';

const INLINE_PRESET = IAB_AD_SIZE_PRESETS.find((p) => !p.isInterstitial)!;
const INTERSTITIAL_PRESET = IAB_AD_SIZE_PRESETS.find((p) => p.isInterstitial)!;

async function renderSelector(
  overrides: {
    selectedWidth?: number;
    selectedHeight?: number;
    isInterstitialSelected?: boolean;
    onSelectPreset?: (preset: AdSizePreset) => void;
    onApplyCustom?: (w: number, h: number) => void;
  } = {},
) {
  const onSelectPreset = overrides.onSelectPreset ?? jest.fn();
  const onApplyCustom = overrides.onApplyCustom ?? jest.fn();

  const props = {
    selectedWidth: INLINE_PRESET.width,
    selectedHeight: INLINE_PRESET.height,
    isInterstitialSelected: false,
    onSelectPreset,
    onApplyCustom,
    ...overrides,
  };

  const queries = await render(<AdSizeSelector {...props} />);

  return { ...queries, onSelectPreset, onApplyCustom };
}

describe('AdSizeSelector', () => {
  describe('preset chips', () => {
    it('renders a chip for every IAB preset', async () => {
      const { getByText } = await renderSelector();

      for (const preset of IAB_AD_SIZE_PRESETS) {
        expect(getByText(preset.label)).toBeTruthy();
      }
    });

    it('calls onSelectPreset with the correct preset when a chip is pressed', async () => {
      const onSelectPreset = jest.fn();
      const { getByText } = await renderSelector({ onSelectPreset });

      fireEvent.press(getByText(INLINE_PRESET.label));

      expect(onSelectPreset).toHaveBeenCalledWith(INLINE_PRESET);
    });

    it('renders the interstitial chip when isInterstitialSelected is true', async () => {
      const { getByText } = await renderSelector({ isInterstitialSelected: true });
      expect(getByText(INTERSTITIAL_PRESET.label)).toBeTruthy();
    });

    it('calls onSelectPreset with the interstitial preset when that chip is pressed', async () => {
      const onSelectPreset = jest.fn();
      const { getByText } = await renderSelector({
        isInterstitialSelected: true,
        onSelectPreset,
      });

      fireEvent.press(getByText(INTERSTITIAL_PRESET.label));

      expect(onSelectPreset).toHaveBeenCalledWith(INTERSTITIAL_PRESET);
    });
  });

  describe('custom size row', () => {
    it('renders Width, Height inputs and Apply button when not interstitial', async () => {
      const { getByPlaceholderText, getByText } = await renderSelector({
        isInterstitialSelected: false,
      });

      expect(getByPlaceholderText('Width')).toBeTruthy();
      expect(getByPlaceholderText('Height')).toBeTruthy();
      expect(getByText('Apply')).toBeTruthy();
    });

    it('hides the custom row when isInterstitialSelected is true', async () => {
      const { queryByPlaceholderText, queryByText } = await renderSelector({
        isInterstitialSelected: true,
      });

      expect(queryByPlaceholderText('Width')).toBeNull();
      expect(queryByPlaceholderText('Height')).toBeNull();
      expect(queryByText('Apply')).toBeNull();
    });

    it('does not call onApplyCustom when input values match the selected size (button disabled)', async () => {
      const onApplyCustom = jest.fn();
      // selectedWidth=300, selectedHeight=250 → inputs default to "300"/"250"
      // → isApplyDisabled is true → Pressable disabled prop is true.
      const { getByText } = await renderSelector({
        selectedWidth: 300,
        selectedHeight: 250,
        onApplyCustom,
      });

      fireEvent.press(getByText('Apply'));

      expect(onApplyCustom).not.toHaveBeenCalled();
    });

    it('calls onApplyCustom with updated values after the user changes the width', async () => {
      const onApplyCustom = jest.fn();
      const { getByPlaceholderText, getByText } = await renderSelector({
        selectedWidth: 300,
        selectedHeight: 250,
        onApplyCustom,
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Width'), '400');
      });
      fireEvent.press(getByText('Apply'));

      expect(onApplyCustom).toHaveBeenCalledWith(400, 250);
    });

    it('calls onApplyCustom with updated values after the user changes the height', async () => {
      const onApplyCustom = jest.fn();
      const { getByPlaceholderText, getByText } = await renderSelector({
        selectedWidth: 300,
        selectedHeight: 250,
        onApplyCustom,
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Height'), '600');
      });
      fireEvent.press(getByText('Apply'));

      expect(onApplyCustom).toHaveBeenCalledWith(300, 600);
    });

    it('does not call onApplyCustom when the width input is non-numeric', async () => {
      const onApplyCustom = jest.fn();
      const { getByPlaceholderText, getByText } = await renderSelector({
        selectedWidth: 300,
        selectedHeight: 250,
        onApplyCustom,
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Width'), 'abc');
      });
      fireEvent.press(getByText('Apply'));

      expect(onApplyCustom).not.toHaveBeenCalled();
    });

    it('does not call onApplyCustom when width is zero', async () => {
      const onApplyCustom = jest.fn();
      const { getByPlaceholderText, getByText } = await renderSelector({
        selectedWidth: 300,
        selectedHeight: 250,
        onApplyCustom,
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Width'), '0');
      });
      fireEvent.press(getByText('Apply'));

      expect(onApplyCustom).not.toHaveBeenCalled();
    });

    it('does not call onApplyCustom when width is negative', async () => {
      const onApplyCustom = jest.fn();
      const { getByPlaceholderText, getByText } = await renderSelector({
        selectedWidth: 300,
        selectedHeight: 250,
        onApplyCustom,
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Width'), '-50');
      });
      fireEvent.press(getByText('Apply'));

      expect(onApplyCustom).not.toHaveBeenCalled();
    });
  });
});
