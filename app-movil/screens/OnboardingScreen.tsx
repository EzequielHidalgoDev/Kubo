import { useAuth } from '@clerk/clerk-expo';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { crearBucket, NuevoBucket } from '../lib/api';
import { formatearCentimos, parseEurosACentimos } from '../lib/money';
import { calcularSugerencia } from '../lib/sugerencia';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = {
  onListo: () => void;
};

export function OnboardingScreen({ onListo }: Props) {
  const { getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  // Dos pasos cortos en vez de 5 preguntas de golpe: menos que pensar a la
  // vez en la pantalla que más le cuesta a alguien que "no sabe
  // organizarse" (el público al que apunta Kubo).
  const [paso, setPaso] = useState<1 | 2>(1);
  const [ingreso, setIngreso] = useState('');
  const [gastosFijos, setGastosFijos] = useState('');
  const [libre, setLibre] = useState('');
  const [colchonAhorrado, setColchonAhorrado] = useState('');
  const [deuda, setDeuda] = useState('');
  const [sugerencia, setSugerencia] = useState<NuevoBucket[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function handleContinuar() {
    setError('');
    const ingresoCents = parseEurosACentimos(ingreso);
    const gastosCents = parseEurosACentimos(gastosFijos);
    const libreCents = parseEurosACentimos(libre);
    if (ingresoCents === null || ingresoCents <= 0) {
      setError('Introduce tu ingreso mensual');
      return;
    }
    if (gastosCents === null || gastosCents < 0) {
      setError('Introduce tus gastos fijos mensuales');
      return;
    }
    if (libreCents === null || libreCents < 0) {
      setError('Introduce cuánto quieres tener libre para gastar cada mes');
      return;
    }
    if (gastosCents + libreCents >= ingresoCents) {
      setError('Gastos fijos + libre para gastar no pueden ser iguales o más que tu ingreso');
      return;
    }
    setPaso(2);
  }

  function handleCalcular() {
    setError('');
    const gastosCents = parseEurosACentimos(gastosFijos)!;
    const libreCents = parseEurosACentimos(libre)!;
    // El colchón ya ahorrado y la deuda son opcionales: si se dejan
    // vacíos, se parte de 0 (sin deuda, sin colchón previo).
    const colchonCents = colchonAhorrado.trim() ? parseEurosACentimos(colchonAhorrado) : 0;
    const deudaCents = deuda.trim() ? parseEurosACentimos(deuda) : 0;
    if (colchonCents === null || colchonCents < 0) {
      setError('El colchón ya ahorrado no puede ser negativo');
      return;
    }
    if (deudaCents === null || deudaCents < 0) {
      setError('La deuda no puede ser negativa');
      return;
    }
    setSugerencia(calcularSugerencia(gastosCents, libreCents, colchonCents, deudaCents));
  }

  async function handleConfirmar() {
    if (!sugerencia) return;
    setCargando(true);
    setError('');
    try {
      const token = await getToken();
      for (const bucket of sugerencia) {
        await crearBucket(token, bucket);
      }
      Alert.alert('Ya estás organizado', 'Tus buckets están listos. Cuando metas tu ingreso en "Repartir", se reparte solo.', [
        { text: 'Entendido', onPress: onListo },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron crear tus buckets, inténtalo de nuevo');
    } finally {
      setCargando(false);
    }
  }

  if (sugerencia) {
    return (
      <Screen>
        <Text style={styles.titulo}>Esto te proponemos</Text>
        <Text style={styles.subtitulo}>
          Se aplicará cuando metas tu ingreso en "Repartir". Todavía no se ha movido nada.
          Puedes ajustarlo luego, bucket a bucket.
        </Text>

        {sugerencia.map((b) => (
          <Text key={b.id} style={styles.fila}>
            <Text style={styles.filaNombre}>{b.name}: </Text>
            {b.strategy === 'REMAINDER'
              ? 'todo lo que sobre cada mes'
              : b.strategy === 'DEBT'
              ? `${formatearCentimos(b.target_cents!)} de deuda total`
              : `${formatearCentimos((b.fixed_amount_cents ?? b.target_cents)!)}${
                  b.strategy === 'FILL_TO_TARGET' ? ' de objetivo' : '/mes'
                }`}
          </Text>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Crear mis buckets" onPress={handleConfirmar} loading={cargando} />
        <Button label="Volver a calcular" onPress={() => setSugerencia(null)} variant="secondary" />
      </Screen>
    );
  }

  if (paso === 2) {
    return (
      <Screen>
        <Text style={styles.paso}>Paso 2 de 2</Text>
        <Text style={styles.titulo}>Colchón y deuda</Text>
        <Text style={styles.subtitulo}>Los dos son opcionales. Si no tienes, sigue adelante.</Text>

        <TextField
          label="¿Cuánto tienes ya ahorrado en tu colchón? (opcional)"
          value={colchonAhorrado}
          onChangeText={setColchonAhorrado}
          keyboardType="decimal-pad"
        />
        <Text style={styles.ayuda}>
          Si ya tienes algo apartado, cuéntanoslo. Así el resto empieza a invertirse ya.
        </Text>
        <TextField
          label="¿Tienes deuda pendiente? (opcional)"
          value={deuda}
          onChangeText={setDeuda}
          keyboardType="decimal-pad"
          returnKeyType="go"
          onSubmitEditing={handleCalcular}
        />
        <Text style={styles.ayuda}>
          Tarjeta de crédito, préstamo... Si tienes, la ponemos por delante de la inversión: casi
          ninguna inversión rinde más que el interés de una deuda.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Calcular mi reparto" onPress={handleCalcular} />
        <Button label="Atrás" onPress={() => setPaso(1)} variant="secondary" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.paso}>Paso 1 de 2</Text>
      <Text style={styles.titulo}>Vamos a organizarte</Text>
      <Text style={styles.subtitulo}>Empecemos por lo esencial.</Text>

      <TextField
        label="Ingreso mensual (€)"
        value={ingreso}
        onChangeText={setIngreso}
        keyboardType="decimal-pad"
      />
      <Text style={styles.ayuda}>
        Neto, lo que te llega de verdad a la cuenta. Si tienes más de una fuente (nómina,
        autónomo...), súmalas todas.
      </Text>
      <TextField
        label="Gastos fijos mensuales (€)"
        value={gastosFijos}
        onChangeText={setGastosFijos}
        keyboardType="decimal-pad"
      />
      <Text style={styles.ayuda}>
        Todo lo que pagas sí o sí cada mes: alquiler, suscripciones, gimnasio, seguros...
      </Text>
      <TextField
        label="¿Cuánto quieres tener libre para gastar al mes (€)?"
        value={libre}
        onChangeText={setLibre}
        keyboardType="decimal-pad"
        returnKeyType="go"
        onSubmitEditing={handleContinuar}
      />
      <Text style={styles.ayuda}>
        Salir, caprichos, ropa: lo que te gastas porque quieres. El resto se organiza solo.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Continuar" onPress={handleContinuar} />
    </Screen>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    paso: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    titulo: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subtitulo: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
    fila: {
      ...typography.body,
      color: colors.textPrimary,
    },
    filaNombre: {
      ...typography.bodyMedium,
    },
    ayuda: {
      ...typography.caption,
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.textSecondary,
      opacity: 0.75,
      marginTop: -spacing.xs,
    },
    error: {
      ...typography.body,
      color: colors.error,
    },
  });
}
