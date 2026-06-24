import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.config.ts replaces the static app.json so we can register native
// config plugins (like Google Mobile Ads) and read EXPO_PUBLIC_* env vars
// at build time. Real secrets/values live in .env (gitignored);
// .env.example documents what's expected.

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: process.env.EXPO_PUBLIC_APP_NAME ?? 'MRAID Tester',
    slug: 'mraid-tester',
    scheme: 'mraid-tester',
    owner: 'punkpette',
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? 'com.evolvemedia.mraidtester',
      supportsTablet: true,
    },
    android: {
      ...config.android,
      package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? 'com.evolvemedia.mraidtester',
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'react-native-google-mobile-ads',
        {
          // These are the real Google-provided test App IDs by default.
          // Replace them via .env once you have production GAM App IDs.
          androidAppId:
            process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ??
            'ca-app-pub-3940256099942544~3347511713',
          iosAppId:
            process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511',
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission: 'Allow $(PRODUCT_NAME) to save images called via mraid.storePicture().',
          savePhotosPermission:
            'Allow $(PRODUCT_NAME) to save images called via mraid.storePicture().',
          isAccessMediaLocationEnabled: false,
        },
      ],
      [
        'expo-calendar',
        {
          calendarPermission:
            'Allow $(PRODUCT_NAME) to add events called via mraid.createCalendarEvent().',
        },
      ],
    ],
    extra: {
      ...config.extra,
      enableNativeActions: process.env.EXPO_PUBLIC_ENABLE_NATIVE_ACTIONS === 'true',
    },
  };
};
