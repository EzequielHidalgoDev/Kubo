import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { useState } from 'react';
import { AuthHero } from '../components/AuthHero';
import { Button } from '../components/Button';
import { Divider } from '../components/Divider';
import { GoogleButton } from '../components/GoogleButton';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';

type Props = {
  onIrARegistro: () => void;
};

export function SignInScreen({ onIrARegistro }: Props) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  async function handleSignIn() {
    if (!isLoaded) return;
    setError('');

    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }
    if (!password) {
      setError('Introduce tu contraseña');
      return;
    }

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

  async function handleGoogle() {
    setCargandoGoogle(true);
    try {
      const { createdSessionId, setActive: activarSesion } = await startSSOFlow({
        strategy: 'oauth_google',
      });
      if (createdSessionId && activarSesion) {
        await activarSesion({ session: createdSessionId });
      }
    } catch {
      setError('No se pudo iniciar sesión con Google');
    } finally {
      setCargandoGoogle(false);
    }
  }

  return (
    <Screen>
      <AuthHero />

      <GoogleButton onPress={handleGoogle} loading={cargandoGoogle} />
      <Divider />

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
