import { useAuth } from '@clerk/clerk-expo';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { TextField } from '../components/TextField';
import { crearBucket } from '../lib/api';
import { parseEurosACentimos } from '../lib/money';
import { slugify } from '../lib/text';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = {
  siguientePrioridad: number;
  onCreado: (nombre: string) => void;
  onCancelar: () => void;
};

export function CreateBucketScreen({ siguientePrioridad, onCreado, onCancelar }: Props) {
  const { getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  const [nombre, setNombre] = useState('');
  const [strategy, setStrategy] = useState<'FIXED' | 'FILL_TO_TARGET' | 'DEBT'>('FIXED');
  const [importe, setImporte] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [topeMensual, setTopeMensual] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleCrear() {
    setError('');
    if (!nombre.trim()) {
      setError('Ponle un nombre al bucket');
      return;
    }
    if (!slugify(nombre)) {
      // Un nombre hecho solo de emoji o símbolos no deja ninguna letra ni
      // número: el identificador interno saldría vacío.
      setError('El nombre tiene que incluir alguna letra o número');
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
    // El saldo inicial es opcional: si lo dejas vacío, se ignora sin error.
    const saldoCentimos = saldoInicial.trim() ? parseEurosACentimos(saldoInicial) : 0;
    if (saldoCentimos === null || saldoCentimos < 0) {
      setError('El saldo inicial no es válido');
      return;
    }
    // El tope mensual también es opcional, y solo tiene sentido fuera de
    // "Importe fijo" (ver motor/models.py: monthly_cap_cents solo aplica a
    // FILL_TO_TARGET/DEBT).
    const topeMensualCentimos =
      strategy !== 'FIXED' && topeMensual.trim() ? parseEurosACentimos(topeMensual) : null;
    if (topeMensual.trim() && (topeMensualCentimos === null || topeMensualCentimos <= 0)) {
      setError('El tope mensual no es válido');
      return;
    }

    setCargando(true);
    try {
      const token = await getToken();
      await crearBucket(token, {
        id: slugify(nombre),
        name: nombre.trim(),
        strategy,
        priority: siguientePrioridad,
        initial_balance_cents: saldoCentimos,
        ...(strategy === 'FIXED' ? { fixed_amount_cents: centimos } : { target_cents: centimos }),
        ...(topeMensualCentimos ? { monthly_cap_cents: topeMensualCentimos } : {}),
      });
      onCreado(nombre.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el bucket');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.titulo}>Nuevo bucket</Text>

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
      <Text style={styles.ayuda}>
        {strategy === 'FIXED'
          ? 'Se le asigna siempre la misma cantidad cada mes (ej. alquiler).'
          : strategy === 'DEBT'
          ? 'Se le va destinando dinero hasta saldarla del todo (ej. tarjeta de crédito).'
          : 'Se le va rellenando hasta llegar al objetivo, y luego para (ej. colchón de emergencia).'}
      </Text>

      <TextField
        label={strategy === 'FIXED' ? 'Importe fijo (€)' : strategy === 'DEBT' ? 'Total de la deuda (€)' : 'Objetivo (€)'}
        value={importe}
        onChangeText={setImporte}
        keyboardType="decimal-pad"
        error={error || undefined}
      />

      <TextField
        label={strategy === 'DEBT' ? '¿Ya has pagado algo de esta deuda? (opcional)' : '¿Ya tienes algo ahorrado? (opcional)'}
        value={saldoInicial}
        onChangeText={setSaldoInicial}
        keyboardType="decimal-pad"
        returnKeyType={strategy === 'FIXED' ? 'go' : 'next'}
        onSubmitEditing={strategy === 'FIXED' ? handleCrear : undefined}
      />

      {strategy !== 'FIXED' && (
        <>
          <TextField
            label="Tope al mes (opcional)"
            value={topeMensual}
            onChangeText={setTopeMensual}
            keyboardType="decimal-pad"
            returnKeyType="go"
            onSubmitEditing={handleCrear}
          />
          <Text style={styles.ayuda}>
            Como mucho recibe esto cada mes, aunque el ingreso dé para más. Sin tope, se lleva
            todo lo que le falte de golpe en cuanto haya dinero suficiente.
          </Text>
        </>
      )}

      <Button label="Crear bucket" onPress={handleCrear} loading={cargando} />
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
    ayuda: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
  });
}
