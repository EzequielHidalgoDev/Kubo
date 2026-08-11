import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bucket } from '../lib/api';
import { formatearCentimos } from '../lib/money';
import { Colors, radius, spacing, typography, useColors } from '../theme';
import { LinkText } from './LinkText';

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
  const deudaSaldada = bucket.strategy === 'DEBT' && objetivo !== null && bucket.balance_cents >= objetivo;
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
              <Pressable onPress={onSubir} disabled={!onSubir} hitSlop={6}>
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={onSubir ? colors.textSecondary : colors.border}
                />
              </Pressable>
              <Pressable onPress={onBajar} disabled={!onBajar} hitSlop={6}>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={onBajar ? colors.textSecondary : colors.border}
                />
              </Pressable>
            </View>
          )}
          <Text style={styles.nombre}>
            {orden !== undefined && <Text style={styles.orden}>{orden}º </Text>}
            {bucket.name}
          </Text>
        </View>
        <Text style={styles.saldo}>{formatearCentimos(bucket.balance_cents)}</Text>
      </View>

      {progreso !== null && (
        <View style={styles.pistaProgreso}>
          <View style={[styles.rellenoProgreso, { width: `${progreso * 100}%` }]} />
        </View>
      )}

      <View style={styles.pie}>
        {objetivo !== null && (
          <Text style={styles.detalle}>
            {bucket.strategy === 'FIXED'
              ? `Importe fijo: ${formatearCentimos(objetivo)}`
              : bucket.strategy === 'DEBT'
              ? `Deuda total: ${formatearCentimos(objetivo)}`
              : `Objetivo: ${formatearCentimos(objetivo)}`}
          </Text>
        )}
        <View style={styles.acciones}>
          {onRetirar && bucket.strategy !== 'FIXED' && bucket.strategy !== 'DEBT' && (
            <LinkText label="Retirar" onPress={onRetirar} />
          )}
          {onEditar && <LinkText label="Editar" onPress={onEditar} />}
          {onBorrar && <LinkText label="Borrar" onPress={onBorrar} />}
        </View>
      </View>

      {bucket.id === 'colchon' && (
        <Text style={styles.consejo}>
          Consejo: mejor en una cuenta remunerada que parado sin más.
        </Text>
      )}

      {sinAcciones && (
        <Text style={styles.consejo}>
          Se compone de dos partes internas (para priorizar tu deuda entre medias) y no se
          edita como una sola desde aquí.
        </Text>
      )}

      {deudaSaldada && <Text style={styles.saldada}>Deuda saldada. Ya no recibe más dinero.</Text>}
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
    },
    filaNombre: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 1,
    },
    flechas: {
      gap: 1,
    },
    orden: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    nombre: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    saldo: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    pistaProgreso: {
      height: 6,
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
    },
    acciones: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    detalle: {
      ...typography.caption,
      color: colors.textSecondary,
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
      color: colors.accent,
    },
  });
}
