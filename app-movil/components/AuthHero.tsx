import { Image, StyleSheet, Text } from 'react-native';
import { Colors, spacing, typography, useColors } from '../theme';

// Logo + título discreto (tamaño de sección, no titular gigante) — lo
// justo para notar que has cambiado de pantalla al navegar entre
// login y registro, sin repetir literalmente el texto del botón.
export function AuthHero({ title }: { title: string }) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <>
      <Image source={require('../assets/brand/logo-mark.png')} style={styles.logo} />
      <Text style={styles.title}>{title}</Text>
    </>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    logo: {
      width: 52,
      height: 52,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
  });
}
