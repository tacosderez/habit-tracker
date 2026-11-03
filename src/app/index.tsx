import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TimelineFilters } from '@/components/timeline/timeline-filters';
import { TimelineItemRow } from '@/components/timeline/timeline-item-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { buildTodayTimeline, filterTimeline, toIsoDate } from '@/domain';
import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_HABITS,
  PLACEHOLDER_LOGS,
  PLACEHOLDER_PAUSES,
  PLACEHOLDER_REMINDERS,
} from '@/features/habits/placeholders';
import type { HabitFrequency } from '@/types/database';

export default function TimelineScreen() {
  const isoDate = toIsoDate(new Date());
  const [frequency, setFrequency] = useState<HabitFrequency | 'all'>('all');
  const [categoryId, setCategoryId] = useState<string | 'all'>('all');

  const items = useMemo(() => {
    const timeline = buildTodayTimeline({
      isoDate,
      habits: PLACEHOLDER_HABITS,
      reminders: PLACEHOLDER_REMINDERS,
      logs: PLACEHOLDER_LOGS,
      pauses: PLACEHOLDER_PAUSES,
      categories: PLACEHOLDER_CATEGORIES,
    });
    return filterTimeline(timeline, { frequency, categoryId });
  }, [categoryId, frequency, isoDate]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Hoy</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Hábitos y recordatorios en una sola línea de tiempo
        </ThemedText>
        <TimelineFilters
          frequency={frequency}
          categoryId={categoryId}
          categories={PLACEHOLDER_CATEGORIES}
          onFrequencyChange={setFrequency}
          onCategoryChange={setCategoryId}
        />
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <ThemedText themeColor="textSecondary">Nada programado para estos filtros.</ThemedText>
          ) : (
            items.map((item) => <TimelineItemRow key={`${item.kind}-${item.id}`} item={item} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
});
