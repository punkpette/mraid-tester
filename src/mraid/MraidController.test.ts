import { MraidController } from './MraidController';
import { MraidPlacementType, MraidState } from './constants';

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
});
