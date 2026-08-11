import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, spacing, typography, useColors } from '../theme';

type Props = {
  pregunta: string;
  children: string;
};

// Una pregunta que se despliega al tocarla. La ayuda de Kubo vive aquí en
// vez de en una pantalla aparte: no hay tantas preguntas como para
// justificar una sección de FAQ completa, pero sí las suficientes para que
// alguien que no sabe organizarse no se quede sin explicación en ningún
// momento (colchón, prioridad, deuda, reparto mensual...).
export function PreguntaAyuda({ pregunta, children }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [abierta, setAbierta] = useState(false);

  return (
    <Pressable onPress={() => setAbierta(!abierta)} style={styles.fila}>
      <View style={styles.cabecera}>
        <Text style={styles.pregunta}>{pregunta}</Text>
        <Ionicons
          name={abierta ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </View>
      {abierta && <Text style={styles.respuesta}>{children}</Text>}
    </Pressable>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    fila: {
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.xs,
    },
    cabecera: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    pregunta: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    respuesta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
