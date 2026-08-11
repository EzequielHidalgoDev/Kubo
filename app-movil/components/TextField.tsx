import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

// Quita el anillo de foco por defecto del navegador en web (React Native
// Web), que tapaba nuestro borde Emerald personalizado. No existe en el
// tipo TextStyle de React Native (es una propiedad solo de web), de ahí el
// "as any" aislado aquí en vez de mezclado con el resto de estilos.
const SIN_ANILLO_FOCO_WEB = { outlineStyle: 'none' } as any;

// Input minimal: solo línea inferior, sin caja completa ni sombra.
// El borde se pone Emerald mientras el campo tiene el foco.
export function TextField({ label, error, style, onFocus, onBlur, secureTextEntry, ...inputProps }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [enfocado, setEnfocado] = useState(false);
  // Si el campo es de contraseña, se puede alternar a texto plano — sin
  // esto, un error de tecleo en el registro no se detecta hasta enviarlo.
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const esContrasena = secureTextEntry === true;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.fila,
          enfocado && !error && styles.filaEnfocada,
          error && styles.filaError,
        ]}
      >
        <TextInput
          style={[styles.input, SIN_ANILLO_FOCO_WEB, style]}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          secureTextEntry={esContrasena && !mostrarTexto}
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
        {esContrasena && (
          <Pressable onPress={() => setMostrarTexto(!mostrarTexto)} hitSlop={8}>
            <Ionicons
              name={mostrarTexto ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
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
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      borderBottomWidth: 1.5,
      borderColor: colors.border,
    },
    filaEnfocada: {
      borderColor: colors.accent,
    },
    filaError: {
      borderColor: colors.error,
    },
    input: {
      flex: 1,
      paddingVertical: spacing.xs,
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      ...typography.body,
    },
    error: {
      ...typography.caption,
      color: colors.error,
    },
  });
}
