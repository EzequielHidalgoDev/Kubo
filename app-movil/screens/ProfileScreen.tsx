import { useAuth, useUser } from '@clerk/clerk-expo';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { AyudaFAQ } from '../components/AyudaFAQ';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Bucket, HistorialMes, listarBuckets, obtenerHistorial } from '../lib/api';
import { formatearCentimos } from '../lib/money';
import { nombreMes } from '../lib/text';
import { Colors, radius, spacing, typography, useColors } from '../theme';

// Texto plano y legible, no JSON: no hay forma de volver a importarlo en
// Kubo, así que el objetivo es que alguien pueda leerlo o guardarlo, no
// que sea una copia de seguridad técnica restaurable.
function construirTextoExportacion(buckets: Bucket[], historial: HistorialMes[]): string {
  const lineas: string[] = ['Kubo — mis datos', ''];

  lineas.push('Buckets actuales:');
  buckets.forEach((b) => lineas.push(`- ${b.name}: ${formatearCentimos(b.balance_cents)}`));

  lineas.push('');
  lineas.push('Historial de repartos:');
  if (historial.length === 0) {
    lineas.push('(todavía no hay ningún reparto hecho)');
  }
  historial.forEach((mes) => {
    lineas.push(`${nombreMes(mes.year, mes.month)}: ${formatearCentimos(mes.income_cents)}`);
    mes.allocations.forEach((a) => lineas.push(`  - ${a.bucket_name}: ${formatearCentimos(a.amount_cents)}`));
  });

  return lineas.join('\n');
}

export function ProfileScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const colors = useColors();
  const styles = getStyles(colors);
  const [exportando, setExportando] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const token = await getToken();
      const [buckets, historial] = await Promise.all([
        listarBuckets(token),
        obtenerHistorial(token),
      ]);
      await Share.share({ message: construirTextoExportacion(buckets, historial) });
    } catch (err) {
      Alert.alert(
        'No se pudo exportar',
        err instanceof Error ? err.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setExportando(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.titulo}>Perfil</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.etiqueta}>Cuenta</Text>
        <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
      </View>

      <Button
        label="Exportar mis datos"
        onPress={handleExportar}
        loading={exportando}
        variant="secondary"
      />
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
