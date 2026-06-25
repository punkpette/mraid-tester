# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# MRAID Tester — Project Context

Native iOS/Android app to test MRAID 2.0/3.0 rich media ad creatives. Built with
Expo SDK 56 (React Native 0.85, React 19) for Liliana and the team at Evolve Media LLC.

## Code Conventions (non-negotiable)

- Code and ALL comments in English, regardless of conversation language.
- No single-line `if` statements. Always use braces. `return` goes on its own
  line inside the block. Example:

```ts
if (condition) {
  return value;
}
```

- TypeScript strict mode. No `any` unless truly unavoidable.
- Run `npm run typecheck` and `npm run lint` before considering work done.
- Tests live next to the file they test (e.g. `validator.ts` /
  `validator.test.ts`), not in a separate `__tests__` folder.

## Architecture — read this before touching `src/mraid/` or `src/navigation/`

This app renders exactly ONE ad creative at a time. The trickiest constraint:
**the WebView hosting the creative must never remount** — expand()/resize()/
close() change its visual position/size, not its identity, or the creative
loses all JS state mid-session.

How this is solved:

- `src/mraid/AdSessionContext.tsx` — owns the single `MraidController` +
  WebView instance for the whole app (via `useMraidController`).
- `src/mraid/AdSessionOverlay.tsx` — renders that ONE WebView, mounted once
  in `App.tsx` as a sibling AFTER the navigator (so it paints on top). Its
  position is `absolute`, computed from MRAID state (inline slot rect vs.
  fullscreen vs. off-screen when hidden). It is NEVER conditionally
  unmounted — even when "hidden", it stays mounted at an off-screen rect.
- `src/navigation/ExpandWatcher.tsx` / `VideoWatcher.tsx` — watch MRAID
  state and push/pop transparent React Navigation routes in parallel, purely
  so the native back button and screen lifecycle work. These routes never
  render the WebView themselves.
- `src/mraid/MraidController.ts` — the single source of truth for MRAID
  state. Pure logic class, not React. The WebView is treated as a dumb
  mirror: it reports calls via `handleBridgeMessage`, the controller decides
  what changes, then pushes updates back down via `injectJavaScript`.
- `src/mraid/validator.ts` — pure function, validates spec compliance
  (call order, deprecated methods, etc.) before the controller applies side
  effects.

If you need to change ad size/placement at runtime, use
`MraidController.setAdSize()` / `setPlacementType()` — don't try to recreate
the controller, that would remount the WebView.

## Known gotchas (already hit these once, don't re-litigate)

- `@react-native-async-storage/async-storage` MUST stay on `2.2.0`. Version
  3.x breaks the Android build on Expo SDK 54+ (missing
  `org.asyncstorage.shared_storage:storage-android` artifact). Never let
  `npm update` bump this past 2.x.
- `expo-file-system` uses the NEW class-based API (`File`, `Directory`,
  `Paths`) since SDK 54. The old `FileSystem.downloadAsync()` /
  `FileSystem.cacheDirectory` style is gone. See `src/mraid/nativeActions.ts`
  for the current pattern.
- `pointerEvents` on a `View` must go inside `style={{ pointerEvents }}`, not
  as a standalone prop — the standalone prop is deprecated.
- `expo-video`'s `<VideoView>` does not have `allowsFullscreen` anymore (use
  `fullscreenOptions` if needed, but we don't need it since our video screen
  is already fullscreen via the navigator).
- React 19 deprecated `react-test-renderer` — use `@testing-library/react-native`
  for tests, not `react-test-renderer` directly.

## Where things live

- `src/mraid/` — the MRAID mock SDK itself (bridge script, controller,
  validator, native actions, ad session context/overlay).
- `src/navigation/` — React Navigation stack + the Expand/Video watchers.
- `src/screens/` — top-level screens (AdRenderer, Settings).
- `src/components/` — reusable UI (Status Panel, Call Log Panel, Ad Size
  Selector, Key-Value Editor).
- `src/config/` — Settings persistence (AsyncStorage) + the `useSettings` hook.
- `src/constants/` — colors, IAB ad size presets.
- `src/types/` — shared types not specific to one module (e.g. settings shape).

## Status

Core MRAID mock, UI panels, Settings, navigation/expand overlay, native
actions, and ad size selector are done. Mode A (GAM tagless + official SDK
render path) is in progress. Tests are being added incrementally — pure
logic (`validator.ts`, `MraidController.ts`) first.
