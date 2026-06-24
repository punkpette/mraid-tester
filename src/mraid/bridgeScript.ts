import type { MraidControllerState } from './types';

// MRAID version this mock advertises to creatives via mraid.getVersion().
export const MRAID_VERSION = '3.0';

// Builds the JavaScript source injected into the WebView before the
// creative's own code runs. It implements `window.mraid` fully on the
// client side using a local state mirror, and reports every call back to
// the native controller for logging/validation. The native side never
// blocks a getter call (MRAID getters must be synchronous per spec), so the
// mirror is kept in sync by native pushing updates via `applyUpdate`.
export function buildBridgeScript(initialState: MraidControllerState): string {
  const initialStateJson = JSON.stringify(initialState);

  // NOTE: this whole block runs inside the WebView's JS context, not in
  // React Native. It cannot import anything from the app bundle.
  return `
(function setupMraidBridge() {
  if (window.mraid) {
    return;
  }

  var state = ${initialStateJson};
  var listeners = {};
  var callCounter = 0;

  function nextCallId() {
    callCounter += 1;
    return 'call_' + callCounter;
  }

  function reportToNative(method, args) {
    var payload = {
      type: 'call',
      method: method,
      args: args,
      callId: nextCallId(),
    };

    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function dispatchEvent(eventName, eventArgs) {
    var handlers = listeners[eventName];

    if (!handlers) {
      return;
    }

    for (var i = 0; i < handlers.length; i += 1) {
      try {
        handlers[i].apply(null, eventArgs || []);
      } catch (handlerError) {
        reportToNative('creativeError', [String(handlerError)]);
      }
    }
  }

  // Exposed so native can push state updates and fire events without
  // reloading the page. Called via WebView.injectJavaScript from the
  // native MraidController.
  window.__mraidBridge = {
    applyUpdate: function applyUpdate(updateJson) {
      var update = JSON.parse(updateJson);

      if (update.type === 'state') {
        for (var key in update.payload) {
          if (Object.prototype.hasOwnProperty.call(update.payload, key)) {
            state[key] = update.payload[key];
          }
        }
        return;
      }

      if (update.type === 'event') {
        dispatchEvent(update.name, update.args);
      }
    },
  };

  window.mraid = {
    getVersion: function getVersion() {
      reportToNative('getVersion', []);
      return '${MRAID_VERSION}';
    },

    getState: function getState() {
      reportToNative('getState', []);
      return state.state;
    },

    getPlacementType: function getPlacementType() {
      reportToNative('getPlacementType', []);
      return state.placementType;
    },

    isViewable: function isViewable() {
      reportToNative('isViewable', []);
      return state.isViewable;
    },

    getCurrentPosition: function getCurrentPosition() {
      reportToNative('getCurrentPosition', []);
      return state.currentPosition;
    },

    getDefaultPosition: function getDefaultPosition() {
      reportToNative('getDefaultPosition', []);
      return state.defaultPosition;
    },

    getMaxSize: function getMaxSize() {
      reportToNative('getMaxSize', []);
      return state.maxSize;
    },

    getScreenSize: function getScreenSize() {
      reportToNative('getScreenSize', []);
      return state.screenSize;
    },

    getResizeProperties: function getResizeProperties() {
      reportToNative('getResizeProperties', []);
      return state.resizeProperties;
    },

    setResizeProperties: function setResizeProperties(properties) {
      reportToNative('setResizeProperties', [properties]);
      state.resizeProperties = properties;
    },

    getExpandProperties: function getExpandProperties() {
      reportToNative('getExpandProperties', []);
      return state.expandProperties;
    },

    setExpandProperties: function setExpandProperties(properties) {
      reportToNative('setExpandProperties', [properties]);
      state.expandProperties = Object.assign({}, state.expandProperties, properties);
    },

    getOrientationProperties: function getOrientationProperties() {
      reportToNative('getOrientationProperties', []);
      return state.orientationProperties;
    },

    setOrientationProperties: function setOrientationProperties(properties) {
      reportToNative('setOrientationProperties', [properties]);
      state.orientationProperties = Object.assign({}, state.orientationProperties, properties);
    },

    useCustomClose: function useCustomClose(useCustom) {
      reportToNative('useCustomClose', [useCustom]);
      state.useCustomClose = !!useCustom;
    },

    expand: function expand(url) {
      reportToNative('expand', [url]);
    },

    resize: function resize() {
      reportToNative('resize', []);
    },

    close: function close() {
      reportToNative('close', []);
    },

    open: function open(url) {
      reportToNative('open', [url]);
    },

    storePicture: function storePicture(url) {
      reportToNative('storePicture', [url]);
    },

    createCalendarEvent: function createCalendarEvent(params) {
      reportToNative('createCalendarEvent', [params]);
    },

    playVideo: function playVideo(url) {
      reportToNative('playVideo', [url]);
    },

    // Deprecated in MRAID 3.0, kept so the validator can flag misuse.
    getLocation: function getLocation() {
      reportToNative('getLocation', []);
      return null;
    },

    supports: function supports(feature) {
      reportToNative('supports', [feature]);
      var supported = ['sms', 'tel', 'calendar', 'storePicture', 'inlineVideo', 'vpaid'];
      return supported.indexOf(feature) !== -1;
    },

    addEventListener: function addEventListener(eventName, listener) {
      reportToNative('addEventListener', [eventName]);

      if (!listeners[eventName]) {
        listeners[eventName] = [];
      }

      listeners[eventName].push(listener);
    },

    removeEventListener: function removeEventListener(eventName, listener) {
      reportToNative('removeEventListener', [eventName]);

      var handlers = listeners[eventName];

      if (!handlers) {
        return;
      }

      var index = handlers.indexOf(listener);

      if (index !== -1) {
        handlers.splice(index, 1);
      }
    },
  };

  reportToNative('__bridgeReady', []);
})();
true;
`;
}
