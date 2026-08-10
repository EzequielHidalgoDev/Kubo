import { useAuth } from '@clerk/clerk-expo';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Bucket, retirarDeBucket } from '../lib/api';
import { formatearCentimos, parseEurosACentimos } from '../lib/money';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = {
  bucket: Bucket;
  onRetirado: () => void;
  onCancelar: () => void;
};

export function RetirarScreen({ bucket, onRetirado, onCancelar }: Props) {
  const { getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  const [importe, setImporte] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleRetirar() {
    setError('');
    const centimos = parseEurosACentimos(importe);
    if (centimos === null || centimos <= 0) {
      setError('Introduce un importe válido');
      return;
    }
    if (centimos > bucket.balance_cents) {
      setError(`No puedes retirar más de ${formatearCentimos(bucket.balance_cents)}`);
      return;
    }

    setCargando(true);
    try {
      const token = await getToken();
      await retirarDeBucket(token, bucket.id, centimos);
      onRetirado();
    } catch {
      setError('No se pudo registrar el retiro');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.titulo}>Retirar de {bucket.name}</Text>
      <Text style={styles.subtitulo}>
        Para cuando has gastado de aquí de verdad. Tienes {formatearCentimos(bucket.balance_cents)}.
      </Text>

      <TextField
        label="Importe a retirar (€)"
        value={importe}
        onChangeText={setImporte}
        keyboardType="decimal-pad"
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={handleRetirar}
      />

      <Button label="Retirar" onPress={handleRetirar} loading={cargando} />
      <Button label="Cancelar" onPress={onCancelar} variant="secondary" />
    </Screen>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    titulo: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    subtitulo: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
  });
}
