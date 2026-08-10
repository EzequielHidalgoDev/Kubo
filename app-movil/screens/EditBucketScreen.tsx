import { useAuth } from '@clerk/clerk-expo';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { TextField } from '../components/TextField';
import { Bucket, editarBucket } from '../lib/api';
import { parseEurosACentimos } from '../lib/money';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = {
  bucket: Bucket;
  onGuardado: () => void;
  onCancelar: () => void;
};

export function EditBucketScreen({ bucket, onGuardado, onCancelar }: Props) {
  const { getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  const [nombre, setNombre] = useState(bucket.name);
  const [strategy, setStrategy] = useState<'FIXED' | 'FILL_TO_TARGET' | 'DEBT'>(
    bucket.strategy === 'FILL_TO_TARGET' || bucket.strategy === 'DEBT' ? bucket.strategy : 'FIXED'
  );
  const importeActual = bucket.strategy === 'FIXED' ? bucket.fixed_amount_cents : bucket.target_cents;
  const [importe, setImporte] = useState(
    importeActual != null ? String(importeActual / 100).replace('.', ',') : ''
  );
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleGuardar() {
    setError('');
    if (!nombre.trim()) {
      setError('Ponle un nombre al bucket');
      return;
    }
    const centimos = parseEurosACentimos(importe);
    if (centimos === null || centimos <= 0) {
      setError(
        strategy === 'FIXED'
          ? 'Introduce un importe válido'
          : strategy === 'DEBT'
          ? 'Introduce el total de la deuda'
          : 'Introduce un objetivo válido'
      );
      return;
    }

    setCargando(true);
    try {
      const token = await getToken();
      await editarBucket(token, bucket.id, {
        name: nombre.trim(),
        strategy,
        priority: bucket.priority,
        ...(strategy === 'FIXED' ? { fixed_amount_cents: centimos } : { target_cents: centimos }),
      });
      onGuardado();
    } catch {
      setError('No se pudo guardar el cambio');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.titulo}>Editar bucket</Text>

      <TextField label="Nombre" value={nombre} onChangeText={setNombre} />

      <SegmentedControl
        valor={strategy}
        onCambiar={(v) => setStrategy(v as 'FIXED' | 'FILL_TO_TARGET' | 'DEBT')}
        opciones={[
          { value: 'FIXED', label: 'Importe fijo' },
          { value: 'FILL_TO_TARGET', label: 'Hasta un objetivo' },
          { value: 'DEBT', label: 'Deuda a pagar' },
        ]}
      />

      <TextField
        label={strategy === 'FIXED' ? 'Importe fijo (€)' : strategy === 'DEBT' ? 'Total de la deuda (€)' : 'Objetivo (€)'}
        value={importe}
        onChangeText={setImporte}
        keyboardType="decimal-pad"
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={handleGuardar}
      />

      <Button label="Guardar cambios" onPress={handleGuardar} loading={cargando} />
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
  });
}
