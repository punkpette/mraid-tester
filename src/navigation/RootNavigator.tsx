import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdRendererScreen from '@/screens/AdRendererScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import ExpandScreen from './ExpandScreen';
import { ExpandWatcher } from './ExpandWatcher';
import VideoPlayerScreen from './VideoPlayerScreen';
import { VideoWatcher } from './VideoWatcher';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <ExpandWatcher />
      <VideoWatcher />
      <Stack.Navigator initialRouteName="AdRenderer">
        <Stack.Screen
          name="AdRenderer"
          component={AdRendererScreen}
          options={{ title: 'MRAID Tester' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="Expand"
          component={ExpandScreen}
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
            // The creative must call mraid.close() to leave the expanded
            // state; disabling the swipe-back/hardware-back gesture here
            // keeps React Navigation's route in sync with MraidController's
            // state instead of letting the user pop it independently.
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="VideoPlayer"
          component={VideoPlayerScreen}
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
