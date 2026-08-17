import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme';

type Props = {
  mensaje: string;
  // Con acción (deshacer borrar/retirar): etiquetaAccion + onAccion, y quien
  // llama controla cuándo desaparece. Sin acción (aviso de éxito simple, ej.
  // "bucket creado"): se omiten y en su lugar se pasa duracionMs + onOcultar
  // para que se cierre solo, como el resto de los Alert.alert que sustituye.
  etiquetaAccion?: string;
  onAccion?: () => void;
  duracionMs?: number;
  onOcultar?: () => void;
};

// Aviso flotante y temporal, para acciones que antes exigían un diálogo de
// confirmación previo (con acción de deshacer) o un Alert.alert nativo del
// sistema (sin acción, solo aviso): en los dos casos es más discreto que
// interrumpir con un modal, coherente con el resto de la interfaz.
export function Snackbar({ mensaje, etiquetaAccion, onAccion, duracionMs, onOcultar }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  useEffect(() => {
    if (!duracionMs || !onOcultar) return;
    const id = setTimeout(onOcultar, duracionMs);
    return () => clearTimeout(id);
  }, [duracionMs, onOcultar]);

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
        {etiquetaAccion && onAccion && (
          <Pressable
            onPress={onAccion}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={etiquetaAccion}
          >
            <Text style={styles.accion}>{etiquetaAccion}</Text>
          </Pressable>
        )}
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
