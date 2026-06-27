import { render } from '@testing-library/react-native';

import { StatusPanel } from './StatusPanel';
import { MraidPlacementType, MraidState } from '@/mraid';
import type { MraidControllerState } from '@/mraid';

function makeState(overrides: Partial<MraidControllerState> = {}): MraidControllerState {
  return {
    state: MraidState.Default,
    placementType: MraidPlacementType.Inline,
    isViewable: true,
    screenSize: { width: 390, height: 844 },
    maxSize: { width: 390, height: 844 },
    defaultPosition: { x: 0, y: 0, width: 300, height: 250 },
    currentPosition: { x: 0, y: 0, width: 300, height: 250 },
    resizeProperties: null,
    expandProperties: {
      width: 390,
      height: 844,
      useCustomClose: false,
      isModal: true,
    },
    orientationProperties: {
      allowOrientationChange: true,
      forceOrientation: 'none',
    },
    useCustomClose: false,
    log: [],
    ...overrides,
  };
}

describe('StatusPanel', () => {
  it('renders the placement type', async () => {
    const { getByText } = await render(
      <StatusPanel state={makeState({ placementType: MraidPlacementType.Interstitial })} />,
    );
    expect(getByText(MraidPlacementType.Interstitial)).toBeTruthy();
  });

  it('renders the MRAID state', async () => {
    const { getByText } = await render(
      <StatusPanel state={makeState({ state: MraidState.Expanded })} />,
    );
    expect(getByText(MraidState.Expanded)).toBeTruthy();
  });

  it('renders screenSize as WIDTH×HEIGHT', async () => {
    // Use a distinct screenSize so getAllByText doesn't collide with maxSize.
    const { getAllByText } = await render(
      <StatusPanel
        state={makeState({
          screenSize: { width: 390, height: 844 },
          maxSize: { width: 375, height: 812 },
        })}
      />,
    );
    expect(getAllByText('390×844')).toHaveLength(1);
  });

  it('renders maxSize', async () => {
    const { getByText } = await render(
      <StatusPanel
        state={makeState({
          screenSize: { width: 390, height: 844 },
          maxSize: { width: 375, height: 812 },
        })}
      />,
    );
    expect(getByText('375×812')).toBeTruthy();
  });

  it('shows "Yes" when isViewable is true', async () => {
    const { getByText } = await render(<StatusPanel state={makeState({ isViewable: true })} />);
    expect(getByText('Yes')).toBeTruthy();
  });

  it('shows "No" when isViewable is false', async () => {
    const { getByText } = await render(<StatusPanel state={makeState({ isViewable: false })} />);
    expect(getByText('No')).toBeTruthy();
  });
});
