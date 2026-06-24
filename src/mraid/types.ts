import type { MraidEvent, MraidPlacementType, MraidState } from './constants';

export type MraidStateValue = (typeof MraidState)[keyof typeof MraidState];
export type MraidPlacementTypeValue = (typeof MraidPlacementType)[keyof typeof MraidPlacementType];
export type MraidEventValue = (typeof MraidEvent)[keyof typeof MraidEvent];

export interface MraidSize {
  width: number;
  height: number;
}

export interface MraidPosition extends MraidSize {
  x: number;
  y: number;
}

export interface MraidResizeProperties {
  width: number;
  height: number;
  customClosePosition: string;
  offsetX: number;
  offsetY: number;
  allowOffscreen: boolean;
}

export interface MraidExpandProperties {
  width: number;
  height: number;
  useCustomClose: boolean;
  isModal: boolean;
}

export interface MraidOrientationProperties {
  allowOrientationChange: boolean;
  forceOrientation: 'portrait' | 'landscape' | 'none';
}

// One row in the call log panel. Severity drives how it's rendered.
export type LogSeverity = 'info' | 'warning' | 'error';

export interface MraidLogEntry {
  id: string;
  timestamp: number;
  severity: LogSeverity;
  // The raw method/event name involved, e.g. "expand" or "stateChange".
  source: string;
  message: string;
  // Optional structured payload (call arguments, event data) for debugging.
  detail?: unknown;
}

// A single call reported by the WebView bridge to the native controller.
export interface MraidBridgeCall {
  type: 'call';
  method: string;
  args: unknown[];
  callId: string;
}

export type MraidBridgeMessage = MraidBridgeCall;

// The native controller's full, observable state.
export interface MraidControllerState {
  state: MraidStateValue;
  placementType: MraidPlacementTypeValue;
  isViewable: boolean;
  currentPosition: MraidPosition;
  defaultPosition: MraidPosition;
  maxSize: MraidSize;
  screenSize: MraidSize;
  resizeProperties: MraidResizeProperties | null;
  expandProperties: MraidExpandProperties;
  orientationProperties: MraidOrientationProperties;
  useCustomClose: boolean;
  log: MraidLogEntry[];
}
