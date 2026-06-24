# MRAID Tester

Native iOS/Android app for testing MRAID 2.0/3.0 rich media ad creatives — real
device actions, call log, and spec validation.

## Project Structure

```
src/
  screens/      # Top-level screens (Settings, CallLog, AdRenderer, etc.)
  navigation/   # react-navigation stack setup (native fullscreen overlay for expand())
  mraid/        # The MRAID SDK mock itself: bridge, spec validation, state machine
  components/   # Reusable UI building blocks shared across screens
  types/        # Shared TypeScript types (MRAID events, settings shape, etc.)
  config/       # Runtime config helpers (reads AsyncStorage settings)
  utils/        # Generic helpers with no MRAID-specific knowledge
  constants/    # IAB ad size presets, MRAID method/event name enums, etc.
```

## Setup

```bash
npm install
cp .env.example .env
npx expo prebuild
```

## Next Steps

1. `npx expo install react-native-google-mobile-ads`
2. Run `npx expo prebuild` to generate `ios/`/`android/` from the config plugins.
3. Open in Xcode / Android Studio (or `npx expo run:ios` / `npx expo run:android`).

See the project spec for full feature requirements (Mode A: GAM traffic, Mode B:
manual tag paste).
