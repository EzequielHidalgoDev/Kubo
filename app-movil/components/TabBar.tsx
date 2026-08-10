import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, MAX_FONT_SCALE_AJUSTADO, spacing, typography, useColors } from '../theme';

export type Tab = 'inicio' | 'historial' | 'perfil';

type Props = {
  activa: Tab;
  onCambiar: (tab: Tab) => void;
  avisoInicio?: boolean;
};

const TABS: { id: Tab; label: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'inicio', label: 'Inicio', icono: 'home' },
  { id: 'historial', label: 'Historial', icono: 'time' },
  { id: 'perfil', label: 'Perfil', icono: 'person' },
];

export function TabBar({ activa, onCambiar, avisoInicio }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.barra}>
        {TABS.map((tab) => {
          const seleccionada = tab.id === activa;
          return (
            <Pressable key={tab.id} onPress={() => onCambiar(tab.id)} style={styles.item}>
              <View>
                <Ionicons
                  name={seleccionada ? tab.icono : (`${tab.icono}-outline` as keyof typeof Ionicons.glyphMap)}
                  size={22}
                  color={seleccionada ? colors.textPrimary : colors.textSecondary}
                />
                {tab.id === 'inicio' && avisoInicio && <View style={styles.punto} />}
              </View>
              <Text
                style={[styles.label, seleccionada && styles.labelActiva]}
                maxFontSizeMultiplier={MAX_FONT_SCALE_AJUSTADO}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    barra: {
      flexDirection: 'row',
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingVertical: spacing.sm,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    label: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    labelActiva: {
      color: colors.textPrimary,
    },
    punto: {
      position: 'absolute',
      top: -2,
      right: -4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
  });
}
