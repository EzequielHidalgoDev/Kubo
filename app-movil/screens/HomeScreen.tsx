import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { BucketCard } from '../components/BucketCard';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  Bucket,
  borrarBucket,
  CambiosBucket,
  editarBucket,
  ejecutarReparto,
  listarBuckets,
  obtenerHistorial,
  obtenerUltimoReparto,
} from '../lib/api';
import { fusionarColchon } from '../lib/buckets';
import { parseEurosACentimos } from '../lib/money';
import { esDelMesActual, mesActual, primerDiaProximoMes } from '../lib/text';
import { Colors, radius, spacing, typography, useColors } from '../theme';
import { CreateBucketScreen } from './CreateBucketScreen';
import { EditBucketScreen } from './EditBucketScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { RetirarScreen } from './RetirarScreen';

// El backend ordena por prioridad de reparto, pero "Libre para gastar"
// comparte prioridad con "Gastos fijos" (los dos van garantizados) y aun
// así queremos que se muestre el último en la lista, como premio tras
// cubrir lo importante. Los buckets que no son de la lista base mantienen
// su orden por prioridad, como antes.
const ORDEN_VISUAL: Record<string, number> = {
  gastos_fijos: 0,
  colchon: 1, // colchón único (sin deuda) y colchón mínimo (con deuda) van en el mismo hueco
  colchon_minimo: 1,
  deuda: 2,
  colchon_resto: 3,
  inversion: 4,
  libre: 5,
};

function ordenarParaMostrar(buckets: Bucket[]): Bucket[] {
  return [...buckets].sort((a, b) => {
    const ordenA = ORDEN_VISUAL[a.id] ?? a.priority + 10;
    const ordenB = ORDEN_VISUAL[b.id] ?? b.priority + 10;
    return ordenA - ordenB;
  });
}

// Reconstruye el payload completo que espera PUT /buckets/{id} a partir de
// un bucket ya cargado, cambiando solo la prioridad.
function construirCambiosConPrioridad(bucket: Bucket, priority: number): CambiosBucket {
  const base = { name: bucket.name, strategy: bucket.strategy, priority };
  if (bucket.strategy === 'FIXED') {
    return { ...base, fixed_amount_cents: bucket.fixed_amount_cents ?? undefined };
  }
  if (bucket.strategy === 'FILL_TO_TARGET' || bucket.strategy === 'DEBT') {
    return { ...base, target_cents: bucket.target_cents ?? undefined };
  }
  return base; // REMAINDER: sin importe fijo ni objetivo
}

export function HomeScreen() {
  const { getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [yaCargado, setYaCargado] = useState(false);
  const [error, setError] = useState('');
  const [creandoBucket, setCreandoBucket] = useState(false);
  const [editandoBucket, setEditandoBucket] = useState<Bucket | null>(null);
  const [retirandoDeBucket, setRetirandoDeBucket] = useState<Bucket | null>(null);

  const [ingreso, setIngreso] = useState('');
  const [errorReparto, setErrorReparto] = useState('');
  const [repartiendo, setRepartiendo] = useState(false);
  // null mientras no sabemos todavía si ya se repartió este mes (evita el
  // parpadeo de mostrar el formulario y luego bloquearlo de golpe).
  const [repartidoEsteMes, setRepartidoEsteMes] = useState<boolean | null>(null);

  // Cada 3 meses de uso, se avisa una vez para que revises si tus gastos
  // fijos y tu deuda siguen siendo correctos (el colchón depende de esa
  // cifra, y casi nadie la actualiza sola). Se puede descartar por hoy.
  const [mesesUsados, setMesesUsados] = useState(0);
  const [revisionDescartada, setRevisionDescartada] = useState(false);
  const mostrarRevision = mesesUsados > 0 && mesesUsados % 3 === 0 && !revisionDescartada;

  const cargarBuckets = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      const datos = await listarBuckets(token);
      setBuckets(datos);
    } catch (err) {
      console.error('Error al cargar buckets:', err);
      setError('No se pudieron cargar tus buckets');
    } finally {
      setCargando(false);
      setYaCargado(true);
    }
  }, [getToken]);

  const cargarUltimoReparto = useCallback(async () => {
    try {
      const token = await getToken();
      const { realizado_en } = await obtenerUltimoReparto(token);
      setRepartidoEsteMes(realizado_en !== null && esDelMesActual(new Date(realizado_en)));
    } catch (err) {
      console.error('Error al comprobar el último reparto:', err);
      setRepartidoEsteMes(false);
    }
  }, [getToken]);

  const cargarMesesUsados = useCallback(async () => {
    try {
      const token = await getToken();
      const historial = await obtenerHistorial(token);
      setMesesUsados(historial.length);
    } catch (err) {
      console.error('Error al comprobar los meses de uso:', err);
    }
  }, [getToken]);

  useEffect(() => {
    cargarBuckets();
    cargarUltimoReparto();
    cargarMesesUsados();
  }, [cargarBuckets, cargarUltimoReparto, cargarMesesUsados]);

  function handleBorrar(bucket: Bucket) {
    Alert.alert(
      `¿Borrar "${bucket.name}"?`,
      'No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => confirmarBorrado(bucket.id) },
      ]
    );
  }

  async function confirmarBorrado(id: string) {
    try {
      const token = await getToken();
      await borrarBucket(token, id);
      await cargarBuckets();
    } catch {
      setError('No se pudo borrar el bucket (¿tiene ya movimientos?)');
    }
  }

  // Intercambia la prioridad de dos buckets, para que el usuario pueda
  // decidir "esta deuda antes que ese objetivo" desde la app — la cascada
  // de reparto ya lo soportaba, pero no había forma de tocarla desde aquí.
  async function handleReordenar(bucket: Bucket, otro: Bucket) {
    try {
      const token = await getToken();
      await editarBucket(token, bucket.id, construirCambiosConPrioridad(bucket, otro.priority));
      await editarBucket(token, otro.id, construirCambiosConPrioridad(otro, bucket.priority));
      await cargarBuckets();
    } catch {
      setError('No se pudo cambiar el orden');
    }
  }

  async function handleRepartir() {
    setErrorReparto('');
    const centimos = parseEurosACentimos(ingreso);
    if (centimos === null || centimos <= 0) {
      setErrorReparto('Introduce un ingreso válido');
      return;
    }

    setRepartiendo(true);
    try {
      const token = await getToken();
      await ejecutarReparto(token, centimos);
      setIngreso('');
      setRepartidoEsteMes(true); // bloquea el formulario hasta el mes que viene
      await cargarBuckets(); // los saldos de las tarjetas de abajo se actualizan solos
    } catch {
      setErrorReparto('No se pudo calcular el reparto');
    } finally {
      setRepartiendo(false);
    }
  }

  if (creandoBucket) {
    return (
      <CreateBucketScreen
        siguientePrioridad={buckets.length + 1}
        onCreado={() => {
          setCreandoBucket(false);
          cargarBuckets();
        }}
        onCancelar={() => setCreandoBucket(false)}
      />
    );
  }

  if (editandoBucket) {
    return (
      <EditBucketScreen
        bucket={editandoBucket}
        onGuardado={() => {
          setEditandoBucket(null);
          cargarBuckets();
        }}
        onCancelar={() => setEditandoBucket(null)}
      />
    );
  }

  if (retirandoDeBucket) {
    return (
      <RetirarScreen
        bucket={retirandoDeBucket}
        onRetirado={() => {
          setRetirandoDeBucket(null);
          cargarBuckets();
        }}
        onCancelar={() => setRetirandoDeBucket(null)}
      />
    );
  }

  // Primera vez del usuario: en vez de crear buckets a ciegas, le
  // preguntamos su ingreso y gastos fijos para sugerirle un reparto real.
  if (yaCargado && !cargando && buckets.length === 0 && !error) {
    return <OnboardingScreen onListo={cargarBuckets} />;
  }

  // Dos grupos, no un destacado de color: "Este mes" son los importes que
  // se resetean cada mes (FIXED); "Ahorro e inversión" es lo que se
  // acumula con el tiempo. Es la misma distinción real que ya se aplica
  // al saldo mostrado en cada bucket (ver get_balances_mes_actual).
  const esteMes = ordenarParaMostrar(buckets.filter((b) => b.strategy === 'FIXED'));
  const ahorroInversion = ordenarParaMostrar(
    fusionarColchon(buckets.filter((b) => b.strategy !== 'FIXED'))
  );
  // La tarjeta fusionada no corresponde a ningún bucket real de la base de
  // datos (identidad de objeto distinta a todo lo que hay en `buckets`),
  // así que no se le pasan acciones de editar/borrar/retirar.
  const colchonFusionado = ahorroInversion.find((b) => !buckets.includes(b)) ?? null;

  return (
    <Screen>
      <View style={styles.tarjetaReparto}>
        <Text style={styles.tituloReparto}>Ingreso de {mesActual()}</Text>
        {repartidoEsteMes ? (
          <>
            <Text style={styles.subtituloReparto}>
              Ya repartiste el ingreso de este mes.
            </Text>
            <Text style={styles.subtituloReparto}>
              Podrás volver a hacerlo el {primerDiaProximoMes()}.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.subtituloReparto}>
              Mételo aquí y se reparte solo entre los buckets de abajo.
            </Text>
            <TextField
              label="Ingreso (€)"
              value={ingreso}
              onChangeText={setIngreso}
              keyboardType="decimal-pad"
              error={errorReparto || undefined}
              returnKeyType="go"
              onSubmitEditing={handleRepartir}
            />
            <Button label="Repartir" onPress={handleRepartir} loading={repartiendo} />
          </>
        )}
      </View>

      {mostrarRevision && (
        <View style={styles.tarjetaRevision}>
          <Text style={styles.tituloRevision}>Llevas {mesesUsados} meses con Kubo</Text>
          <Text style={styles.subtituloReparto}>
            ¿Siguen siendo correctos tus gastos fijos y tu deuda? El colchón se calcula a partir
            de esa cifra. Edítalos abajo si algo ha cambiado.
          </Text>
          <Button
            label="Entendido"
            onPress={() => setRevisionDescartada(true)}
            variant="secondary"
          />
        </View>
      )}

      <View style={styles.filaTitulo}>
        <Text style={styles.titulo}>Tus buckets</Text>
        <Button label="+ Añadir" onPress={() => setCreandoBucket(true)} variant="secondary" />
      </View>

      {cargando && <ActivityIndicator color={colors.textPrimary} />}

      {!cargando && error ? <Text style={styles.error}>{error}</Text> : null}

      {!cargando && !error && buckets.length === 0 && (
        <Text style={styles.vacio}>
          Todavía no tienes ningún bucket. Pulsa "+ Añadir" para crear el primero.
        </Text>
      )}

      {!cargando && !error && esteMes.length > 0 && (
        <View style={styles.grupo}>
          <Text style={styles.tituloGrupo}>Este mes</Text>
          {esteMes.map((item) => (
            <BucketCard
              key={item.id}
              bucket={item}
              onEditar={() => setEditandoBucket(item)}
              onBorrar={() => handleBorrar(item)}
              onRetirar={() => setRetirandoDeBucket(item)}
            />
          ))}
        </View>
      )}

      {!cargando && !error && ahorroInversion.length > 0 && (
        <View style={styles.grupo}>
          <Text style={styles.tituloGrupo}>Ahorro e inversión</Text>
          {ahorroInversion.map((item, index) => {
            const anterior = ahorroInversion[index - 1];
            const siguiente = ahorroInversion[index + 1];
            // No se puede reordenar contra la tarjeta fusionada: no es un
            // único bucket con una sola prioridad que intercambiar.
            const puedeSubir = anterior && anterior !== colchonFusionado && item !== colchonFusionado;
            const puedeBajar = siguiente && siguiente !== colchonFusionado && item !== colchonFusionado;

            return item === colchonFusionado ? (
              // Tarjeta fusionada, solo lectura: no corresponde a un único
              // bucket real, así que no tiene acciones de editar/borrar.
              <BucketCard key={item.id} bucket={item} orden={index + 1} />
            ) : (
              <BucketCard
                key={item.id}
                bucket={item}
                orden={index + 1}
                onEditar={() => setEditandoBucket(item)}
                onBorrar={() => handleBorrar(item)}
                onRetirar={() => setRetirandoDeBucket(item)}
                onSubir={puedeSubir ? () => handleReordenar(item, anterior) : undefined}
                onBajar={puedeBajar ? () => handleReordenar(item, siguiente) : undefined}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    tarjetaReparto: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tituloReparto: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subtituloReparto: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
    tarjetaRevision: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tituloRevision: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    filaTitulo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    titulo: {
      ...typography.title,
      color: colors.textPrimary,
    },
    grupo: {
      gap: spacing.sm,
    },
    tituloGrupo: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      fontSize: 12,
      letterSpacing: 0.5,
    },
    error: {
      ...typography.body,
      color: colors.error,
    },
    vacio: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });
}
