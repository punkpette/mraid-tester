import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';

import { MraidState } from '@/mraid';
import { useAdSession } from '@/mraid/AdSessionContext';
import type { RootStackParamList } from './types';

// Bridges MRAID state to React Navigation: when the creative calls
// expand(), push the transparent Expand route so the OS back button and
// screen lifecycle behave natively. When it calls close() (state goes back
// to "default"), pop it. Rendered once, inside NavigationContainer, and
// renders nothing itself.
export function ExpandWatcher() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state } = useAdSession();
  const isExpandRouteActiveRef = useRef(false);

  useEffect(() => {
    const isExpanded = state.state === MraidState.Expanded;

    if (isExpanded && !isExpandRouteActiveRef.current) {
      isExpandRouteActiveRef.current = true;
      navigation.navigate('Expand');

      return;
    }

    if (!isExpanded && isExpandRouteActiveRef.current) {
      isExpandRouteActiveRef.current = false;
      navigation.goBack();
    }
  }, [state.state, navigation]);

  return null;
}
