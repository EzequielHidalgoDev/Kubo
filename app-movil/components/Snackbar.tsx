import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme';

type Props = {
  mensaje: string;
  etiquetaAccion: string;
  onAccion: () => void;
};

// Aviso flotante y temporal con una acción de deshacer, para acciones que
// antes exigían un diálogo de confirmación previo: es más rápido para quien
// no se equivoca, y sigue dando una salida real a quien sí lo hace.
export function Snackbar({ mensaje, etiquetaAccion, onAccion }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <View
      style={styles.contenedor}
      pointerEvents="box-none"
      // Sin esto, un lector de pantalla no se entera de que ha aparecido
      // este aviso: hay que anunciarlo solo, no esperar a que alguien
      // "encuentre" un elemento nuevo en pantalla con la ventana de
      // deshacer ya corriendo.
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.barra}>
        <Text style={styles.mensaje} numberOfLines={2}>
          {mensaje}
        </Text>
        <Pressable
          onPress={onAccion}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={etiquetaAccion}
        >
          <Text style={styles.accion}>{etiquetaAccion}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    contenedor: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 90, // por encima de la barra de pestañas fija
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      width: '100%',
      maxWidth: 440 - spacing.lg * 2,
      backgroundColor: colors.navy,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    mensaje: {
      ...typography.body,
      color: colors.textOnDark,
      flexShrink: 1,
    },
    accion: {
      ...typography.bodyMedium,
      color: colors.accent,
    },
  });
}
