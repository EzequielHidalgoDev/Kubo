import { AntDesign } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Colors, MAX_FONT_SCALE_AJUSTADO, radius, spacing, typography, useColors } from '../theme';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

// Botón "Continuar con Google" — mismo patrón que Airbnb/BlaBlaCar: fila
// blanca con borde fino, icono a la izquierda, texto centrado.
export function GoogleButton({ onPress, loading }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <>
          <AntDesign name="google" size={18} color={colors.accent} style={styles.icon} />
          <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE_AJUSTADO}>
            Continuar con Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    base: {
      minHeight: 56,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    pressed: {
      opacity: 0.8,
    },
    icon: {
      marginRight: spacing.sm,
    },
    label: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
  });
}
