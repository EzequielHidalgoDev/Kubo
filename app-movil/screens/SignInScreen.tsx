import { useSignIn } from '@clerk/clerk-expo';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../theme';

type Props = {
  onIrARegistro: () => void;
};

export function SignInScreen({ onIrARegistro }: Props) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSignIn() {
    if (!isLoaded) return;
    setError('');
    setCargando(true);
    try {
      const intento = await signIn.create({ identifier: email, password });
      if (intento.status === 'complete') {
        await setActive({ session: intento.createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Kubo</Text>
        <Text style={styles.subtitle}>Entra para gestionar tu reparto mensual</Text>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error || undefined}
      />

      <Button label="Entrar" onPress={handleSignIn} loading={cargando} />
      <Button label="Crear cuenta" onPress={onIrARegistro} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
