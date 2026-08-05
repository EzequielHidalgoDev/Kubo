import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

export function Divider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>o</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
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
