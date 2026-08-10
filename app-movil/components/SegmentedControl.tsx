import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, MAX_FONT_SCALE_AJUSTADO, radius, spacing, typography, useColors } from '../theme';

type Opcion = { value: string; label: string };

type Props = {
  opciones: Opcion[];
  valor: string;
  onCambiar: (value: string) => void;
};

export function SegmentedControl({ opciones, valor, onCambiar }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <View style={styles.contenedor}>
      {opciones.map((opcion) => {
        const seleccionada = opcion.value === valor;
        return (
          <Pressable
            key={opcion.value}
            onPress={() => onCambiar(opcion.value)}
            style={[styles.opcion, seleccionada && styles.opcionSeleccionada]}
          >
            <Text
              style={[styles.texto, seleccionada && styles.textoSeleccionado]}
              maxFontSizeMultiplier={MAX_FONT_SCALE_AJUSTADO}
            >
              {opcion.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    contenedor: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      padding: spacing.xs / 2,
    },
    opcion: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    opcionSeleccionada: {
      backgroundColor: colors.surface,
    },
    texto: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    textoSeleccionado: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      fontSize: 13,
    },
  });
}
