import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAdSession } from '@/mraid/AdSessionContext';

// Unlike expand(), playVideo() doesn't need to preserve any WebView JS
// state — it's just "play this URL fullscreen" — so a normal screen
// (mount/unmount is fine) is enough here, no overlay/portal trick needed.
export default function VideoPlayerScreen() {
  const { videoUrl, closeVideo } = useAdSession();
  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.play();
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      <Pressable style={styles.closeButton} onPress={closeVideo}>
        <Text style={styles.closeButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
