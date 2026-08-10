import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

// Input minimal: solo línea inferior, sin caja completa ni sombra.
// El borde se pone Emerald mientras el campo tiene el foco.
export function TextField({ label, error, style, onFocus, onBlur, ...inputProps }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          enfocado && !error && styles.inputEnfocado,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    label: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    input: {
      minHeight: 48,
      paddingVertical: spacing.xs,
      borderBottomWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      // outlineStyle: quita el anillo de foco por defecto del navegador en
      // web, que tapaba nuestro borde Emerald personalizado. No afecta a
      // iOS/Android, ahí no existe ese estilo.
      outlineStyle: 'none',
      ...typography.body,
    },
    inputEnfocado: {
      borderColor: colors.accent,
    },
    inputError: {
      borderColor: colors.error,
    },
    error: {
      ...typography.caption,
      color: colors.error,
    },
  });
}
