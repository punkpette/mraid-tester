import type { KeyValuePair } from '@/types/settings';

const GAM_TAGLESS_BASE_URL = 'https://securepubads.g.doubleclick.net/gampad/adx';

export interface TaglessRequestParams {
  networkCode: string;
  adUnitPath: string;
  width: number;
  height: number;
  keyValues: KeyValuePair[];
}

export interface TaglessResult {
  success: boolean;
  html?: string;
  message: string;
}

// Combines networkCode and adUnitPath into the canonical GAM format: /networkCode/adUnitPath.
// Leading and trailing slashes in either segment are stripped so there is always exactly one
// separator slash and one leading slash.
export function buildGamAdUnitPath(networkCode: string, adUnitPath: string): string {
  const cleanedNetwork = networkCode.replace(/^\/+|\/+$/g, '');
  const cleanedUnit = adUnitPath.replace(/^\/+|\/+$/g, '');

  if (cleanedUnit.length === 0) {
    return `/${cleanedNetwork}`;
  }

  return `/${cleanedNetwork}/${cleanedUnit}`;
}

// Encodes key-value pairs using the GAM tagless double-encoding spec:
// 1. Each pair: encodeURIComponent(key)=encodeURIComponent(value)
// 2. Pairs joined with literal '&'
// 3. The whole string is passed through encodeURIComponent once more
// The caller appends the result as t={encoded}.
function encodeKeyValuesForGam(keyValues: KeyValuePair[]): string {
  const activePairs = keyValues.filter((kv) => kv.key.length > 0);
  const innerPairs = activePairs.map(
    (kv) => `${encodeURIComponent(kv.key)}=${encodeURIComponent(kv.value)}`,
  );

  return encodeURIComponent(innerPairs.join('&'));
}

// Builds the full tagless ad request URL with all required GAM parameters.
// The correlator (c) is a random integer, unique per call, for cache-busting.
export function buildTaglessRequestUrl(params: TaglessRequestParams): string {
  const iu = buildGamAdUnitPath(params.networkCode, params.adUnitPath);
  const sz = `${params.width}x${params.height}`;
  const correlator = Math.floor(Math.random() * 1e10);

  const queryParts: string[] = [
    `iu=${encodeURIComponent(iu)}`,
    `sz=${encodeURIComponent(sz)}`,
    `c=${String(correlator)}`,
    `tile=1`,
  ];

  const activeKeyValues = params.keyValues.filter((kv) => kv.key.length > 0);

  if (activeKeyValues.length > 0) {
    queryParts.push(`t=${encodeKeyValuesForGam(params.keyValues)}`);
  }

  return `${GAM_TAGLESS_BASE_URL}?${queryParts.join('&')}`;
}

// Fetches a creative from GAM using a tagless request.
// An empty 200 response means "no fill" — this is a valid outcome, not a network error.
// Network failures are caught and returned as { success: false } rather than thrown.
export async function fetchTaglessCreative(params: TaglessRequestParams): Promise<TaglessResult> {
  let response: Response;

  try {
    const url = buildTaglessRequestUrl(params);
    response = await fetch(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed.';

    return { success: false, message };
  }

  const html = await response.text();

  if (html.trim().length === 0) {
    return {
      success: false,
      message: 'No fill: GAM returned an empty response (no matching creative).',
    };
  }

  return {
    success: true,
    html,
    message: `Creative received (${html.length} bytes).`,
  };
}
