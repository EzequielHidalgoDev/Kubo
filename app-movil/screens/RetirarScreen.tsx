import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Bucket } from '../lib/api';
import { formatearCentimos, parseEurosACentimos } from '../lib/money';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = {
  bucket: Bucket;
  // No llama a la API directamente: HomeScreen decide cuándo retirar de
  // verdad, para poder ofrecer un "deshacer" antes de que la llamada salga.
  onConfirmar: (centimos: number) => void;
  onCancelar: () => void;
};

export function RetirarScreen({ bucket, onConfirmar, onCancelar }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [importe, setImporte] = useState('');
  const [error, setError] = useState('');

  function handleRetirar() {
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
    onConfirmar(centimos);
  }

  return (
    <Screen>
      <Text style={styles.titulo}>Retirar de {bucket.name}</Text>
      <Text style={styles.subtitulo}>
        {bucket.strategy === 'REMAINDER'
          ? // Inversión no se "gasta": este dinero ya cumplió su función en
            // Kubo y toca moverlo a donde inviertas de verdad.
            `Para cuando lo mueves a donde inviertas de verdad. Tienes ${formatearCentimos(bucket.balance_cents)}.`
          : `Para cuando has gastado de aquí de verdad. Tienes ${formatearCentimos(bucket.balance_cents)}.`}
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

      <Button label="Retirar" onPress={handleRetirar} />
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
