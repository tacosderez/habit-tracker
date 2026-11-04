import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryBars } from '@/components/analytics/category-bars';
import { HeatmapGrid } from '@/components/analytics/heatmap-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { categoryPerformance, dailyHeatmap, toIsoDate } from '@/domain';

export default function AnalyticsScreen() {
  const today = toIsoDate(new Date());
  const { habits, logs, pauses, categories } = useAppData();

  const cells = dailyHeatmap(habits, logs, pauses, today);
  const stats = categoryPerformance(habits, logs, pauses, categories);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Analítica</ThemedText>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    paddingBottom: Spacing.six,
  },
});
