import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Colors, MAX_FONT_SCALE_AJUSTADO, radius, spacing, typography, useColors } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

// "primary" = acción principal: Navy sólido, forma de pastilla (redondeo
// total). "secondary" = solo borde fino, sin relleno.
export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textOnDark : colors.textPrimary} />
      ) : (
        <Text
          style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}
          maxFontSizeMultiplier={MAX_FONT_SCALE_AJUSTADO}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    base: {
      minHeight: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    primary: {
      backgroundColor: colors.navy,
    },
    primaryPressed: {
      backgroundColor: colors.navyPressed,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    secondaryPressed: {
      backgroundColor: colors.surface,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      ...typography.bodyMedium,
    },
    labelPrimary: {
      color: colors.textOnDark,
    },
    labelSecondary: {
      color: colors.textPrimary,
    },
  });
}
