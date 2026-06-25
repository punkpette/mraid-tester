import {
  METHODS_ALLOWED_BEFORE_READY,
  MraidDeprecatedMethod,
  MraidMethod,
  MraidPlacementType,
  MraidState,
  VALID_EVENT_NAMES,
} from './constants';
import type { LogSeverity, MraidControllerState, MraidLogEntry } from './types';

const VALID_METHOD_NAMES: ReadonlySet<string> = new Set(Object.values(MraidMethod));
const DEPRECATED_METHOD_NAMES: ReadonlySet<string> = new Set(Object.values(MraidDeprecatedMethod));
// Deprecated methods are recognized but not "valid" per MRAID 3.0 — must check both.
const ALL_RECOGNIZED_METHODS: ReadonlySet<string> = new Set([
  ...VALID_METHOD_NAMES,
  ...DEPRECATED_METHOD_NAMES,
]);

let logIdCounter = 0;

function nextLogId(): string {
  logIdCounter += 1;

  return `log_${logIdCounter}`;
}

export function createLogEntry(
  severity: LogSeverity,
  source: string,
  message: string,
  detail?: unknown,
): MraidLogEntry {
  return {
    id: nextLogId(),
    timestamp: Date.now(),
    severity,
    source,
    message,
    detail,
  };
}

export interface ValidationContext {
  hasFiredReady: boolean;
  calledMethods: ReadonlySet<string>;
}

// Validates a single method call against the MRAID spec and current
// controller state. Returns zero or more log entries describing problems.
// This is a pure function on purpose: easy to unit test, no side effects.
export function validateCall(
  method: string,
  args: unknown[],
  state: MraidControllerState,
  context: ValidationContext,
): MraidLogEntry[] {
  const entries: MraidLogEntry[] = [];

  if (!ALL_RECOGNIZED_METHODS.has(method)) {
    entries.push(createLogEntry('error', method, `Unknown MRAID method "${method}" was called.`));

    return entries;
  }

  if (DEPRECATED_METHOD_NAMES.has(method)) {
    entries.push(
      createLogEntry('warning', method, `"${method}" is deprecated in MRAID 3.0.`),
    );
  }

  if (!context.hasFiredReady && !METHODS_ALLOWED_BEFORE_READY.has(method)) {
    entries.push(
      createLogEntry(
        'error',
        method,
        `"${method}" was called before the "ready" event fired. Per spec, creatives must wait for ready.`,
      ),
    );

    return entries;
  }

  if (method === MraidMethod.AddEventListener || method === MraidMethod.RemoveEventListener) {
    const eventName = args[0];

    if (typeof eventName !== 'string' || !VALID_EVENT_NAMES.has(eventName)) {
      entries.push(
        createLogEntry('error', method, `"${String(eventName)}" is not a valid MRAID event name.`),
      );
    }

    return entries;
  }

  if (method === MraidMethod.Expand) {
    if (state.state === MraidState.Expanded) {
      entries.push(
        createLogEntry('warning', method, 'expand() was called while already in the expanded state.'),
      );
    }

    if (state.placementType === MraidPlacementType.Interstitial) {
      entries.push(
        createLogEntry(
          'warning',
          method,
          'expand() was called on an interstitial placement, which is already fullscreen per spec.',
        ),
      );
    }
  }

  if (method === MraidMethod.Resize) {
    if (state.placementType === MraidPlacementType.Interstitial) {
      entries.push(
        createLogEntry(
          'error',
          method,
          'resize() is not allowed on interstitial placements per spec.',
        ),
      );

      return entries;
    }

    if (state.resizeProperties === null) {
      entries.push(
        createLogEntry(
          'error',
          method,
          'resize() was called without calling setResizeProperties() first.',
        ),
      );

      return entries;
    }
  }

  if (method === MraidMethod.Close && state.state === MraidState.Hidden) {
    entries.push(createLogEntry('warning', method, 'close() was called while already hidden.'));
  }

  if (entries.length === 0) {
    entries.push(createLogEntry('info', method, `${method}() called.`, args));
  }

  return entries;
}
