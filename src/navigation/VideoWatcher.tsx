import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';

import { useAdSession } from '@/mraid/AdSessionContext';
import type { RootStackParamList } from './types';

// Same pattern as ExpandWatcher: MRAID state (here, videoUrl) drives
// React Navigation, not the other way around.
export function VideoWatcher() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { videoUrl } = useAdSession();
  const isVideoRouteActiveRef = useRef(false);

  useEffect(() => {
    const hasVideo = videoUrl !== null;

    if (hasVideo && !isVideoRouteActiveRef.current) {
      isVideoRouteActiveRef.current = true;
      navigation.navigate('VideoPlayer');

      return;
    }

    if (!hasVideo && isVideoRouteActiveRef.current) {
      isVideoRouteActiveRef.current = false;
      navigation.goBack();
    }
  }, [videoUrl, navigation]);

  return null;
}
