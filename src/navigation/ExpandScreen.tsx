import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// Transparent placeholder screen. It exists purely so React Navigation
// manages the native back button and screen lifecycle while MRAID is in
// the "expanded" state. The actual WebView is never rendered here — it
// lives in AdSessionOverlay at the app root, which paints on top of
// whatever this screen would otherwise show.
//
// TODO: once useCustomClose(false) is the active mode, render a default
// close button here (top-right "X") that calls the same logic the
// MraidController uses for close(), since the creative isn't required to
// provide its own in that case.
export default function ExpandScreen() {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
