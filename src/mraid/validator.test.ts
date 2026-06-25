import { MraidPlacementType, MraidState } from './constants';
import type { MraidControllerState } from './types';
import { type ValidationContext, validateCall } from './validator';

function makeState(overrides?: Partial<MraidControllerState>): MraidControllerState {
  const base: MraidControllerState = {
    state: MraidState.Default,
    placementType: MraidPlacementType.Inline,
    isViewable: true,
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

  return overrides ? { ...base, ...overrides } : base;
}

function makeContext(overrides?: Partial<ValidationContext>): ValidationContext {
  const base: ValidationContext = {
    hasFiredReady: true,
    calledMethods: new Set<string>(),
  };

  return overrides ? { ...base, ...overrides } : base;
}

describe('validateCall', () => {
  it('returns an error for an unknown method', () => {
    const entries = validateCall('flyToTheMoon', [], makeState(), makeContext());

    expect(entries).toHaveLength(1);
    expect(entries[0]!.severity).toBe('error');
  });

  it('returns an error for a method called before ready', () => {
    const entries = validateCall('expand', [], makeState(), makeContext({ hasFiredReady: false }));

    expect(entries.some((e) => e.severity === 'error')).toBe(true);
  });

  it('does not error for getVersion called before ready', () => {
    const entries = validateCall(
      'getVersion',
      [],
      makeState(),
      makeContext({ hasFiredReady: false }),
    );

    expect(entries.every((e) => e.severity !== 'error')).toBe(true);
  });

  it('does not error for addEventListener with a valid event called before ready', () => {
    const entries = validateCall(
      'addEventListener',
      ['ready'],
      makeState(),
      makeContext({ hasFiredReady: false }),
    );

    expect(entries.every((e) => e.severity !== 'error')).toBe(true);
  });

  it('returns a warning for the deprecated getLocation method', () => {
    const entries = validateCall('getLocation', [], makeState(), makeContext());

    expect(entries.some((e) => e.severity === 'warning')).toBe(true);
  });

  it('returns an error for addEventListener with an invalid event name', () => {
    const entries = validateCall('addEventListener', ['notAnEvent'], makeState(), makeContext());

    expect(entries.some((e) => e.severity === 'error')).toBe(true);
  });

  it('returns an error for removeEventListener with an invalid event name', () => {
    const entries = validateCall('removeEventListener', ['bogus'], makeState(), makeContext());

    expect(entries.some((e) => e.severity === 'error')).toBe(true);
  });

  it('returns a warning when expand() is called while already expanded', () => {
    const entries = validateCall(
      'expand',
      [],
      makeState({ state: MraidState.Expanded }),
      makeContext(),
    );

    expect(entries.some((e) => e.severity === 'warning')).toBe(true);
  });

  it('returns a warning when expand() is called on an interstitial placement', () => {
    const entries = validateCall(
      'expand',
      [],
      makeState({ placementType: MraidPlacementType.Interstitial }),
      makeContext(),
    );

    expect(entries.some((e) => e.severity === 'warning')).toBe(true);
  });

  it('returns an error for resize() without prior setResizeProperties', () => {
    const entries = validateCall(
      'resize',
      [],
      makeState({ resizeProperties: null }),
      makeContext(),
    );

    expect(entries.some((e) => e.severity === 'error')).toBe(true);
  });

  it('returns an error for resize() on an interstitial placement', () => {
    const entries = validateCall(
      'resize',
      [],
      makeState({ placementType: MraidPlacementType.Interstitial }),
      makeContext(),
    );

    expect(entries.some((e) => e.severity === 'error')).toBe(true);
  });

  it('returns a warning when close() is called while already hidden', () => {
    const entries = validateCall(
      'close',
      [],
      makeState({ state: MraidState.Hidden }),
      makeContext(),
    );

    expect(entries.some((e) => e.severity === 'warning')).toBe(true);
  });

  it('returns a single info entry for a valid call with no issues', () => {
    const entries = validateCall('expand', [], makeState(), makeContext());

    expect(entries).toHaveLength(1);
    expect(entries[0]!.severity).toBe('info');
  });
});
