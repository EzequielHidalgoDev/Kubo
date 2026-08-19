import { Text, View, StyleSheet } from 'react-native';
import { formatearCentimos } from '../lib/money';
import { Colors, typography, useColors } from '../theme';

type Props = {
  // Cuánto queda del ingreso de este mes después del bucket de arriba, ya
  // calculado por el backend (nunca se recalcula aquí). null/undefined
  // cuando todavía no hay un reparto este mes: no hay ninguna cifra real
  // que mostrar todavía, así que no se muestra nada (ni una línea de
  // relleno) en vez de fingir un dato que no existe.
  restanteCents?: number | null;
};

// Entre dos buckets de la cascada: en vez de solo una línea decorativa (que
// no explicaba nada y era casi invisible), el importe real que queda
// disponible para los siguientes buckets tras este — la parte de la
// cascada que de verdad costaba entender, no el orden (eso ya lo dice el
// número de cada tarjeta).
export function CascadaConector({ restanteCents }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  if (restanteCents == null) return null;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.texto}>↓ Quedan {formatearCentimos(Math.max(restanteCents, 0))}</Text>
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    contenedor: {
      alignItems: 'center',
    },
    texto: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
}
