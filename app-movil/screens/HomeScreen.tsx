import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BucketCard } from '../components/BucketCard';
import { Button } from '../components/Button';
import { LinkText } from '../components/LinkText';
import { Screen } from '../components/Screen';
import { Snackbar } from '../components/Snackbar';
import { TextField } from '../components/TextField';
import {
  Bucket,
  borrarBucket,
  CambiosBucket,
  editarBucket,
  ejecutarReparto,
  HistorialMes,
  listarBuckets,
  obtenerHistorial,
  obtenerUltimoReparto,
  retirarDeBucket,
} from '../lib/api';
import { fusionarColchon } from '../lib/buckets';
import { formatearCentimos, parseEurosACentimos } from '../lib/money';
import { esDelMesActual, mesActual, primerDiaProximoMes } from '../lib/text';
import { Colors, radius, spacing, typography, useColors } from '../theme';
import { AyudaScreen } from './AyudaScreen';
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

// Borrar un bucket o retirar dinero ya no pide confirmación previa: la
// acción se aplica ya (optimista, en la lista local) y solo llega a la API
// pasados unos segundos, dando tiempo real a deshacerla — más rápido para
// quien no se equivoca, sin perder la red de seguridad de quien sí.
type AccionPendiente =
  | { tipo: 'borrar'; bucket: Bucket }
  | { tipo: 'retirar'; bucket: Bucket; centimos: number };

// 4s se quedaba corto para alguien que depende de un lector de pantalla:
// necesita tiempo para que se lo anuncien y decidir, no solo para leerlo.
// 7s no es cumplimiento pleno de "tiempo ajustable" (WCAG 2.2.1 pide poder
// extenderlo, no solo alargarlo a ciegas), pero es una mejora real sin
// complicar el patrón con un temporizador pausable.
const DURACION_DESHACER_MS = 7000;

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
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<AccionPendiente | null>(null);
  const timeoutAccionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita que tocar dos veces seguidas una flecha de reordenar mande dos
  // intercambios de prioridad a la vez y los deje en un estado inconsistente.
  const [reordenando, setReordenando] = useState(false);

  const [ingreso, setIngreso] = useState('');
  const [errorReparto, setErrorReparto] = useState('');
  const [repartiendo, setRepartiendo] = useState(false);
  // Reabre el formulario aunque ya se haya repartido este mes, para poder
  // corregir el importe sin tener que ajustar cada bucket a mano.
  const [corrigiendo, setCorrigiendo] = useState(false);
  // null mientras no sabemos todavía si ya se repartió este mes (evita el
  // parpadeo de mostrar el formulario y luego bloquearlo de golpe).
  const [repartidoEsteMes, setRepartidoEsteMes] = useState<boolean | null>(null);

  // Cada 3 meses de uso, se avisa una vez para que revises si tus gastos
  // fijos y tu deuda siguen siendo correctos (el colchón depende de esa
  // cifra, y casi nadie la actualiza sola). Se puede descartar por hoy.
  const [mesesUsados, setMesesUsados] = useState(0);
  const [historialCargado, setHistorialCargado] = useState(false);
  // Desglose real del reparto de este mes (cuánto fue a cada bucket): sin
  // esto, la única forma de saber "cuánto puedo invertir/gastar" era bajar
  // y sumar tarjeta a tarjeta a mano.
  const [desgloseMesActual, setDesgloseMesActual] = useState<HistorialMes | null>(null);
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
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus buckets');
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
      const hoy = new Date();
      const mesActualEntry = historial.find(
        (m) => m.year === hoy.getFullYear() && m.month === hoy.getMonth() + 1
      );
      setDesgloseMesActual(mesActualEntry ?? null);
    } catch (err) {
      console.error('Error al comprobar los meses de uso:', err);
    } finally {
      setHistorialCargado(true);
    }
  }, [getToken]);

  // Solo al montar: si "getToken" de Clerk no es referencialmente estable
  // entre renders, meter estas funciones en las dependencias haría que este
  // efecto se repitiera con cada cambio de estado — y un cargarBuckets()
  // de más pisaría cualquier actualización optimista (borrar/retirar con
  // deshacer) con los datos "viejos" que todavía tiene el servidor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    cargarBuckets();
    cargarUltimoReparto();
    cargarMesesUsados();
  }, []);

  async function ejecutarAccionPendiente(accion: AccionPendiente) {
    try {
      const token = await getToken();
      if (accion.tipo === 'borrar') {
        await borrarBucket(token, accion.bucket.id);
      } else {
        await retirarDeBucket(token, accion.bucket.id, accion.centimos);
      }
      await cargarBuckets();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : accion.tipo === 'borrar'
          ? 'No se pudo borrar el bucket'
          : 'No se pudo registrar el retiro'
      );
      await cargarBuckets(); // deshace el cambio optimista si la API ha fallado
    }
  }

  function iniciarAccionPendiente(accion: AccionPendiente) {
    // No se acumulan ventanas de deshacer: si ya había una acción esperando,
    // se lanza ya antes de empezar la siguiente.
    if (accionPendiente && timeoutAccionRef.current) {
      clearTimeout(timeoutAccionRef.current);
      ejecutarAccionPendiente(accionPendiente);
    }

    if (accion.tipo === 'borrar') {
      setBuckets((prev) => prev.filter((b) => b.id !== accion.bucket.id));
    } else {
      setBuckets((prev) =>
        prev.map((b) =>
          b.id === accion.bucket.id
            ? { ...b, balance_cents: b.balance_cents - accion.centimos }
            : b
        )
      );
    }

    setAccionPendiente(accion);
    timeoutAccionRef.current = setTimeout(() => {
      timeoutAccionRef.current = null;
      setAccionPendiente(null);
      ejecutarAccionPendiente(accion);
    }, DURACION_DESHACER_MS);
  }

  function deshacerAccionPendiente() {
    if (timeoutAccionRef.current) {
      clearTimeout(timeoutAccionRef.current);
      timeoutAccionRef.current = null;
    }
    setAccionPendiente(null);
    cargarBuckets(); // nunca se llegó a llamar a la API: solo hay que refrescar
  }

  function handleBorrar(bucket: Bucket) {
    iniciarAccionPendiente({ tipo: 'borrar', bucket });
  }

  // Intercambia la prioridad de dos buckets, para que el usuario pueda
  // decidir "esta deuda antes que ese objetivo" desde la app — la cascada
  // de reparto ya lo soportaba, pero no había forma de tocarla desde aquí.
  async function handleReordenar(bucket: Bucket, otro: Bucket) {
    if (reordenando) return;
    setReordenando(true);
    try {
      const token = await getToken();
      await editarBucket(token, bucket.id, construirCambiosConPrioridad(bucket, otro.priority));
      await editarBucket(token, otro.id, construirCambiosConPrioridad(otro, bucket.priority));
      await cargarBuckets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el orden');
    } finally {
      setReordenando(false);
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
      setCorrigiendo(false);
      setRepartidoEsteMes(true); // bloquea el formulario hasta el mes que viene
      await cargarBuckets(); // los saldos de las tarjetas de abajo se actualizan solos
      await cargarMesesUsados(); // trae el desglose recién hecho para mostrarlo abajo
      // Repartir es la acción que cumple la promesa central de Kubo (el
      // dinero se organiza solo, sin que tengas que revisar nada después):
      // merece la misma confirmación explícita que ya tienen retirar y el
      // alta de buckets en el onboarding, no solo un cambio de texto discreto.
      Alert.alert('Repartido', 'Tu ingreso ya está organizado entre tus buckets.', [
        { text: 'OK' },
      ]);
    } catch (err) {
      setErrorReparto(err instanceof Error ? err.message : 'No se pudo calcular el reparto');
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
        onConfirmar={(centimos) => {
          iniciarAccionPendiente({ tipo: 'retirar', bucket: retirandoDeBucket, centimos });
          setRetirandoDeBucket(null);
        }}
        onCancelar={() => setRetirandoDeBucket(null)}
      />
    );
  }

  if (ayudaAbierta) {
    return <AyudaScreen onCerrar={() => setAyudaAbierta(false)} />;
  }

  // Primera vez del usuario: en vez de crear buckets a ciegas, le
  // preguntamos su ingreso y gastos fijos para sugerirle un reparto real.
  // Solo cuenta como "primera vez" si tampoco tiene historial: si no, es
  // alguien que ya usaba Kubo y borró su último bucket, y mandarlo de
  // vuelta a "Paso 1 de 2" como si nunca hubiera entrado sería confuso.
  if (
    yaCargado &&
    historialCargado &&
    !cargando &&
    buckets.length === 0 &&
    mesesUsados === 0 &&
    !error
  ) {
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
    <>
    <Screen>
      <View style={[styles.tarjetaReparto, repartidoEsteMes && styles.tarjetaRepartoHecho]}>
        {repartidoEsteMes && !corrigiendo ? (
          <>
            <View style={styles.filaRepartoHecho}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accentText} />
              <Text style={styles.tituloReparto}>Ingreso de {mesActual()} organizado</Text>
            </View>
            <Text style={styles.subtituloReparto}>
              Como en la vida real, el dinero llega una vez y se reparte una vez: podrás volver a
              hacerlo el {primerDiaProximoMes()}.
            </Text>
            {desgloseMesActual && (
              <View style={styles.desglose}>
                <View style={styles.filaIngresoTotal}>
                  <Text style={styles.filaIngresoTotalNombre}>Ingreso metido</Text>
                  <Text style={styles.filaIngresoTotalImporte}>
                    {formatearCentimos(desgloseMesActual.income_cents)}
                  </Text>
                </View>
                {desgloseMesActual.allocations.map((a) => (
                  <View key={a.bucket_id} style={styles.filaDesglose}>
                    <Text style={styles.filaDesgloseNombre}>{a.bucket_name}</Text>
                    <Text style={styles.filaDesgloseImporte}>
                      {formatearCentimos(a.amount_cents)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {/* Sin esto, equivocarte de cifra significaba ir bucket a
                bucket ajustando el saldo a mano: repite el mismo reparto,
                solo que con el importe correcto. */}
            <LinkText
              label="¿Cifra equivocada? Corregir"
              onPress={() => {
                setIngreso(
                  desgloseMesActual ? String(desgloseMesActual.income_cents / 100) : ''
                );
                setCorrigiendo(true);
              }}
            />
          </>
        ) : (
          <>
            <Text style={styles.tituloReparto}>Ingreso de {mesActual()}</Text>
            <Text style={styles.subtituloReparto}>
              Se reparte una sola vez al mes, todo junto: si tienes más de un ingreso, súmalo
              aquí antes de repartir.
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
            {corrigiendo && (
              <Button
                label="Cancelar"
                onPress={() => {
                  setCorrigiendo(false);
                  setIngreso('');
                  setErrorReparto('');
                }}
                variant="secondary"
              />
            )}
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
        <View style={styles.filaTituloConAyuda}>
          <Text style={styles.titulo}>Tus buckets</Text>
          {/* Acceso a la ayuda desde donde de verdad surge la duda ("¿qué es
              un objetivo?", "¿por qué ese orden?"), no solo enterrada en
              Perfil. */}
          <Pressable
            onPress={() => setAyudaAbierta(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ayuda"
          >
            <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Button label="+ Añadir" onPress={() => setCreandoBucket(true)} variant="secondary" />
      </View>

      {cargando && <ActivityIndicator color={colors.textPrimary} />}

      {!cargando && error ? <Text style={styles.error}>{error}</Text> : null}

      {!cargando && !error && buckets.length === 0 && (
        <Text style={styles.vacio}>
          Todavía no tienes ningún bucket. Pulsa "+ Añadir" para crear el primero.
        </Text>
      )}

      {/* Justo después del onboarding, con los buckets recién creados pero
          todavía sin repartir, "Gastos fijos: 0€" parece un error en vez de
          lo esperado. Se ha confundido más de una vez con esto: se explica
          aquí, no solo arriba en la tarjeta de Repartir. */}
      {!cargando && !error && !repartidoEsteMes && mesesUsados === 0 && buckets.length > 0 && (
        <Text style={styles.vacio}>
          Tus buckets están a 0 € porque todavía no has repartido ningún ingreso. Sube arriba,
          mete tu ingreso mensual y pulsa "Repartir" para que se llenen.
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
                onSubir={puedeSubir && !reordenando ? () => handleReordenar(item, anterior) : undefined}
                onBajar={puedeBajar && !reordenando ? () => handleReordenar(item, siguiente) : undefined}
              />
            );
          })}
        </View>
      )}
    </Screen>
    {accionPendiente && (
      <Snackbar
        mensaje={
          accionPendiente.tipo === 'borrar'
            ? `"${accionPendiente.bucket.name}" borrado.`
            : `Retirado ${formatearCentimos(accionPendiente.centimos)} de "${accionPendiente.bucket.name}".`
        }
        etiquetaAccion="Deshacer"
        onAccion={deshacerAccionPendiente}
      />
    )}
    </>
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
    // El momento en que el ingreso ya se organizó solo es la promesa
    // central de Kubo cumplida: se merece un tinte del propio Emerald en
    // vez de una tarjeta idéntica a la del formulario que sustituye.
    tarjetaRepartoHecho: {
      backgroundColor: colors.accent + '14',
      borderColor: colors.accent + '4D',
    },
    filaRepartoHecho: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    desglose: {
      marginTop: spacing.xs,
      gap: 2,
    },
    filaIngresoTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    filaIngresoTotalNombre: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    filaIngresoTotalImporte: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    filaDesglose: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    filaDesgloseNombre: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    filaDesgloseImporte: {
      ...typography.caption,
      color: colors.textPrimary,
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
    filaTituloConAyuda: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
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
