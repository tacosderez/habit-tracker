import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryBars } from '@/components/analytics/category-bars';
import { HeatmapGrid } from '@/components/analytics/heatmap-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { categoryPerformance, dailyHeatmap, toIsoDate } from '@/domain';
import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_HABITS,
  PLACEHOLDER_LOGS,
  PLACEHOLDER_PAUSES,
} from '@/features/habits/placeholders';

export default function AnalyticsScreen() {
  const today = toIsoDate(new Date());
  const cells = dailyHeatmap(PLACEHOLDER_HABITS, PLACEHOLDER_LOGS, PLACEHOLDER_PAUSES, today);
  const stats = categoryPerformance(
    PLACEHOLDER_HABITS,
    PLACEHOLDER_LOGS,
    PLACEHOLDER_PAUSES,
    PLACEHOLDER_CATEGORIES,
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Analítica</ThemedText>
        <ScrollView contentContainerStyle={styles.content}>
          <HeatmapGrid cells={cells} />
          <CategoryBars stats={stats} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  content: {
    gap: Spacing.five,
    paddingTop: Spacing.three,
  },
});
