// Use spyOn for Linking rather than replacing all of 'react-native' — a full
// module replacement would strip Platform and other objects that expo-modules-core
// reads during setup, causing the test suite to fail to load.
import * as MediaLibrary from 'expo-media-library';
import * as Calendar from 'expo-calendar';
import { Directory, File } from 'expo-file-system';
import { Linking } from 'react-native';

import { createCalendarEvent, openUrl, performNativeAction, storePicture } from './nativeActions';

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createEventAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
}));

jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: { downloadFileAsync: jest.fn() },
  Paths: { cache: '/mock-cache' },
}));

const mockRequestMediaPermissions = MediaLibrary.requestPermissionsAsync as jest.Mock;
const mockSaveToLibrary = MediaLibrary.saveToLibraryAsync as jest.Mock;
const mockRequestCalendarPermissions = Calendar.requestCalendarPermissionsAsync as jest.Mock;
const mockGetCalendars = Calendar.getCalendarsAsync as jest.Mock;
const mockCreateEvent = Calendar.createEventAsync as jest.Mock;
const MockDirectory = Directory as unknown as jest.Mock;
const mockDownloadFileAsync = File.downloadFileAsync as jest.Mock;

const MOCK_FILE = { uri: 'file:///cache/mraid-tester/photo.jpg' };
const WRITABLE_CALENDAR = { id: 'cal-1', allowsModifications: true };

let canOpenURLSpy: jest.SpyInstance;
let openURLSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();

  canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

  MockDirectory.mockImplementation(() => ({ exists: true, create: jest.fn() }));
  mockDownloadFileAsync.mockResolvedValue(MOCK_FILE);
  mockRequestMediaPermissions.mockResolvedValue({ granted: true });
  mockSaveToLibrary.mockResolvedValue(undefined);
  mockRequestCalendarPermissions.mockResolvedValue({ granted: true });
  mockGetCalendars.mockResolvedValue([WRITABLE_CALENDAR]);
  mockCreateEvent.mockResolvedValue('event-id-1');
});

afterEach(() => {
  canOpenURLSpy.mockRestore();
  openURLSpy.mockRestore();
});

describe('storePicture', () => {
  it('returns success false with message when media permission is denied', async () => {
    mockRequestMediaPermissions.mockResolvedValue({ granted: false });

    const result = await storePicture('https://example.com/img.jpg');

    expect(result.success).toBe(false);
    expect(result.message).toContain('permission denied');
    expect(mockSaveToLibrary).not.toHaveBeenCalled();
  });

  it('downloads and saves the file, returns success true with filename', async () => {
    const result = await storePicture('https://example.com/img.jpg');

    expect(mockDownloadFileAsync).toHaveBeenCalledWith(
      'https://example.com/img.jpg',
      expect.anything(),
      expect.objectContaining({ idempotent: true }),
    );
    expect(mockSaveToLibrary).toHaveBeenCalledWith(MOCK_FILE.uri);
    expect(result.success).toBe(true);
    expect(result.message).toContain('photo.jpg');
  });

  it('creates the cache directory when it does not exist', async () => {
    const mockCreate = jest.fn();
    MockDirectory.mockImplementation(() => ({ exists: false, create: mockCreate }));

    await storePicture('https://example.com/img.jpg');

    expect(mockCreate).toHaveBeenCalled();
  });

  it('returns success false and does not throw when download throws', async () => {
    mockDownloadFileAsync.mockRejectedValue(new Error('Network error'));

    const result = await storePicture('https://example.com/img.jpg');

    expect(result.success).toBe(false);
    expect(result.message).toContain('storePicture failed');
  });
});

describe('createCalendarEvent', () => {
  it('returns success false when calendar permission is denied', async () => {
    mockRequestCalendarPermissions.mockResolvedValue({ granted: false });

    const result = await createCalendarEvent({ start: '2024-06-01T10:00:00Z' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('permission denied');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('returns success false when no writable calendar exists', async () => {
    mockGetCalendars.mockResolvedValue([{ id: 'cal-read', allowsModifications: false }]);

    const result = await createCalendarEvent({ start: '2024-06-01T10:00:00Z' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('No writable calendar');
  });

  it('creates the event with correct fields when all params are provided', async () => {
    await createCalendarEvent({
      start: '2024-06-01T10:00:00Z',
      end: '2024-06-01T11:30:00Z',
      summary: 'Test Event',
      location: 'Conference Room',
      description: 'Details here',
    });

    expect(mockCreateEvent).toHaveBeenCalledWith(
      WRITABLE_CALENDAR.id,
      expect.objectContaining({
        title: 'Test Event',
        startDate: new Date('2024-06-01T10:00:00Z'),
        endDate: new Date('2024-06-01T11:30:00Z'),
        location: 'Conference Room',
        notes: 'Details here',
      }),
    );
  });

  it('calculates endDate as start + 1 hour when params.end is omitted', async () => {
    const startDate = new Date('2024-06-01T10:00:00Z');

    await createCalendarEvent({ start: '2024-06-01T10:00:00Z' });

    const [, eventArgs] = mockCreateEvent.mock.calls[0] as [string, { endDate: Date }];
    expect(eventArgs.endDate).toEqual(new Date(startDate.getTime() + 60 * 60 * 1000));
  });

  it('returns success true when the event is created', async () => {
    const result = await createCalendarEvent({ start: '2024-06-01T10:00:00Z' });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Calendar event created');
  });
});

describe('openUrl', () => {
  it('returns success false without calling openURL when canOpenURL is false', async () => {
    canOpenURLSpy.mockResolvedValue(false);

    const result = await openUrl('myapp://deep-link');

    expect(openURLSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.message).toContain('No app available');
  });

  it('calls openURL and returns success true when canOpenURL is true', async () => {
    const result = await openUrl('https://example.com');

    expect(openURLSpy).toHaveBeenCalledWith('https://example.com');
    expect(result.success).toBe(true);
    expect(result.message).toContain('https://example.com');
  });

  it('returns success false and does not throw when openURL throws', async () => {
    openURLSpy.mockRejectedValue(new Error('Cannot open'));

    const result = await openUrl('https://example.com');

    expect(result.success).toBe(false);
    expect(result.message).toContain('open failed');
  });
});

describe('performNativeAction', () => {
  it('dispatches to storePicture for method "storePicture"', async () => {
    const result = await performNativeAction('storePicture', ['https://example.com/img.jpg']);

    expect(result.success).toBe(true);
  });

  it('dispatches to openUrl for method "open"', async () => {
    const result = await performNativeAction('open', ['https://example.com']);

    expect(openURLSpy).toHaveBeenCalledWith('https://example.com');
    expect(result.success).toBe(true);
  });

  it('dispatches to createCalendarEvent for method "createCalendarEvent"', async () => {
    const result = await performNativeAction('createCalendarEvent', [
      { start: '2024-06-01T10:00:00Z' },
    ]);

    expect(mockCreateEvent).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('returns success false for an unknown method', async () => {
    const result = await performNativeAction('unknownMethod', []);

    expect(result.success).toBe(false);
    expect(result.message).toContain('unknownMethod');
  });
});
