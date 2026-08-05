import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
};

export function LinkText({ label, onPress }: Props) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
