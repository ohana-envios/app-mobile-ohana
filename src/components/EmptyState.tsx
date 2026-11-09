import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { title: string; description: string };

export function EmptyState({ title, description }: Props) {
  return <View style={styles.container}>
    <Text style={styles.symbol}>◫</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  symbol: { color: colors.orange, fontSize: 40, marginBottom: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
