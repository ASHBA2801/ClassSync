import { View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, Screen, Title } from '@classsync/ui-mobile';
import { trpc } from '@/lib/trpc';
import { clearTokens } from '@/lib/auth-storage';

export default function TeacherHome() {
  const ping = trpc.health.ping.useQuery();
  const me = trpc.auth.me.useQuery();

  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <Title>Teacher</Title>
        <Body>{me.data ? `${me.data.name} · ${me.data.role}` : 'Loading profile…'}</Body>
        <Card>
          <View style={{ gap: 8 }}>
            <Body style={{ fontWeight: '700', color: '#0f172a' }}>Health.ping</Body>
            {ping.isLoading ? <Body>Calling API…</Body> : null}
            {ping.error ? <Body style={{ color: '#dc2626' }}>{ping.error.message}</Body> : null}
            {ping.data ? (
              <>
                <Body>Timestamp: {ping.data.timestamp}</Body>
                <Body>Tenant count: {ping.data.tenantCount}</Body>
                <Body>Authenticated: {String(ping.data.authenticated)}</Body>
              </>
            ) : null}
          </View>
        </Card>
        <Button
          label="Sign out"
          onPress={async () => {
            await clearTokens();
            router.replace('/(auth)/login');
          }}
        />
      </View>
    </Screen>
  );
}
