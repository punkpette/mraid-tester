import * as Calendar from 'expo-calendar';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Linking } from 'react-native';

export interface NativeActionResult {
  success: boolean;
  message: string;
}

// MRAID's createCalendarEvent takes a JSON object with these spec-defined
// fields. Only the ones we actually act on are typed here; unsupported
// fields (recurrence, reminder, transparency) are accepted but ignored.
export interface MraidCalendarEventParams {
  description?: string;
  location?: string;
  start: string;
  end?: string;
  summary?: string;
}

async function downloadToCache(url: string): Promise<File> {
  const destination = new Directory(Paths.cache, 'mraid-tester');

  if (!destination.exists) {
    destination.create();
  }

  return File.downloadFileAsync(url, destination, { idempotent: true });
}

export async function storePicture(url: string): Promise<NativeActionResult> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();

    if (!permission.granted) {
      return { success: false, message: 'Media library permission denied.' };
    }

    const file = await downloadToCache(url);
    await MediaLibrary.saveToLibraryAsync(file.uri);

    const fileName = file.uri.split('/').pop() ?? 'image';

    return { success: true, message: `Image saved to camera roll: ${fileName}` };
  } catch (error) {
    return { success: false, message: `storePicture failed: ${String(error)}` };
  }
}

export async function createCalendarEvent(
  params: MraidCalendarEventParams,
): Promise<NativeActionResult> {
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();

    if (!permission.granted) {
      return { success: false, message: 'Calendar permission denied.' };
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writableCalendar = calendars.find((calendar) => calendar.allowsModifications);

    if (!writableCalendar) {
      return { success: false, message: 'No writable calendar found on this device.' };
    }

    const startDate = new Date(params.start);
    const endDate = params.end
      ? new Date(params.end)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    await Calendar.createEventAsync(writableCalendar.id, {
      title: params.summary ?? 'Ad Calendar Event',
      startDate,
      endDate,
      location: params.location,
      notes: params.description,
    });

    return { success: true, message: 'Calendar event created.' };
  } catch (error) {
    return { success: false, message: `createCalendarEvent failed: ${String(error)}` };
  }
}

export async function openUrl(url: string): Promise<NativeActionResult> {
  try {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      return { success: false, message: `No app available to open "${url}".` };
    }

    await Linking.openURL(url);

    return { success: true, message: `Opened "${url}".` };
  } catch (error) {
    return { success: false, message: `open failed: ${String(error)}` };
  }
}

// Single dispatcher used by AdSessionContext's onNativeAction callback.
// playVideo is intentionally not handled here — it doesn't call an
// external service, it triggers an in-app native video screen, which is
// wired directly in AdSessionContext instead.
export async function performNativeAction(
  method: string,
  args: unknown[],
): Promise<NativeActionResult> {
  if (method === 'storePicture') {
    return storePicture(String(args[0]));
  }

  if (method === 'createCalendarEvent') {
    return createCalendarEvent(args[0] as MraidCalendarEventParams);
  }

  if (method === 'open') {
    return openUrl(String(args[0]));
  }

  return { success: false, message: `No native handler implemented for "${method}".` };
}
