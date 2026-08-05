import { Image, StyleSheet } from 'react-native';
import { spacing } from '../theme';

// Marca de Kubo con fondo transparente: flota directamente sobre el
// fondo de la pantalla, sin caja alrededor.
export function AuthHero() {
  return <Image source={require('../assets/brand/logo-mark.png')} style={styles.logo} />;
}

const styles = StyleSheet.create({
  logo: {
    width: 84,
    height: 84,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
