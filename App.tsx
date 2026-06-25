import { useEffect } from 'react';
import mobileAds from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdSessionProvider } from '@/mraid/AdSessionContext';
import { AdSessionOverlay } from '@/mraid/AdSessionOverlay';
import { RootNavigator } from '@/navigation/RootNavigator';

// Render order matters here: AdSessionOverlay is mounted AFTER RootNavigator
// as a sibling, so it visually paints on top of whatever screen is active —
// including the transparent Expand route — without ever living inside the
// navigator's own component tree.
export default function App() {
  useEffect(() => {
    mobileAds()
      .initialize()
      .catch((error: unknown) => {
        console.warn('Google Mobile Ads SDK initialization failed:', error);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <AdSessionProvider>
        <RootNavigator />
        <AdSessionOverlay />
      </AdSessionProvider>
    </SafeAreaProvider>
  );
}
