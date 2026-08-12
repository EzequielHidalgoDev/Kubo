import { StyleSheet, Text, View } from 'react-native';
import { AyudaFAQ } from '../components/AyudaFAQ';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Colors, radius, spacing, typography, useColors } from '../theme';

type Props = {
  onCerrar: () => void;
};

// Mismo contenido que la Ayuda de Perfil, pero alcanzable desde Inicio: la
// crítica de diseño señaló que alguien confundido con "Objetivo" o "Importe
// fijo" no tenía motivo para bajar hasta Perfil a buscar la respuesta.
export function AyudaScreen({ onCerrar }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <Screen>
      <Text style={styles.titulo}>Ayuda</Text>
      <View style={styles.tarjeta}>
        <AyudaFAQ />
      </View>
      <Button label="Volver" onPress={onCerrar} variant="secondary" />
    </Screen>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    titulo: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    tarjeta: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
    },
  });
}
