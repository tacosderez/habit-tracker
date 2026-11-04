import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StreakMap } from '@/components/progress/streak-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { currentStreak, toIsoDate } from '@/domain';
import { useTheme } from '@/hooks/use-theme';

export default function ProgressScreen() {
  const theme = useTheme();
  const todayIso = toIsoDate(new Date());
  const { habits, logs, pauses } = useAppData();

  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const activeHabit = useMemo(() => {
    if (habits.length === 0) return null;
    return habits.find((h) => h.id === selectedHabitId) ?? habits[0];
  }, [habits, selectedHabitId]);

  const streak = activeHabit ? currentStreak(activeHabit, logs, pauses, todayIso) : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Mapa de Racha</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Los días en pausa no rompen el nodo activo
        </ThemedText>

        {habits.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chipRow}>
              {habits.map((habit) => {
                const isSelected = activeHabit?.id === habit.id;
                return (
                  <Pressable
                    key={habit.id}
                    onPress={() => setSelectedHabitId(habit.id)}
                    style={[
                      styles.habitChip,
                      { backgroundColor: theme.backgroundElement },
                      isSelected && { backgroundColor: '#3B82F6' },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: isSelected ? '#ffffff' : theme.text }}>
                      {habit.title}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {activeHabit ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <ThemedView type="backgroundElement" style={styles.activeHabitBanner}>
              <ThemedText type="smallBold">{activeHabit.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Meta: {activeHabit.target_value} {activeHabit.unit ?? ''} ({activeHabit.frequency})
              </ThemedText>
            </ThemedView>

            <StreakMap streak={streak} />
          </ScrollView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <ThemedText type="default">No tienes hábitos creados todavía.</ThemedText>
          </ThemedView>
        )}
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
    gap: Spacing.two,
  },
  chipsScroll: {
    maxHeight: 46,
    marginVertical: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  habitChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  content: {
    gap: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  activeHabitBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
});
