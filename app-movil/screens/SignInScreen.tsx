import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { makeRedirectUri } from 'expo-auth-session';
import { useState } from 'react';
import { Platform } from 'react-native';
import { AuthHero } from '../components/AuthHero';
import { Button } from '../components/Button';
import { Divider } from '../components/Divider';
import { GoogleButton } from '../components/GoogleButton';
import { LinkText } from '../components/LinkText';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { traducirErrorClerk } from '../lib/traducirErrorClerk';

type Props = {
  onIrARegistro: () => void;
  onOlvideContrasena: () => void;
};

export function SignInScreen({ onIrARegistro, onOlvideContrasena }: Props) {
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
      setError('Introduce tu email o nombre de usuario');
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
      setError(traducirErrorClerk(err, 'No se pudo iniciar sesión'));
    } finally {
      setCargando(false);
    }
  }

  async function handleGoogle() {
    setCargandoGoogle(true);
    try {
      // En web, useSSO() abre un popup (window.open) después de un await:
      // los navegadores lo bloquean por no considerarlo ya una respuesta
      // directa al clic, y no pasaba absolutamente nada, ni un error. En
      // vez de un popup, authenticateWithRedirect navega la página entera
      // a Google y vuelve; nunca lo bloquean. En nativo, useSSO() sigue
      // funcionando bien (ahí sí abre un navegador de verdad), así que
      // solo se usa la redirección completa en web.
      if (Platform.OS === 'web' && isLoaded) {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: window.location.href,
          redirectUrlComplete: window.location.href,
        });
        return; // la página navega fuera; no queda nada más que hacer aquí
      }
      const { createdSessionId, setActive: activarSesion } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: makeRedirectUri(),
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
      <AuthHero title="Entrar" />

      <GoogleButton onPress={handleGoogle} loading={cargandoGoogle} />
      <Divider />

      <TextField
        label="Email o usuario"
        value={email}
        onChangeText={setEmail}
        autoComplete="username"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={handleSignIn}
      />
      <LinkText label="¿Has olvidado tu contraseña?" onPress={onOlvideContrasena} />

      <Button label="Continuar" onPress={handleSignIn} loading={cargando} />
      <Button label="Crear cuenta" onPress={onIrARegistro} variant="secondary" />
    </Screen>
  );
}
