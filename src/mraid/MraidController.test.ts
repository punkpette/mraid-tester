import { MraidController } from './MraidController';
import { MraidPlacementType, MraidState } from './constants';

function makeController(onNativeAction?: (method: string, args: unknown[]) => void) {
  return new MraidController({
    placementType: MraidPlacementType.Inline,
    adSize: { width: 300, height: 250 },
    screenSize: { width: 400, height: 800 },
    onNativeAction,
  });
}

function ready(ctrl: MraidController, callId = '1') {
  ctrl.handleBridgeMessage(`{"method":"__bridgeReady","args":[],"callId":"${callId}"}`);
}

describe('MraidController', () => {
  let controller: MraidController;

  beforeEach(() => {
    controller = new MraidController({
      placementType: MraidPlacementType.Inline,
      adSize: { width: 300, height: 250 },
      screenSize: { width: 400, height: 800 },
    });
  });

  describe('handleBridgeMessage — __bridgeReady', () => {
    it('transitions state to "default" and sets isViewable to true', () => {
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      const state = controller.getState();

      expect(state.state).toBe(MraidState.Default);
      expect(state.isViewable).toBe(true);
    });

    it('logs a ready event', () => {
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      const { log } = controller.getState();

      expect(log.some((e) => e.source === 'ready')).toBe(true);
    });
  });

  describe('handleBridgeMessage — expand', () => {
    it('transitions state to "expanded" after ready', () => {
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');
      controller.handleBridgeMessage('{"method":"expand","args":[],"callId":"2"}');

      expect(controller.getState().state).toBe(MraidState.Expanded);
    });
  });

  describe('handleBridgeMessage — invalid method', () => {
    it('logs an error and leaves the state unchanged', () => {
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      const stateBefore = controller.getState().state;

      controller.handleBridgeMessage('{"method":"notAMethod","args":[],"callId":"2"}');

      const { log, state } = controller.getState();

      expect(log.some((e) => e.severity === 'error')).toBe(true);
      expect(state).toBe(stateBefore);
    });
  });

  describe('subscribe', () => {
    it('notifies a listener on each state change', () => {
      const listener = jest.fn();
      controller.subscribe(listener);

      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      expect(listener).toHaveBeenCalled();
    });

    it('stops notifying after the returned unsubscribe is called', () => {
      const listener = jest.fn();
      const unsubscribe = controller.subscribe(listener);

      unsubscribe();
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('logActionResult', () => {
    it('appends an info entry on success', () => {
      controller.logActionResult('storePicture', true, 'Saved successfully.');

      const last = controller.getState().log.at(-1);

      expect(last?.severity).toBe('info');
    });

    it('appends an error entry on failure', () => {
      controller.logActionResult('storePicture', false, 'Permission denied.');

      const last = controller.getState().log.at(-1);

      expect(last?.severity).toBe('error');
    });
  });

  describe('handleBridgeMessage — malformed JSON', () => {
    it('logs a bridge error and leaves state unchanged instead of throwing', () => {
      const stateBefore = controller.getState().state;

      controller.handleBridgeMessage('not valid json {{{');

      const { log, state } = controller.getState();

      expect(state).toBe(stateBefore);
      expect(log.some((e) => e.severity === 'error' && e.source === 'bridge')).toBe(true);
    });
  });

  describe('handleBridgeMessage — duplicate __bridgeReady', () => {
    it('ignores a second __bridgeReady after hasFiredReady is true', () => {
      ready(controller);

      const logLengthAfterFirst = controller.getState().log.length;

      // A second __bridgeReady should be silently ignored (guard at line 170).
      ready(controller, '2');

      // State stays "default" and no new log entries are added.
      expect(controller.getState().state).toBe(MraidState.Default);
      expect(controller.getState().log.length).toBe(logLengthAfterFirst);
    });
  });

  describe('attachWebView', () => {
    it('forwards state updates to the sendToWebView callback', () => {
      const sendToWebView = jest.fn();

      controller.attachWebView(sendToWebView);
      ready(controller);

      expect(sendToWebView).toHaveBeenCalled();
    });
  });

  describe('handleBridgeMessage — close', () => {
    it('transitions from expanded → default on close', () => {
      ready(controller);
      controller.handleBridgeMessage('{"method":"expand","args":[],"callId":"2"}');

      expect(controller.getState().state).toBe(MraidState.Expanded);

      controller.handleBridgeMessage('{"method":"close","args":[],"callId":"3"}');

      expect(controller.getState().state).toBe(MraidState.Default);
      expect(controller.getState().isViewable).toBe(true);
    });

    it('transitions from default → hidden on close, sets isViewable to false', () => {
      ready(controller);

      controller.handleBridgeMessage('{"method":"close","args":[],"callId":"2"}');

      expect(controller.getState().state).toBe(MraidState.Hidden);
      expect(controller.getState().isViewable).toBe(false);
    });
  });

  describe('handleBridgeMessage — resize', () => {
    it('is blocked with an error when setResizeProperties() was never called', () => {
      ready(controller);

      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"2"}');

      expect(controller.getState().state).toBe(MraidState.Default);
      expect(controller.getState().log.some((e) => e.severity === 'error')).toBe(true);
    });
  });

  describe('handleBridgeMessage — setResizeProperties + resize flow', () => {
    const validPropsJson = JSON.stringify({
      width: 300,
      height: 200,
      customClosePosition: 'top-right',
      offsetX: 0,
      offsetY: 0,
      allowOffscreen: false,
    });

    it('stores resizeProperties and allows a subsequent resize() to succeed', () => {
      ready(controller);

      controller.handleBridgeMessage(
        `{"method":"setResizeProperties","args":[${validPropsJson}],"callId":"2"}`,
      );

      expect(controller.getState().resizeProperties).not.toBeNull();
      expect(controller.getState().resizeProperties?.width).toBe(300);

      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"3"}');

      expect(controller.getState().state).toBe(MraidState.Resized);
      // No error about missing setResizeProperties should be in the log.
      expect(
        controller
          .getState()
          .log.some((e) => e.severity === 'error' && e.message.includes('setResizeProperties')),
      ).toBe(false);
    });

    it('keeps resizeProperties null and logs an error when called with invalid props', () => {
      ready(controller);

      // Missing width — should fail the type guard.
      controller.handleBridgeMessage(
        '{"method":"setResizeProperties","args":[{"height":200}],"callId":"2"}',
      );

      expect(controller.getState().resizeProperties).toBeNull();
      expect(controller.getState().log.some((e) => e.severity === 'error')).toBe(true);

      // resize() must still be blocked after the failed setResizeProperties.
      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"3"}');
      expect(controller.getState().state).toBe(MraidState.Default);
    });

    it('logs an error when args[0] is not an object (fail-safe)', () => {
      ready(controller);

      controller.handleBridgeMessage(
        '{"method":"setResizeProperties","args":["notAnObject"],"callId":"2"}',
      );

      expect(controller.getState().resizeProperties).toBeNull();
      expect(controller.getState().log.some((e) => e.severity === 'error')).toBe(true);
    });

    it('sets currentPosition to the centered rect after a successful resize()', () => {
      // screenSize is 400×800 (from beforeEach), resizeProps 300×200.
      // x = (400 - 300) / 2 = 50, y = (800 - 200) / 2 = 300.
      ready(controller);

      controller.handleBridgeMessage(
        `{"method":"setResizeProperties","args":[${validPropsJson}],"callId":"2"}`,
      );
      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"3"}');

      const { currentPosition } = controller.getState();
      expect(currentPosition).toEqual({ x: 50, y: 300, width: 300, height: 200 });
    });

    it('restores currentPosition to defaultPosition after close() from Resized', () => {
      const { defaultPosition } = controller.getState();

      ready(controller);

      controller.handleBridgeMessage(
        `{"method":"setResizeProperties","args":[${validPropsJson}],"callId":"2"}`,
      );
      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"3"}');

      // Verify currentPosition changed during resize.
      expect(controller.getState().currentPosition).not.toEqual(defaultPosition);

      controller.handleBridgeMessage('{"method":"close","args":[],"callId":"4"}');

      expect(controller.getState().state).toBe(MraidState.Default);
      // currentPosition must match defaultPosition values.
      expect(controller.getState().currentPosition).toEqual(defaultPosition);
      // Must be a fresh object, not the same reference as defaultPosition.
      expect(controller.getState().currentPosition).not.toBe(defaultPosition);
    });

    it('allows a full setResizeProperties + resize cycle after resetForNewCreative()', () => {
      ready(controller);

      // First creative uses resize.
      controller.handleBridgeMessage(
        `{"method":"setResizeProperties","args":[${validPropsJson}],"callId":"2"}`,
      );
      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"3"}');

      expect(controller.getState().state).toBe(MraidState.Resized);

      // Reset for a second creative.
      controller.resetForNewCreative();

      expect(controller.getState().resizeProperties).toBeNull();

      // Second creative goes through the same flow.
      ready(controller, '4');

      controller.handleBridgeMessage(
        `{"method":"setResizeProperties","args":[${validPropsJson}],"callId":"5"}`,
      );
      controller.handleBridgeMessage('{"method":"resize","args":[],"callId":"6"}');

      expect(controller.getState().state).toBe(MraidState.Resized);
      expect(controller.getState().currentPosition).toEqual({
        x: 50,
        y: 300,
        width: 300,
        height: 200,
      });
    });
  });

  describe('handleBridgeMessage — native action dispatch', () => {
    it('calls onNativeAction with the method and args for open', () => {
      const onNativeAction = jest.fn();
      const ctrl = makeController(onNativeAction);

      ready(ctrl);
      ctrl.handleBridgeMessage('{"method":"open","args":["https://example.com"],"callId":"2"}');

      expect(onNativeAction).toHaveBeenCalledWith('open', ['https://example.com']);
    });

    it('calls onNativeAction for storePicture', () => {
      const onNativeAction = jest.fn();
      const ctrl = makeController(onNativeAction);

      ready(ctrl);
      ctrl.handleBridgeMessage(
        '{"method":"storePicture","args":["https://img.example.com/img.jpg"],"callId":"2"}',
      );

      expect(onNativeAction).toHaveBeenCalledWith('storePicture', [
        'https://img.example.com/img.jpg',
      ]);
    });
  });

  describe('resetForNewCreative', () => {
    it('allows a second __bridgeReady to transition state to "default"', () => {
      // First creative: bridge initializes and state becomes "default".
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      expect(controller.getState().state).toBe(MraidState.Default);
      expect(controller.getState().isViewable).toBe(true);

      // Reset between creatives: state rolls back to "loading".
      controller.resetForNewCreative();

      expect(controller.getState().state).toBe(MraidState.Loading);
      expect(controller.getState().isViewable).toBe(false);
      expect(controller.getState().resizeProperties).toBeNull();

      // Second creative: bridge fires again and must be processed (not
      // silently ignored by the now-cleared hasFiredReady flag).
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"2"}');

      expect(controller.getState().state).toBe(MraidState.Default);
      expect(controller.getState().isViewable).toBe(true);
    });

    it('preserves placement type and ad size after reset', () => {
      controller.setPlacementType(MraidPlacementType.Interstitial);
      controller.setAdSize({ width: 390, height: 844 });

      controller.resetForNewCreative();

      const state = controller.getState();

      expect(state.placementType).toBe(MraidPlacementType.Interstitial);
      expect(state.defaultPosition.width).toBe(390);
      expect(state.defaultPosition.height).toBe(844);
    });

    it('preserves the call log so prior session history remains visible', () => {
      controller.handleBridgeMessage('{"method":"__bridgeReady","args":[],"callId":"1"}');

      const logLengthBefore = controller.getState().log.length;

      controller.resetForNewCreative();

      // Log grows (reset itself emits a state update) but prior entries survive.
      expect(controller.getState().log.length).toBeGreaterThanOrEqual(logLengthBefore);
    });
  });
});
