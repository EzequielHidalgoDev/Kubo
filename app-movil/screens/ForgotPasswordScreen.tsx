import { useSignIn } from '@clerk/clerk-expo';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AuthHero } from '../components/AuthHero';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { traducirErrorClerk } from '../lib/traducirErrorClerk';
import { Colors, typography, useColors } from '../theme';

type Props = {
  onVolverALogin: () => void;
};

export function ForgotPasswordScreen({ onVolverALogin }: Props) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const colors = useColors();
  const styles = getStyles(colors);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleEnviarCodigo() {
    if (!isLoaded) return;
    setError('');
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }

    setCargando(true);
    try {
      const intento = await signIn.create({ identifier: email });
      const factorEmail = intento.supportedFirstFactors?.find(
        (f) => f.strategy === 'reset_password_email_code'
      );
      if (!factorEmail || !('emailAddressId' in factorEmail)) {
        throw new Error();
      }
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: factorEmail.emailAddressId,
      });
      setCodigoEnviado(true);
    } catch {
      setError('No encontramos ninguna cuenta con ese email');
    } finally {
      setCargando(false);
    }
  }

  async function handleCambiarPassword() {
    if (!isLoaded) return;
    setError('');
    if (!codigo.trim()) {
      setError('Introduce el código');
      return;
    }
    if (!nuevaPassword) {
      setError('Introduce una contraseña nueva');
      return;
    }
    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setCargando(true);
    try {
      const intento = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: codigo,
        password: nuevaPassword,
      });
      if (intento.status === 'complete') {
        await setActive({ session: intento.createdSessionId });
      }
    } catch (err: any) {
      setError(traducirErrorClerk(err, 'Código incorrecto'));
    } finally {
      setCargando(false);
    }
  }

  if (codigoEnviado) {
    return (
      <Screen>
        <AuthHero title="Nueva contraseña" />
        <Text style={styles.subtitle}>Te hemos mandado un código a {email}</Text>
        <TextField
          label="Código de verificación"
          value={codigo}
          onChangeText={setCodigo}
          keyboardType="number-pad"
        />
        <TextField
          label="Contraseña nueva"
          value={nuevaPassword}
          onChangeText={setNuevaPassword}
          secureTextEntry
          error={error || undefined}
          returnKeyType="go"
          onSubmitEditing={handleCambiarPassword}
        />
        <Button label="Cambiar contraseña" onPress={handleCambiarPassword} loading={cargando} />
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={() => {
            setCodigoEnviado(false);
            setCodigo('');
            setNuevaPassword('');
            setError('');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthHero title="Recuperar acceso" />
      <Text style={styles.subtitle}>
        Te mandamos un código a tu email para que puedas poner una contraseña nueva
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={handleEnviarCodigo}
      />
      <Button label="Enviar código" onPress={handleEnviarCodigo} loading={cargando} />
      <Button label="Volver a entrar" onPress={onVolverALogin} variant="secondary" />
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
