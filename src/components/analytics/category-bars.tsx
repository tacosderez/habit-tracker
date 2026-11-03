import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CategoryStat } from '@/domain/analytics';

export function CategoryBars({ stats }: { stats: CategoryStat[] }) {
  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold">Rendimiento por categoría</ThemedText>
      {stats.map((stat) => (
        <View key={stat.categoryId} style={styles.row}>
          <ThemedText type="small">{stat.name}</ThemedText>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(stat.completionPct * 100)}%`, backgroundColor: stat.colorHex },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.one,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#27272A',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
