import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth-storage';
import { trpc } from '@/lib/trpc';

export default function Index() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const me = trpc.auth.me.useQuery(undefined, { enabled: Boolean(token) });

  useEffect(() => {
    getAccessToken().then(setToken);
  }, []);

  if (token === undefined || (token && me.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!token || !me.data) {
    return <Redirect href="/(auth)/login" />;
  }

  if (me.data.role === 'PARENT') {
    return <Redirect href="/(app)/(parent)" />;
  }

  // ADMIN and TEACHER share teacher shell in the scaffold
  return <Redirect href="/(app)/(teacher)" />;
}
