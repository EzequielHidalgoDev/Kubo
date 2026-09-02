import { useSignUp, useSSO } from '@clerk/clerk-expo';
import { makeRedirectUri } from 'expo-auth-session';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AuthHero } from '../components/AuthHero';
import { Button } from '../components/Button';
import { Divider } from '../components/Divider';
import { GoogleButton } from '../components/GoogleButton';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { traducirErrorClerk } from '../lib/traducirErrorClerk';
import { Colors, typography, useColors } from '../theme';

type Props = {
  onVolverALogin: () => void;
};

export function SignUpScreen({ onVolverALogin }: Props) {
  const { signUp, setActive, isLoaded } = useSignUp();
  const colors = useColors();
  const styles = getStyles(colors);
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pendienteDeVerificar, setPendienteDeVerificar] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  async function handleGoogle() {
    setCargandoGoogle(true);
    try {
      // Ver comentario equivalente en SignInScreen.tsx: sin redirectUrl,
      // el flujo de Google en web no sabía volver al propio sitio.
      const { createdSessionId, setActive: activarSesion } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: makeRedirectUri(),
      });
      if (createdSessionId && activarSesion) {
        await activarSesion({ session: createdSessionId });
      }
    } catch {
      setError('No se pudo continuar con Google');
    } finally {
      setCargandoGoogle(false);
    }
  }

  async function handleCrearCuenta() {
    if (!isLoaded) return;
    setError('');

    // Validamos nosotros antes de llamar a la API: evita un viaje de red
    // innecesario y controlamos el idioma del mensaje de error.
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }
    if (!username.trim()) {
      setError('Introduce un nombre de usuario');
      return;
    }
    if (!password) {
      setError('Introduce una contraseña');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setCargando(true);
    try {
      await signUp.create({ emailAddress: email, username, password });
      // Clerk manda un código por email; hasta que se verifica, la cuenta
      // no queda activa del todo.
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendienteDeVerificar(true);
    } catch (err: any) {
      setError(traducirErrorClerk(err, 'No se pudo crear la cuenta'));
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
      setError(traducirErrorClerk(err, 'Código incorrecto'));
    } finally {
      setCargando(false);
    }
  }

  if (pendienteDeVerificar) {
    return (
      <Screen>
        <AuthHero title="Revisa tu email" />
        <Text style={styles.subtitle}>Te hemos mandado un código a {email}</Text>
        <TextField
          label="Código de verificación"
          value={codigo}
          onChangeText={setCodigo}
          keyboardType="number-pad"
          error={error || undefined}
          returnKeyType="go"
          onSubmitEditing={handleVerificarCodigo}
        />
        <Button label="Confirmar" onPress={handleVerificarCodigo} loading={cargando} />
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={() => {
            setPendienteDeVerificar(false);
            setCodigo('');
            setError('');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthHero title="Crear cuenta" />

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
        label="Nombre de usuario"
        value={username}
        onChangeText={setUsername}
        autoComplete="username"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={handleCrearCuenta}
      />

      <Button label="Continuar" onPress={handleCrearCuenta} loading={cargando} />
      <Button label="Ya tengo cuenta" onPress={onVolverALogin} variant="secondary" />
    </Screen>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });
}
