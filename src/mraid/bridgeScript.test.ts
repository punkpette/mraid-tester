import { MRAID_VERSION, buildBridgeScript } from './bridgeScript';
import { MraidPlacementType, MraidState } from './constants';
import type { MraidControllerState } from './types';

function makeInitialState(): MraidControllerState {
  return {
    state: MraidState.Loading,
    placementType: MraidPlacementType.Inline,
    isViewable: false,
    currentPosition: { x: 0, y: 0, width: 300, height: 250 },
    defaultPosition: { x: 0, y: 0, width: 300, height: 250 },
    maxSize: { width: 400, height: 800 },
    screenSize: { width: 400, height: 800 },
    resizeProperties: null,
    expandProperties: { width: 400, height: 800, useCustomClose: false, isModal: true },
    orientationProperties: { allowOrientationChange: true, forceOrientation: 'none' },
    useCustomClose: false,
    log: [],
  };
}

describe('buildBridgeScript', () => {
  it('contains window.mraid', () => {
    const script = buildBridgeScript(makeInitialState());

    expect(script).toContain('window.mraid');
  });

  it('advertises the correct MRAID version', () => {
    const script = buildBridgeScript(makeInitialState());

    expect(script).toContain(MRAID_VERSION);
  });

  it('embeds the serialized initial state', () => {
    const state = makeInitialState();
    const script = buildBridgeScript(state);

    expect(script).toContain(JSON.stringify(state));
  });

  it('includes the __mraidBridge hook for native-to-WebView updates', () => {
    const script = buildBridgeScript(makeInitialState());

    expect(script).toContain('window.__mraidBridge');
  });
});
