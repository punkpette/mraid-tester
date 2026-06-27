// Mocks must be declared before any imports so Jest's hoisting picks them up.
import { computeVisualRect } from './AdSessionOverlay';
import { MraidPlacementType, MraidState } from './constants';
import type { InlineRect } from './AdSessionContext';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('./AdSessionContext', () => ({ useAdSession: jest.fn() }));

const OFFSCREEN: InlineRect = { x: 0, y: -9999, width: 1, height: 1 };

const INLINE_RECT: InlineRect = { x: 10, y: 100, width: 300, height: 250 };

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

function opts(
  mraidState: string,
  placementType: string,
  overrides: Partial<{
    inlineRect: InlineRect | null;
    resizedWidth: number;
    resizedHeight: number;
  }> = {},
) {
  return {
    mraidState,
    placementType,
    inlineRect: INLINE_RECT,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    resizedWidth: 200,
    resizedHeight: 150,
    ...overrides,
  };
}

describe('computeVisualRect', () => {
  it('returns offscreen rect when mraidState is "hidden"', () => {
    expect(computeVisualRect(opts(MraidState.Hidden, MraidPlacementType.Inline))).toEqual(
      OFFSCREEN,
    );
  });

  it('hidden check takes priority: returns offscreen even for interstitial placement', () => {
    // The "hidden" guard runs before the interstitial fullscreen shortcut.
    expect(computeVisualRect(opts(MraidState.Hidden, MraidPlacementType.Interstitial))).toEqual(
      OFFSCREEN,
    );
  });

  it('returns fullscreen for interstitial in default state', () => {
    expect(computeVisualRect(opts(MraidState.Default, MraidPlacementType.Interstitial))).toEqual({
      x: 0,
      y: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
  });

  it('returns fullscreen for interstitial in expanded state (interstitial check is earlier)', () => {
    expect(computeVisualRect(opts(MraidState.Expanded, MraidPlacementType.Interstitial))).toEqual({
      x: 0,
      y: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
  });

  it('returns fullscreen for inline expanded state', () => {
    expect(computeVisualRect(opts(MraidState.Expanded, MraidPlacementType.Inline))).toEqual({
      x: 0,
      y: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
  });

  it('returns centered rect for resized state using resizedWidth/Height', () => {
    const result = computeVisualRect(
      opts(MraidState.Resized, MraidPlacementType.Inline, {
        resizedWidth: 200,
        resizedHeight: 150,
      }),
    );
    const expectedX = (SCREEN_WIDTH - 200) / 2;
    const expectedY = (SCREEN_HEIGHT - 150) / 2;
    expect(result).toEqual({ x: expectedX, y: expectedY, width: 200, height: 150 });
  });

  it('returns inlineRect for default state when inlineRect is provided', () => {
    expect(computeVisualRect(opts(MraidState.Default, MraidPlacementType.Inline))).toEqual(
      INLINE_RECT,
    );
  });

  it('returns offscreen for default state when inlineRect is null', () => {
    expect(
      computeVisualRect(opts(MraidState.Default, MraidPlacementType.Inline, { inlineRect: null })),
    ).toEqual(OFFSCREEN);
  });
});
