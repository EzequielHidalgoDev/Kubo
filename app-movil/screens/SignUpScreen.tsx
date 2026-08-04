import { useSignUp } from '@clerk/clerk-expo';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../theme';

type Props = {
  onVolverALogin: () => void;
};

export function SignUpScreen({ onVolverALogin }: Props) {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pendienteDeVerificar, setPendienteDeVerificar] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleCrearCuenta() {
    if (!isLoaded) return;
    setError('');
    setCargando(true);
    try {
      await signUp.create({ emailAddress: email, password });
      // Clerk manda un código por email; hasta que se verifica, la cuenta
      // no queda activa del todo.
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendienteDeVerificar(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setCargando(false);
    }
  }

  async function handleVerificarCodigo() {
    if (!isLoaded) return;
    setError('');
    setCargando(true);
    try {
      const intento = await signUp.attemptEmailAddressVerification({ code: codigo });
      if (intento.status === 'complete') {
        await setActive({ session: intento.createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Código incorrecto');
    } finally {
      setCargando(false);
    }
  }

  if (pendienteDeVerificar) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Revisa tu email</Text>
          <Text style={styles.subtitle}>Te hemos mandado un código a {email}</Text>
        </View>
        <TextField
          label="Código de verificación"
          value={codigo}
          onChangeText={setCodigo}
          keyboardType="number-pad"
          error={error || undefined}
        />
        <Button label="Confirmar" onPress={handleVerificarCodigo} loading={cargando} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Tu reparto mensual, siempre bajo control</Text>
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

      <Button label="Crear cuenta" onPress={handleCrearCuenta} loading={cargando} />
      <Button label="Ya tengo cuenta" onPress={onVolverALogin} variant="secondary" />
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
