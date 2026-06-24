// One custom targeting key-value pair for GAM requests.
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

// Mode A's two render paths, per spec:
// - "sdkRender": the official Google Mobile Ads SDK renders the creative
//   (black box, no custom logging).
// - "tagless": a tagless GAM request feeds the raw creative into our own
//   MRAID bridge, keeping full logging and validation.
export type RenderPath = 'sdkRender' | 'tagless';

export interface AppSettings {
  networkCode: string;
  adUnitPath: string;
  keyValues: KeyValuePair[];
  renderPath: RenderPath;
}

export const DEFAULT_SETTINGS: AppSettings = {
  networkCode: '',
  adUnitPath: '',
  keyValues: [],
  renderPath: 'tagless',
};
