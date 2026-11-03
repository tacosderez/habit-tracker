import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { HeatmapCell } from '@/domain/analytics';

function cellColor(value: number | null): string {
  if (value == null) {
    return '#27272A';
  }
  if (value <= 0) {
    return '#3F3F46';
  }
  if (value < 0.4) {
    return '#14532D';
  }
  if (value < 0.8) {
    return '#15803D';
  }
  return '#22C55E';
}

export function HeatmapGrid({ cells }: { cells: HeatmapCell[] }) {
  return (
    <View>
      <ThemedText type="smallBold">Heatmap diario</ThemedText>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <View
            key={cell.date}
            style={[styles.cell, { backgroundColor: cellColor(cell.completionPct) }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.two,
  },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
