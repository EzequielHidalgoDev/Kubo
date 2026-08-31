import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bucket } from '../lib/api';
import { formatearCentimos } from '../lib/money';
import { Colors, radius, spacing, typography, useColors } from '../theme';
import { LinkText } from './LinkText';

// Mismo texto que ya se explica una vez en CreateBucketScreen al elegir la
// estrategia — aquí se repite junto al "Objetivo"/"Importe fijo" de cada
// tarjeta, que es donde alguien que no recuerda qué significa esa etiqueta
// realmente la necesita, no solo al crear el bucket.
const EXPLICACION_ESTRATEGIA: Record<Bucket['strategy'], string> = {
  FIXED: 'Se le asigna siempre la misma cantidad cada mes.',
  DEBT: 'Se le va destinando dinero hasta saldarla del todo; luego para.',
  FILL_TO_TARGET: 'Se le va rellenando hasta llegar al objetivo, y luego para.',
  REMAINDER: 'Recibe lo que sobra cada mes, después de todo lo demás.',
};

type Props = {
  bucket: Bucket;
  onEditar?: () => void;
  onBorrar?: () => void;
  onRetirar?: () => void;
  // Orden dentro de su grupo de "ahorro e inversión" (1º, 2º...) y los
  // controles para cambiarlo: hacen visible y editable la cascada de
  // prioridad, que si no, no se ve en ningún sitio de la app.
  orden?: number;
  onSubir?: () => void;
  onBajar?: () => void;
};

export function BucketCard({
  bucket,
  onEditar,
  onBorrar,
  onRetirar,
  orden,
  onSubir,
  onBajar,
}: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [explicacionAbierta, setExplicacionAbierta] = useState(false);
  // El "objetivo" de un bucket depende de su estrategia: FILL_TO_TARGET y
  // DEBT tienen un objetivo a alcanzar (ahorro o deuda total), FIXED tiene
  // un importe fijo mensual, REMAINDER no tiene ninguno de los dos (se
  // lleva lo que sobra).
  const objetivo =
    bucket.strategy === 'FILL_TO_TARGET' || bucket.strategy === 'DEBT'
      ? bucket.target_cents
      : bucket.strategy === 'FIXED'
      ? bucket.fixed_amount_cents
      : null;

  const progreso = objetivo ? Math.min(bucket.balance_cents / objetivo, 1) : null;
  // El motor deja de repartir aquí en cuanto se llega al objetivo, tanto en
  // FILL_TO_TARGET como en DEBT (mismo cálculo de reached_target en
  // motor/engine.py) — antes solo se avisaba de esto para la deuda, y un
  // colchón ya lleno se quedaba mudo sobre por qué no crece más.
  const objetivoAlcanzado =
    (bucket.strategy === 'DEBT' || bucket.strategy === 'FILL_TO_TARGET') &&
    objetivo !== null &&
    bucket.balance_cents >= objetivo;
  const puedeReordenar = onSubir || onBajar;
  // Solo la tarjeta fusionada del colchón (cuando hay deuda) no tiene
  // ninguna acción: explica por qué, para que no parezca un hueco.
  const sinAcciones = !onEditar && !onBorrar && !onRetirar;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.filaNombre}>
          {puedeReordenar && (
            <View style={styles.flechas}>
              {/* Las dos flechas están pegadas (1px de gap) para no ocupar
                  toda la tarjeta: el hitSlop crece hacia fuera (arriba/abajo/
                  izquierda), donde no hay otro control, y se queda corto
                  hacia el centro para que no se solape con la de al lado. */}
              <Pressable
                onPress={onSubir}
                disabled={!onSubir}
                hitSlop={{ top: 14, bottom: 6, left: 14, right: 10 }}
                style={({ pressed }) => pressed && onSubir && styles.flechaPulsada}
                accessibilityRole="button"
                accessibilityLabel={`Subir prioridad de ${bucket.name}`}
                accessibilityState={{ disabled: !onSubir }}
              >
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={onSubir ? colors.textSecondary : colors.border}
                />
              </Pressable>
              <Pressable
                onPress={onBajar}
                disabled={!onBajar}
                hitSlop={{ top: 6, bottom: 14, left: 14, right: 10 }}
                style={({ pressed }) => pressed && onBajar && styles.flechaPulsada}
                accessibilityRole="button"
                accessibilityLabel={`Bajar prioridad de ${bucket.name}`}
                accessibilityState={{ disabled: !onBajar }}
              >
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={onBajar ? colors.textSecondary : colors.border}
                />
              </Pressable>
            </View>
          )}
          {orden !== undefined && (
            // La cascada de prioridad es lo que hace a Kubo distinto de un
            // gestor de gastos cualquiera: se merece más presencia que un
            // número gris, no solo aparecer discretamente.
            <View style={styles.badgeOrden}>
              <Text style={styles.badgeOrdenTexto}>{orden}</Text>
            </View>
          )}
          <Text style={styles.nombre} numberOfLines={1} ellipsizeMode="tail">
            {bucket.name}
          </Text>
        </View>
        <Text style={styles.saldo} numberOfLines={1}>
          {formatearCentimos(bucket.balance_cents)}
        </Text>
      </View>

      {progreso !== null && (
        <View style={styles.pistaProgreso}>
          <View style={[styles.rellenoProgreso, { width: `${progreso * 100}%` }]} />
        </View>
      )}

      <View style={styles.pie}>
        {objetivo !== null ? (
          <Pressable
            style={styles.filaDetalle}
            onPress={() => setExplicacionAbierta(!explicacionAbierta)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Qué significa esta estrategia"
            accessibilityState={{ expanded: explicacionAbierta }}
          >
            <Text style={styles.detalle} numberOfLines={1} ellipsizeMode="tail">
              {bucket.strategy === 'FIXED'
                ? `Importe fijo: ${formatearCentimos(objetivo)}`
                : bucket.strategy === 'DEBT'
                ? `Deuda total: ${formatearCentimos(objetivo)}`
                : `Objetivo: ${formatearCentimos(objetivo)}`}
              {bucket.monthly_cap_cents != null &&
                ` · tope ${formatearCentimos(bucket.monthly_cap_cents)}/mes`}
            </Text>
            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View />
        )}
        <View style={styles.acciones}>
          {onRetirar && bucket.strategy !== 'FIXED' && bucket.strategy !== 'DEBT' && (
            <LinkText label="Retirar" onPress={onRetirar} />
          )}
          {onEditar && <LinkText label="Editar" onPress={onEditar} />}
          {onBorrar && <LinkText label="Borrar" onPress={onBorrar} />}
        </View>
      </View>

      {explicacionAbierta && objetivo !== null && (
        <Text style={styles.consejo}>
          {EXPLICACION_ESTRATEGIA[bucket.strategy]}
          {bucket.id === 'colchon' && ' Consejo: mejor en una cuenta remunerada que parado sin más.'}
        </Text>
      )}

      {sinAcciones && (
        <Text style={styles.consejo}>
          Se reparte en dos momentos distintos de la cascada (antes y después de tu deuda) y no
          se edita como una sola tarjeta desde aquí.
        </Text>
      )}

      {objetivoAlcanzado && (
        <Text style={styles.saldada}>
          {bucket.strategy === 'DEBT'
            ? 'Deuda saldada. Ya no recibe más dinero.'
            : 'Objetivo alcanzado. Ya no recibe más dinero.'}
        </Text>
      )}
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      // space-between no deja hueco mínimo cuando no sobra sitio: con un
      // nombre muy largo en pantallas estrechas (375px), el "..." del
      // truncado tocaba directamente con el importe. Este gap fuerza un
      // margen aunque el ancho esté muy justo.
      gap: spacing.sm,
    },
    filaNombre: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 1,
      // Sin esto, en web un hijo flex no se encoge por debajo del ancho de
      // su contenido: el nombre largo empujaba el saldo en vez de truncarse.
      minWidth: 0,
    },
    flechas: {
      gap: 1,
    },
    flechaPulsada: {
      opacity: 0.4,
    },
    badgeOrden: {
      minWidth: 20,
      height: 20,
      borderRadius: radius.pill,
      // Tinte del propio Emerald al 15% (sufijo hex de opacidad), no un
      // color nuevo: se apoya en el mismo acento que ya usa el resto del
      // sistema, solo que aquí con más protagonismo.
      backgroundColor: colors.accent + '26',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    badgeOrdenTexto: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.accentText,
    },
    nombre: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      flexShrink: 1,
      // El minWidth:0 del contenedor no basta: en web, el propio texto (con
      // white-space:nowrap por el numberOfLines=1) sigue midiendo su ancho
      // de contenido completo si no se le quita aquí también.
      minWidth: 0,
    },
    saldo: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      // Sin esto, en web el saldo se encoge a la vez que el nombre (el
      // valor por defecto de flex-shrink ahí es 1, no 0 como en RN nativo)
      // y el importe también queda cortado.
      flexShrink: 0,
    },
    pistaProgreso: {
      // Un poco más gruesa que antes (6→8): es el motivo visual que más
      // veces se repite en la app ("cuánto me falta"), se merece más
      // presencia que un hilo casi invisible.
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    rellenoProgreso: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
    },
    pie: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    acciones: {
      flexDirection: 'row',
      gap: spacing.md,
      // Los links de acción nunca se cortan: si algo tiene que ceder
      // espacio, es el texto de detalle de al lado (ver filaDetalle).
      flexShrink: 0,
    },
    filaDetalle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      // Sin esto, un detalle largo (objetivo + tope mensual) empujaba los
      // links de Retirar/Editar/Borrar fuera de la tarjeta en vez de
      // truncarse con "...".
      flexShrink: 1,
      minWidth: 0,
    },
    detalle: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
      minWidth: 0,
    },
    consejo: {
      ...typography.caption,
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.textSecondary,
      opacity: 0.75,
    },
    saldada: {
      ...typography.caption,
      fontSize: 12,
      color: colors.accentText,
    },
  });
}
