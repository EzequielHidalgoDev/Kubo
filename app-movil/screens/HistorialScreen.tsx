import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GraficoEvolucion } from '../components/GraficoEvolucion';
import { Screen } from '../components/Screen';
import { Bucket, HistorialMes, listarBuckets, obtenerHistorial } from '../lib/api';
import { fusionarColchon } from '../lib/buckets';
import { formatearCentimos } from '../lib/money';
import { nombreMes } from '../lib/text';
import { Colors, radius, spacing, typography, useColors } from '../theme';

// Gastos fijos y Libre para gastar no acumulan (se resetean cada mes, ver
// Inicio), así que no tiene sentido incluirlos en un total de siempre.
const BUCKETS_ACUMULABLES = ['FILL_TO_TARGET', 'DEBT', 'REMAINDER'];

export function HistorialScreen() {
  const { getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  const [meses, setMeses] = useState<HistorialMes[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarHistorial = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      const [historial, listaBuckets] = await Promise.all([
        obtenerHistorial(token),
        listarBuckets(token),
      ]);
      setMeses(historial);
      setBuckets(listaBuckets);
    } catch (err) {
      console.error('Error al cargar el historial:', err);
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const totales = fusionarColchon(buckets.filter((b) => BUCKETS_ACUMULABLES.includes(b.strategy)));

  return (
    <Screen>
      <Text style={styles.titulo}>Historial</Text>

      {cargando && <ActivityIndicator color={colors.textPrimary} />}

      {!cargando && error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Sin nada de contenido debajo, la pantalla se quedaba con un hueco
          en blanco grande hasta la barra de pestañas (el Screen compartido
          estira su contenido para llenar el alto disponible). Un mensaje
          que oriente sobre qué va a aparecer aquí llena ese hueco con algo
          útil, en vez de dejarlo vacío sin más. */}
      {!cargando && !error && meses.length === 0 && totales.length === 0 && (
        <Text style={styles.vacio}>
          Todavía no has repartido ningún ingreso. En cuanto metas tu sueldo en Inicio y pulses
          "Repartir", aquí verás mes a mes a dónde ha ido el dinero.
        </Text>
      )}

      {!cargando && !error && meses.length === 0 && totales.length > 0 && (
        <Text style={styles.vacio}>
          Todavía no has cerrado ningún mes, pero ya tienes esto ahorrado. En cuanto repartas tu
          primer ingreso en Inicio, aquí aparecerá el detalle mes a mes.
        </Text>
      )}

      {!cargando && !error && totales.length > 0 && (
        <View style={styles.tarjetaTotales}>
          <Text style={styles.mes}>En total</Text>
          {totales.map((b) => (
            <View key={b.id} style={styles.fila}>
              <Text style={styles.filaNombre}>{b.name}</Text>
              <Text style={styles.filaTotalImporte}>{formatearCentimos(b.balance_cents)}</Text>
            </View>
          ))}
        </View>
      )}

      {!cargando && !error && <GraficoEvolucion meses={meses} />}

      {meses.map((mes) => (
        <View key={`${mes.year}-${mes.month}`} style={styles.tarjeta}>
          <View style={styles.cabecera}>
            <Text style={styles.mes}>{nombreMes(mes.year, mes.month)}</Text>
            <Text style={styles.ingreso}>{formatearCentimos(mes.income_cents)}</Text>
          </View>
          {mes.allocations.map((a) => (
            <View key={a.bucket_id} style={styles.fila}>
              <Text style={styles.filaNombre}>{a.bucket_name}</Text>
              <Text style={styles.filaImporte}>{formatearCentimos(a.amount_cents)}</Text>
            </View>
          ))}
        </View>
      ))}
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
    error: {
      ...typography.body,
      color: colors.error,
    },
    vacio: {
      ...typography.body,
      color: colors.textSecondary,
    },
    tarjetaTotales: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accentText,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    filaTotalImporte: {
      ...typography.bodyMedium,
      color: colors.accentText,
    },
    tarjeta: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    cabecera: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    mes: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    ingreso: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    fila: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    filaNombre: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    filaImporte: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
