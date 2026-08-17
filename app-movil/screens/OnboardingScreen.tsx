import { useAuth } from '@clerk/clerk-expo';
import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { LinkText } from '../components/LinkText';
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
  // Cuatro pasos cortos, uno por decisión: el ingreso va solo porque el
  // atajo 50/30/20 lo necesita para calcular algo (pedirlo en la misma
  // pantalla que gastos fijos/libre dejaba el atajo sin usar hasta que se
  // rellenaba el primer campo). Colchón y deuda también van cada uno en su
  // propio paso: son dos decisiones financieras distintas y quien no sabe
  // organizarse (el público al que apunta Kubo) no debería sopesarlas juntas.
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [ingreso, setIngreso] = useState('');
  const [gastosFijos, setGastosFijos] = useState('');
  const [libre, setLibre] = useState('');
  const [colchonAhorrado, setColchonAhorrado] = useState('');
  const [deuda, setDeuda] = useState('');
  const [sugerencia, setSugerencia] = useState<NuevoBucket[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  // Guarda aparte del estado: React no desactiva el botón al instante (el
  // re-render con loading=true tarda un frame), así que un doble toque
  // rápido podía disparar el bucle de creación dos veces y chocar con el
  // bucket que la primera pasada ya había creado.
  const creandoRef = useRef(false);

  // Regla 50/30/20: punto de partida para quien no sabe qué números poner.
  // Solo rellena gastos fijos (50%) y libre para gastar (30%): el 20%
  // restante no se pone a mano en ningún sitio, sale solo del resto de la
  // cascada (colchón, deuda, inversión) porque "Inversión" ya es REMAINDER
  // y se lleva lo que sobra. Rellena los campos, no crea los buckets: se
  // puede seguir ajustando a mano antes de continuar.
  function aplicarRegla503020() {
    const ingresoCents = parseEurosACentimos(ingreso);
    if (ingresoCents === null || ingresoCents <= 0) {
      setError('Introduce primero tu ingreso mensual');
      return;
    }
    setError('');
    const gastosSugeridosCents = Math.round(ingresoCents * 0.5);
    const libreSugeridoCents = Math.round(ingresoCents * 0.3);
    setGastosFijos(String(gastosSugeridosCents / 100).replace('.', ','));
    setLibre(String(libreSugeridoCents / 100).replace('.', ','));
  }

  function handleContinuarIngreso() {
    setError('');
    const ingresoCents = parseEurosACentimos(ingreso);
    if (ingresoCents === null || ingresoCents <= 0) {
      setError('Introduce tu ingreso mensual');
      return;
    }
    setPaso(2);
  }

  function handleContinuarGastosLibre() {
    setError('');
    const ingresoCents = parseEurosACentimos(ingreso)!;
    const gastosCents = parseEurosACentimos(gastosFijos);
    const libreCents = parseEurosACentimos(libre);
    if (gastosCents === null || gastosCents < 0) {
      setError('Introduce tus gastos fijos mensuales');
      return;
    }
    if (libreCents === null || libreCents < 0) {
      setError('Introduce cuánto quieres tener libre para gastar cada mes');
      return;
    }
    if (gastosCents + libreCents >= ingresoCents) {
      setError(
        'Con esos números no queda nada para colchón, deuda o inversión. Baja gastos fijos o libre para gastar.'
      );
      return;
    }
    setPaso(3);
  }

  function handleContinuarColchon() {
    setError('');
    const colchonCents = colchonAhorrado.trim() ? parseEurosACentimos(colchonAhorrado) : 0;
    if (colchonCents === null || colchonCents < 0) {
      setError('El colchón ya ahorrado no puede ser negativo');
      return;
    }
    setPaso(4);
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
    if (!sugerencia || creandoRef.current) return;
    creandoRef.current = true;
    setCargando(true);
    setError('');
    try {
      const token = await getToken();
      for (const bucket of sugerencia) {
        await crearBucket(token, bucket);
      }
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron crear tus buckets, inténtalo de nuevo');
    } finally {
      setCargando(false);
      creandoRef.current = false;
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

  // El colchón (paso 3) y la deuda (paso 4) se calculan a partir de "gastos
  // fijos", que quedó atrás en el paso 2: sin este resumen, decidir cuánto
  // colchón o deuda declarar significa fiarse de memoria de un número que
  // ya no se ve en pantalla.
  const resumenGastosLibre = `Gastos fijos: ${formatearCentimos(
    parseEurosACentimos(gastosFijos) ?? 0
  )} · Libre para gastar: ${formatearCentimos(parseEurosACentimos(libre) ?? 0)}`;

  if (paso === 4) {
    return (
      <Screen>
        <Text style={styles.paso}>Paso 4 de 4</Text>
        <Text style={styles.titulo}>¿Tienes deuda pendiente?</Text>
        <Text style={styles.subtitulo}>{resumenGastosLibre}</Text>

        <TextField
          label="Deuda pendiente (opcional)"
          value={deuda}
          onChangeText={setDeuda}
          keyboardType="decimal-pad"
          returnKeyType="go"
          onSubmitEditing={handleCalcular}
        />
        <Text style={styles.ayuda}>
          Tarjeta de crédito, préstamo... Si tienes, la ponemos por delante de la inversión: casi
          ninguna inversión rinde más que el interés de una deuda. Si no tienes, sigue adelante.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Calcular mi reparto" onPress={handleCalcular} />
        <Button label="Atrás" onPress={() => setPaso(3)} variant="secondary" />
      </Screen>
    );
  }

  if (paso === 3) {
    return (
      <Screen>
        <Text style={styles.paso}>Paso 3 de 4</Text>
        <Text style={styles.titulo}>¿Ya tienes colchón ahorrado?</Text>
        <Text style={styles.subtitulo}>{resumenGastosLibre}</Text>

        <TextField
          label="Colchón ya ahorrado (opcional)"
          value={colchonAhorrado}
          onChangeText={setColchonAhorrado}
          keyboardType="decimal-pad"
          returnKeyType="go"
          onSubmitEditing={handleContinuarColchon}
        />
        <Text style={styles.ayuda}>
          Si ya tienes algo apartado, cuéntanoslo. Así el resto empieza a invertirse ya. Si no
          tienes nada todavía, sigue adelante.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Continuar" onPress={handleContinuarColchon} />
        <Button label="Atrás" onPress={() => setPaso(2)} variant="secondary" />
      </Screen>
    );
  }

  if (paso === 2) {
    const resumenIngreso = `Ingreso: ${formatearCentimos(parseEurosACentimos(ingreso) ?? 0)}`;
    return (
      <Screen>
        <Text style={styles.paso}>Paso 2 de 4</Text>
        <Text style={styles.titulo}>Gastos fijos y libre para gastar</Text>
        <Text style={styles.subtitulo}>{resumenIngreso}</Text>

        <LinkText label="Rellenar con la regla 50/30/20" onPress={aplicarRegla503020} />
        <Text style={styles.ayuda}>
          50% a gastos fijos, 30% a libre para gastar. El 20% restante no hace falta ponerlo:
          va solo a colchón, deuda e inversión. Puedes ajustar los números después.
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
          onSubmitEditing={handleContinuarGastosLibre}
        />
        <Text style={styles.ayuda}>
          Salir, caprichos, ropa: lo que te gastas porque quieres. El resto se organiza solo.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Continuar" onPress={handleContinuarGastosLibre} />
        <Button label="Atrás" onPress={() => setPaso(1)} variant="secondary" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.paso}>Paso 1 de 4</Text>
      <Text style={styles.titulo}>Vamos a organizarte</Text>
      <Text style={styles.subtitulo}>Empecemos por lo esencial.</Text>

      <TextField
        label="Ingreso mensual (€)"
        value={ingreso}
        onChangeText={setIngreso}
        keyboardType="decimal-pad"
        returnKeyType="go"
        onSubmitEditing={handleContinuarIngreso}
      />
      <Text style={styles.ayuda}>
        Neto, lo que te llega de verdad a la cuenta. Si tienes más de una fuente (nómina,
        autónomo...), súmalas todas.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Continuar" onPress={handleContinuarIngreso} />
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
