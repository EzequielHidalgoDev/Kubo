import { StyleSheet, Text, View } from 'react-native';
import { HistorialMes } from '../lib/api';
import { formatearCentimos } from '../lib/money';
import { Colors, radius, spacing, typography, useColors } from '../theme';

type Props = {
  meses: HistorialMes[]; // vienen del más reciente al más antiguo (igual que /historial)
};

const MESES_A_MOSTRAR = 6;
const ALTURA_PISTA = 100;
const NOMBRES_MES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Barras simples con Views, sin librería de gráficos: solo hace falta
// mostrar una tendencia (¿el ingreso repartido sube o baja?), no un gráfico
// interactivo completo.
export function GraficoEvolucion({ meses }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  // Sin ningún reparto todavía, HistorialScreen ya muestra su propio aviso
  // de "todavía no has repartido nada" — este componente no añade nada ahí.
  if (meses.length === 0) return null;

  // Cronológico (antiguo → reciente, como se lee una evolución) y como
  // máximo los últimos N meses para que las barras no se amontonen.
  const ordenado = [...meses].reverse().slice(-MESES_A_MOSTRAR);
  const maximo = Math.max(...ordenado.map((m) => m.income_cents), 1);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Evolución del ingreso repartido</Text>
      {ordenado.length < 2 ? (
        // Con un solo mes no hay nada que comparar: mejor decirlo que
        // ocultar la tarjeta entera, que parecería que falta algo.
        <Text style={styles.textoAunNo}>
          Vuelve el mes que viene: con dos meses repartidos ya se puede ver si sube o baja.
        </Text>
      ) : (
        <View style={styles.filaBarras}>
          {ordenado.map((mes) => {
            const alturaPct = Math.max((mes.income_cents / maximo) * 100, 4);
            return (
              <View key={`${mes.year}-${mes.month}`} style={styles.columna}>
                <Text style={styles.importe} numberOfLines={1}>
                  {formatearCentimos(mes.income_cents)}
                </Text>
                <View style={styles.pistaBarra}>
                  <View style={[styles.barra, { height: `${alturaPct}%` }]} />
                </View>
                <Text style={styles.etiquetaMes}>{NOMBRES_MES_CORTOS[mes.month - 1] ?? ''}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    contenedor: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    titulo: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      fontSize: 12,
      letterSpacing: 0.5,
    },
    textoAunNo: {
      ...typography.caption,
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.textSecondary,
      opacity: 0.75,
    },
    filaBarras: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    columna: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    importe: {
      fontSize: 10,
      fontFamily: 'Inter_500Medium',
      color: colors.textSecondary,
    },
    pistaBarra: {
      width: '100%',
      height: ALTURA_PISTA,
      justifyContent: 'flex-end',
    },
    barra: {
      width: '100%',
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      minHeight: 4,
    },
    etiquetaMes: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });
}
