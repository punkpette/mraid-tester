// Constants describing the MRAID 2.0 / 3.0 spec surface.
// Keeping these as const objects (not string unions alone) lets us iterate
// over them at runtime for validation, while still getting literal types.

export const MraidState = {
  Loading: 'loading',
  Default: 'default',
  Expanded: 'expanded',
  Resized: 'resized',
  Hidden: 'hidden',
} as const;

export const MraidPlacementType = {
  Inline: 'inline',
  Interstitial: 'interstitial',
} as const;

export const MraidEvent = {
  Ready: 'ready',
  Error: 'error',
  StateChange: 'stateChange',
  ViewableChange: 'viewableChange',
  SizeChange: 'sizeChange',
  // MRAID 3.0 events
  ExposureChange: 'exposureChange',
  AudioVolumeChange: 'audioVolumeChange',
} as const;

// MRAID 3.0 deprecated/removed methods we still want to recognize so the
// validator can flag creatives that rely on them.
export const MraidDeprecatedMethod = {
  GetLocation: 'getLocation',
} as const;

export const MraidMethod = {
  // Lifecycle / info
  GetVersion: 'getVersion',
  GetState: 'getState',
  GetPlacementType: 'getPlacementType',
  IsViewable: 'isViewable',
  Supports: 'supports',

  // Sizing
  GetCurrentPosition: 'getCurrentPosition',
  GetDefaultPosition: 'getDefaultPosition',
  GetMaxSize: 'getMaxSize',
  GetScreenSize: 'getScreenSize',
  GetResizeProperties: 'getResizeProperties',
  SetResizeProperties: 'setResizeProperties',
  Resize: 'resize',
  GetExpandProperties: 'getExpandProperties',
  SetExpandProperties: 'setExpandProperties',
  Expand: 'expand',

  // Lifecycle actions
  Close: 'close',
  UseCustomClose: 'useCustomClose',
  Open: 'open',

  // Native actions (MRAID 2.0)
  StorePicture: 'storePicture',
  CreateCalendarEvent: 'createCalendarEvent',
  PlayVideo: 'playVideo',

  // Orientation (MRAID 3.0)
  GetOrientationProperties: 'getOrientationProperties',
  SetOrientationProperties: 'setOrientationProperties',

  // Event listeners
  AddEventListener: 'addEventListener',
  RemoveEventListener: 'removeEventListener',
} as const;

// Methods that are allowed to be called before the "ready" event fires.
// Per spec, the creative may check these very early (e.g. to render a
// loading state), so the validator must not flag them as ordering errors.
export const METHODS_ALLOWED_BEFORE_READY: ReadonlySet<string> = new Set([
  MraidMethod.GetVersion,
  MraidMethod.GetState,
  MraidMethod.AddEventListener,
  MraidMethod.RemoveEventListener,
]);

// All valid event names, used to validate addEventListener/removeEventListener calls.
export const VALID_EVENT_NAMES: ReadonlySet<string> = new Set(Object.values(MraidEvent));
