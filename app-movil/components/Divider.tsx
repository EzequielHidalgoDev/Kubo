import { StyleSheet, Text, View } from 'react-native';
import { Colors, spacing, typography, useColors } from '../theme';

export function Divider() {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>o</Text>
      <View style={styles.line} />
    </View>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    text: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
