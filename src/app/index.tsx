import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimelineFilters } from '@/components/timeline/timeline-filters';
import { TimelineItemRow } from '@/components/timeline/timeline-item-row';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { buildTodayTimeline, filterTimeline, toIsoDate } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import type { HabitFrequency } from '@/types/database';

export default function TimelineScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isoDate = toIsoDate(new Date());

  const [frequency, setFrequency] = useState<HabitFrequency | 'all'>('all');
  const [categoryId, setCategoryId] = useState<string | 'all'>('all');

  const {
    habits,
    reminders,
    logs,
    pauses,
    categories,
    isSyncing,
    refreshData,
    toggleBooleanProgress,
    logProgress,
    deleteLogsOnDay,
    toggleReminderComplete,
  } = useAppData();

  const items = useMemo(() => {
    const timeline = buildTodayTimeline({
      isoDate,
      habits,
      reminders,
      logs,
      pauses,
      categories,
    });
    return filterTimeline(timeline, { frequency, categoryId });
  }, [categoryId, frequency, habits, reminders, logs, pauses, categories, isoDate]);

  // Overall today's completion stats
  const habitItems = items.filter((i) => i.kind === 'habit');
  const completedCount = habitItems.filter((i) => i.kind === 'habit' && i.completionPct >= 1).length;
  const progressRatio = habitItems.length > 0 ? completedCount / habitItems.length : 0;

  const todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="subtitle">Hoy</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.capitalized}>
              {todayLabel}
            </ThemedText>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/habit/new')}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.actionButtonText}>
                + Hábito
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => router.push('/reminder/new')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonSecondary,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="text">
                + Alerta
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Progress summary banner */}
        {habitItems.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            <View style={styles.summaryInfo}>
              <ThemedText type="smallBold">Progreso del día</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {completedCount} de {habitItems.length} hábitos completados (
                {Math.round(progressRatio * 100)}%)
              </ThemedText>
            </View>
            <View style={styles.summaryBarTrack}>
              <View
                style={[
                  styles.summaryBarFill,
                  {
                    width: `${Math.round(progressRatio * 100)}%`,
                    backgroundColor: progressRatio >= 1 ? '#22C55E' : '#3B82F6',
                  },
                ]}
              />
            </View>
          </ThemedView>
        )}

        {/* Filter chips */}
        <TimelineFilters
          frequency={frequency}
          categoryId={categoryId}
          categories={categories}
          onFrequencyChange={setFrequency}
          onCategoryChange={setCategoryId}
        />

        {/* Timeline list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={refreshData}
              tintColor={theme.text}
            />
          }>
          {items.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText type="subtitle" style={styles.emptyIcon}>
                🌱
              </ThemedText>
              <ThemedText type="default" style={styles.emptyTitle}>
                Todo listo por ahora
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
                No tienes hábitos ni recordatorios programados con los filtros seleccionados.
              </ThemedText>
              <View style={styles.emptyButtons}>
                <Pressable
                  onPress={() => router.push('/habit/new')}
                  style={styles.emptyActionButton}>
                  <ThemedText type="smallBold" style={styles.actionButtonText}>
                    Crear nuevo hábito
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : (
            items.map((item) => (
              <TimelineItemRow
                key={`${item.kind}-${item.id}`}
                item={item}
                onToggleComplete={() => {
                  if (item.kind === 'habit') {
                    if (item.habit.tracking_type === 'boolean') {
                      toggleBooleanProgress(item.habit.id, isoDate);
                    } else {
                      // Numeric or Duration habit
                      if (item.completionPct >= 1) {
                        // Reset progress for today
                        deleteLogsOnDay(item.habit.id, isoDate);
                      } else {
                        // Fill remaining progress to 100%
                        const remaining = Math.max(1, item.habit.target_value - item.progressValue);
                        logProgress(item.habit.id, isoDate, remaining, 'manual');
                      }
                    }
                  } else {
                    toggleReminderComplete(
                      item.reminder.id,
                      item.reminder.status !== 'completed',
                    );
                  }
                }}
                onAddProgress={(amount) => {
                  if (item.kind === 'habit') {
                    logProgress(item.habit.id, isoDate, amount, 'manual');
                  }
                }}
              />
            ))
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  capitalized: {
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  actionButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.75,
  },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  summaryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
  },
  summaryBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  list: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  emptyContainer: {
    padding: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    fontWeight: '700',
  },
  emptyDesc: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButtons: {
    marginTop: Spacing.three,
  },
  emptyActionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
