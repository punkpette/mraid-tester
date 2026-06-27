import {
  buildGamAdUnitPath,
  buildTaglessRequestUrl,
  fetchTaglessCreative,
  getInterstitialRequestSize,
} from './gamTaglessRequest';
import type { TaglessRequestParams } from './gamTaglessRequest';

const BASE_PARAMS: TaglessRequestParams = {
  networkCode: '123456',
  adUnitPath: 'test-unit',
  width: 300,
  height: 250,
  keyValues: [],
};

describe('getInterstitialRequestSize', () => {
  it('returns portrait size (320x480) when height > width', () => {
    expect(getInterstitialRequestSize(400, 800)).toEqual({ width: 320, height: 480 });
  });

  it('returns landscape size (480x320) when width > height', () => {
    expect(getInterstitialRequestSize(800, 400)).toEqual({ width: 480, height: 320 });
  });

  it('returns portrait size (320x480) when width === height (square edge case)', () => {
    expect(getInterstitialRequestSize(500, 500)).toEqual({ width: 320, height: 480 });
  });
});

describe('buildGamAdUnitPath', () => {
  it('combines networkCode and adUnitPath with a leading slash', () => {
    expect(buildGamAdUnitPath('123456', 'test-unit')).toBe('/123456/test-unit');
  });

  it('strips leading and trailing slashes from networkCode', () => {
    expect(buildGamAdUnitPath('/123456/', 'test-unit')).toBe('/123456/test-unit');
  });

  it('strips leading and trailing slashes from adUnitPath', () => {
    expect(buildGamAdUnitPath('123456', '/test-unit/')).toBe('/123456/test-unit');
  });

  it('returns /networkCode when adUnitPath is empty', () => {
    expect(buildGamAdUnitPath('123456', '')).toBe('/123456');
  });

  it('preserves inner slashes within adUnitPath', () => {
    expect(buildGamAdUnitPath('123456', 'parent/child')).toBe('/123456/parent/child');
  });
});

describe('buildTaglessRequestUrl', () => {
  it('starts with the GAM tagless base URL', () => {
    const url = buildTaglessRequestUrl(BASE_PARAMS);

    expect(url.startsWith('https://securepubads.g.doubleclick.net/gampad/adx?')).toBe(true);
  });

  it('includes the correctly decoded iu parameter', () => {
    const url = buildTaglessRequestUrl(BASE_PARAMS);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('iu')).toBe('/123456/test-unit');
  });

  it('includes the sz parameter in WIDTHxHEIGHT format', () => {
    const url = buildTaglessRequestUrl(BASE_PARAMS);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('sz')).toBe('300x250');
  });

  it('includes a numeric-only correlator in the c parameter', () => {
    const url = buildTaglessRequestUrl(BASE_PARAMS);

    expect(/[?&]c=\d+(&|$)/.test(url)).toBe(true);
  });

  it('includes tile=1', () => {
    const url = buildTaglessRequestUrl(BASE_PARAMS);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('tile')).toBe('1');
  });

  it('omits the t parameter when keyValues is empty', () => {
    const url = buildTaglessRequestUrl(BASE_PARAMS);

    expect(url).not.toContain('&t=');
  });

  it('applies the GAM double-encoding for the t parameter', () => {
    const url = buildTaglessRequestUrl({
      ...BASE_PARAMS,
      keyValues: [{ id: '1', key: 'env', value: 'stage' }],
    });

    // inner: "env=stage"  →  outer: encodeURIComponent("env=stage") = "env%3Dstage"
    expect(url).toContain('t=env%3Dstage');
  });

  it('joins multiple key-value pairs with & before the outer encode', () => {
    const url = buildTaglessRequestUrl({
      ...BASE_PARAMS,
      keyValues: [
        { id: '1', key: 'env', value: 'stage' },
        { id: '2', key: 'ver', value: '3' },
      ],
    });

    // inner: "env=stage&ver=3"  →  outer: "env%3Dstage%26ver%3D3"
    expect(url).toContain('t=env%3Dstage%26ver%3D3');
  });

  it('skips key-value entries with an empty key', () => {
    const url = buildTaglessRequestUrl({
      ...BASE_PARAMS,
      keyValues: [
        { id: '1', key: '', value: 'ignored' },
        { id: '2', key: 'valid', value: 'pair' },
      ],
    });

    expect(url).toContain('t=valid%3Dpair');
    expect(url).not.toContain('ignored');
  });
});

describe('fetchTaglessCreative', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns success with html when the response has content', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '<html>ad</html>',
    } as unknown as Response);

    const result = await fetchTaglessCreative(BASE_PARAMS);

    expect(result.success).toBe(true);
    expect(result.html).toBe('<html>ad</html>');
  });

  it('returns no-fill (success: false, html undefined) when response body is empty', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '',
    } as unknown as Response);

    const result = await fetchTaglessCreative(BASE_PARAMS);

    expect(result.success).toBe(false);
    expect(result.html).toBeUndefined();
    expect(result.message).toMatch(/no fill/i);
  });

  it('treats a whitespace-only response body as no-fill', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '   \n  ',
    } as unknown as Response);

    const result = await fetchTaglessCreative(BASE_PARAMS);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/no fill/i);
  });

  it('returns success: false with the error message on network failure', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

    const result = await fetchTaglessCreative(BASE_PARAMS);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Connection refused');
  });

  it('returns a generic message when the error is not an Error instance', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue('string error');

    const result = await fetchTaglessCreative(BASE_PARAMS);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Network request failed.');
  });
});
