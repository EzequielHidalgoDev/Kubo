import { useAuth, useUser } from '@clerk/clerk-expo';
import { StyleSheet, Text, View } from 'react-native';
import { AyudaFAQ } from '../components/AyudaFAQ';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Colors, radius, spacing, typography, useColors } from '../theme';

export function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <Screen>
      <Text style={styles.titulo}>Perfil</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.etiqueta}>Cuenta</Text>
        <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
      </View>

      <Button label="Cerrar sesión" onPress={() => signOut()} variant="secondary" />

      <Text style={styles.tituloAyuda}>Ayuda</Text>
      <View style={styles.tarjetaAyuda}>
        <AyudaFAQ />
      </View>
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
      padding: spacing.md,
      gap: spacing.xs,
    },
    etiqueta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    email: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    tituloAyuda: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    tarjetaAyuda: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
    },
  });
}
