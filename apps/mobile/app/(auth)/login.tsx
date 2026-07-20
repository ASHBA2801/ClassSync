import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Button, Card, Screen, TextInput, Title } from '@classsync/ui-mobile';
import { trpc } from '@/lib/trpc';
import { saveTokens } from '@/lib/auth-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    async onSuccess(data) {
      await saveTokens(data.accessToken, data.refreshToken);
      if (data.role === 'PARENT') {
        router.replace('/(app)/(parent)');
      } else {
        router.replace('/(app)/(teacher)');
      }
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <Title>ClassSync</Title>
        <Body>Sign in as teacher or parent</Body>
        <Card>
          <View style={{ gap: 12 }}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Body style={{ color: '#dc2626' }}>{error}</Body> : null}
            <Button
              label={login.isPending ? 'Signing in…' : 'Sign in'}
              disabled={login.isPending}
              onPress={() => {
                setError(null);
                login.mutate({ email, password });
              }}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
