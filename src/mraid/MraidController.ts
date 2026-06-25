import { MraidMethod, MraidState } from './constants';
import { createLogEntry, validateCall } from './validator';
import type {
  MraidBridgeMessage,
  MraidControllerState,
  MraidLogEntry,
  MraidPlacementTypeValue,
  MraidSize,
} from './types';

export interface MraidControllerOptions {
  placementType: MraidPlacementTypeValue;
  adSize: MraidSize;
  screenSize: MraidSize;
  // Called for methods that require a real device action (storePicture,
  // createCalendarEvent, playVideo, open, sms, tel). The controller itself
  // never touches native device APIs directly — that lives in a separate
  // native-actions module injected here, keeping this class easy to test.
  onNativeAction?: (method: string, args: unknown[]) => void;
}

type Listener = (state: MraidControllerState) => void;

const MAX_LOG_ENTRIES = 500;

// Owns the single source of truth for MRAID state on the native side.
// The WebView is treated as a dumb mirror: it reports calls here, and this
// controller decides what (if anything) changes, then pushes the result
// back down via `sendToWebView`.
export class MraidController {
  private state: MraidControllerState;
  private hasFiredReady = false;
  private readonly calledMethods = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private readonly onNativeAction?: (method: string, args: unknown[]) => void;
  private sendToWebView: ((javaScript: string) => void) | null = null;

  constructor(options: MraidControllerOptions) {
    this.onNativeAction = options.onNativeAction;

    const defaultPosition = {
      x: 0,
      y: 0,
      width: options.adSize.width,
      height: options.adSize.height,
    };

    this.state = {
      state: MraidState.Loading,
      placementType: options.placementType,
      isViewable: false,
      currentPosition: defaultPosition,
      defaultPosition,
      maxSize: options.screenSize,
      screenSize: options.screenSize,
      resizeProperties: null,
      expandProperties: {
        width: options.screenSize.width,
        height: options.screenSize.height,
        useCustomClose: false,
        isModal: true,
      },
      orientationProperties: {
        allowOrientationChange: true,
        forceOrientation: 'none',
      },
      useCustomClose: false,
      log: [],
    };
  }

  // The WebView ref isn't known until the screen mounts, so it's wired up
  // after construction rather than via the constructor.
  public attachWebView(sendToWebView: (javaScript: string) => void): void {
    this.sendToWebView = sendToWebView;
  }

  public getState(): MraidControllerState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  // Lets external async work (real native actions: storePicture,
  // createCalendarEvent, etc.) report its outcome back into the same call
  // log, once the promise resolves — which happens after the original
  // applySideEffects() call has already returned.
  public logActionResult(method: string, success: boolean, message: string): void {
    this.appendLog(createLogEntry(success ? 'info' : 'error', method, message));
  }

  // Changes the ad's logical size. Only meaningful before a creative is
  // loaded or while in the "default" state — this represents picking a
  // new ad unit size from the selector, not a runtime resize() call from
  // the creative itself (that's handled separately in applySideEffects).
  public setAdSize(size: MraidSize): void {
    const { x, y } = this.state.defaultPosition;

    this.updateState({
      defaultPosition: { x, y, width: size.width, height: size.height },
      currentPosition: { x, y, width: size.width, height: size.height },
    });
  }

  public setPlacementType(placementType: MraidPlacementTypeValue): void {
    this.updateState({ placementType });
  }

  // Entry point: called with the raw JSON string posted from the WebView.
  public handleBridgeMessage(rawMessage: string): void {
    let parsed: MraidBridgeMessage;

    try {
      parsed = JSON.parse(rawMessage) as MraidBridgeMessage;
    } catch {
      this.appendLog(createLogEntry('error', 'bridge', 'Received malformed JSON from WebView.'));

      return;
    }

    if (parsed.method === '__bridgeReady') {
      this.handleBridgeReady();

      return;
    }

    const entries = validateCall(parsed.method, parsed.args, this.state, {
      hasFiredReady: this.hasFiredReady,
      calledMethods: this.calledMethods,
    });

    this.calledMethods.add(parsed.method);
    this.appendLog(...entries);

    const hasBlockingError = entries.some((entry) => entry.severity === 'error');

    if (hasBlockingError) {
      return;
    }

    this.applySideEffects(parsed.method, parsed.args);
  }

  // Fires the initial "ready" sequence once the WebView confirms `window.mraid`
  // has been installed. This happens once per ad lifecycle.
  private handleBridgeReady(): void {
    if (this.hasFiredReady) {
      return;
    }

    this.hasFiredReady = true;
    this.updateState({ state: MraidState.Default, isViewable: true });
    this.appendLog(createLogEntry('info', 'ready', 'MRAID bridge ready. Firing "ready" event.'));
    this.fireEvent('ready', []);
    this.fireEvent('viewableChange', [true]);
  }

  private applySideEffects(method: string, args: unknown[]): void {
    switch (method) {
      case MraidMethod.Expand: {
        this.updateState({ state: MraidState.Expanded });
        this.fireEvent('stateChange', [MraidState.Expanded]);
        break;
      }

      case MraidMethod.Resize: {
        this.updateState({ state: MraidState.Resized });
        this.fireEvent('stateChange', [MraidState.Resized]);
        break;
      }

      case MraidMethod.Close: {
        const nextState =
          this.state.state === MraidState.Default ? MraidState.Hidden : MraidState.Default;

        this.updateState({ state: nextState, isViewable: nextState !== MraidState.Hidden });
        this.fireEvent('stateChange', [nextState]);

        if (nextState === MraidState.Hidden) {
          this.fireEvent('viewableChange', [false]);
        }

        break;
      }

      case MraidMethod.StorePicture:
      case MraidMethod.CreateCalendarEvent:
      case MraidMethod.PlayVideo:
      case MraidMethod.Open: {
        this.onNativeAction?.(method, args);
        break;
      }

      default: {
        // Getters and property setters already mutate local mirrors on the
        // WebView side optimistically; nothing further to do here.
        break;
      }
    }
  }

  // Pushes a partial state update into the local mirror, syncs it down to
  // the WebView, and notifies React subscribers.
  private updateState(partial: Partial<MraidControllerState>): void {
    this.state = { ...this.state, ...partial };
    this.sendToWebView?.(
      `window.__mraidBridge.applyUpdate(${JSON.stringify(
        JSON.stringify({ type: 'state', payload: partial }),
      )}); true;`,
    );
    this.notifyListeners();
  }

  private fireEvent(name: string, args: unknown[]): void {
    this.sendToWebView?.(
      `window.__mraidBridge.applyUpdate(${JSON.stringify(
        JSON.stringify({ type: 'event', name, args }),
      )}); true;`,
    );
  }

  private appendLog(...entries: MraidLogEntry[]): void {
    if (entries.length === 0) {
      return;
    }

    const combined = [...this.state.log, ...entries];
    const trimmed =
      combined.length > MAX_LOG_ENTRIES
        ? combined.slice(combined.length - MAX_LOG_ENTRIES)
        : combined;

    this.state = { ...this.state, log: trimmed };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
