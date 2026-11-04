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
import type { TimelineItem } from '@/types/database';

export default function TimelineScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isoDate = toIsoDate(new Date());

  const [categoryId, setCategoryId] = useState<string | 'all'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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

  // All today's items before filtering (used for the permanent fixed daily progress bar)
  const allTodayItems = useMemo(() => {
    return buildTodayTimeline({
      isoDate,
      habits,
      reminders,
      logs,
      pauses,
      categories,
    });
  }, [isoDate, habits, reminders, logs, pauses, categories]);

  // Total daily completion stats (FIXED, never disappears when filtering category)
  const allDueHabits = useMemo(
    () => allTodayItems.filter((i) => i.kind === 'habit'),
    [allTodayItems],
  );
  const totalCompletedCount = useMemo(
    () => allDueHabits.filter((i) => i.completionPct >= 1).length,
    [allDueHabits],
  );
  const totalProgressRatio = allDueHabits.length > 0 ? totalCompletedCount / allDueHabits.length : 0;

  // Filter items by selected category
  const filteredItems = useMemo(() => {
    return filterTimeline(allTodayItems, { categoryId });
  }, [allTodayItems, categoryId]);

  // Group items into frequency categories & completed section
  const sections = useMemo(() => {
    const dailyItems: TimelineItem[] = [];
    const specificDaysItems: TimelineItem[] = [];
    const weeklyItems: TimelineItem[] = [];
    const monthlyItems: TimelineItem[] = [];
    const reminderItems: TimelineItem[] = [];
    const completedItems: TimelineItem[] = [];

    for (const item of filteredItems) {
      const isCompleted =
        item.kind === 'habit' ? item.completionPct >= 1 : item.reminder.status === 'completed';

      if (isCompleted) {
        completedItems.push(item);
        continue;
      }

      if (item.kind === 'reminder') {
        reminderItems.push(item);
        continue;
      }

      const { habit } = item;
      if (habit.schedule_weekdays && habit.schedule_weekdays.length > 0) {
        specificDaysItems.push(item);
      } else if (habit.frequency === 'daily') {
        dailyItems.push(item);
      } else if (habit.frequency === 'weekly') {
        weeklyItems.push(item);
      } else if (habit.frequency === 'monthly') {
        monthlyItems.push(item);
      } else {
        dailyItems.push(item);
      }
    }

    return [
      { key: 'daily', title: '☀️ Hábitos Diarios', items: dailyItems },
      { key: 'specific_days', title: '📅 Días Específicos', items: specificDaysItems },
      { key: 'weekly', title: '🔄 Hábitos Semanales', items: weeklyItems },
      { key: 'monthly', title: '🗓️ Hábitos Mensuales', items: monthlyItems },
      { key: 'reminders', title: '⏰ Recordatorios', items: reminderItems },
      { key: 'completed', title: '✅ Terminados', items: completedItems },
    ].filter((sec) => sec.items.length > 0);
  }, [filteredItems]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
          <View style={styles.headerTitleContainer}>
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

        {/* Progress summary banner (FIXED / PERMANENTE) */}
        <ThemedView type="backgroundElement" style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <ThemedText type="smallBold" style={styles.summaryTitle}>
              Progreso del día
            </ThemedText>
            <View
              style={[
                styles.percentBadge,
                { backgroundColor: totalProgressRatio >= 1 ? '#22C55E' : '#3B82F6' },
              ]}>
              <ThemedText type="smallBold" style={styles.percentBadgeText}>
                {Math.round(totalProgressRatio * 100)}%
              </ThemedText>
            </View>
          </View>

          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {allDueHabits.length === 0
              ? 'No hay hábitos programados para hoy'
              : `${totalCompletedCount} de ${allDueHabits.length} hábitos completados hoy`}
          </ThemedText>

          <View style={styles.summaryBarTrack}>
            <View
              style={[
                styles.summaryBarFill,
                {
                  width: `${Math.min(100, Math.round(totalProgressRatio * 100))}%`,
                  backgroundColor: totalProgressRatio >= 1 ? '#22C55E' : '#3B82F6',
                },
              ]}
            />
          </View>
        </ThemedView>

        {/* Category Filters (Only category filter) */}
        <TimelineFilters
          categoryId={categoryId}
          categories={categories}
          onCategoryChange={setCategoryId}
        />

        {/* Timeline list with Collapsible Sections */}
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
          {sections.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText type="subtitle" style={styles.emptyIcon}>
                🌱
              </ThemedText>
              <ThemedText type="default" style={styles.emptyTitle}>
                Todo listo por ahora
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
                No tienes hábitos ni recordatorios para los filtros seleccionados.
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
            sections.map((section) => {
              const isCollapsed = Boolean(collapsedSections[section.key]);

              return (
                <View key={section.key} style={styles.sectionWrap}>
                  {/* Collapsible Section Header */}
                  <Pressable
                    onPress={() => toggleSection(section.key)}
                    style={({ pressed }) => [
                      styles.sectionHeaderButton,
                      pressed && { opacity: 0.7 },
                    ]}>
                    <View style={styles.sectionHeaderLeft}>
                      <ThemedText type="smallBold">{section.title}</ThemedText>
                      <View style={styles.countBadge}>
                        <ThemedText type="smallBold" themeColor="textSecondary">
                          {section.items.length}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {isCollapsed ? '▶' : '▼'}
                    </ThemedText>
                  </Pressable>

                  {/* Section Items (if not collapsed) */}
                  {!isCollapsed && (
                    <View style={styles.sectionItemsList}>
                      {section.items.map((item) => (
                        <TimelineItemRow
                          key={`${item.kind}-${item.id}`}
                          item={item}
                          onToggleComplete={() => {
                            if (item.kind === 'habit') {
                              if (item.habit.tracking_type === 'boolean') {
                                toggleBooleanProgress(item.habit.id, isoDate);
                              } else {
                                if (item.completionPct >= 1) {
                                  deleteLogsOnDay(item.habit.id, isoDate);
                                } else {
                                  const remaining = Math.max(
                                    1,
                                    item.habit.target_value - item.progressValue,
                                  );
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
                      ))}
                    </View>
                  )}
                </View>
              );
            })
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
  headerTitleContainer: {
    flex: 1,
  },
  capitalized: {
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexShrink: 0,
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
    gap: Spacing.one,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    flex: 1,
  },
  percentBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
    flexShrink: 0,
  },
  percentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
  },
  summaryBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
    marginTop: Spacing.half,
  },
  summaryBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  list: {
    gap: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.six,
  },
  sectionWrap: {
    gap: Spacing.one,
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  countBadge: {
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: 999,
  },
  sectionItemsList: {
    gap: Spacing.two,
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
