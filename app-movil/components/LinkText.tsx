import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, typography, useColors } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
};

export function LinkText({ label, onPress }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[styles.text, pressed && styles.textPulsado]}>{label}</Text>
      )}
    </Pressable>
  );
}

function getStyles(colors: Colors) {
  return StyleSheet.create({
    text: {
      ...typography.caption,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    textPulsado: {
      opacity: 0.5,
    },
  });
}
