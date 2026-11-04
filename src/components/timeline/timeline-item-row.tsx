import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TimelineItem } from '@/types/database';

type TimelineItemRowProps = {
  item: TimelineItem;
  onToggleComplete?: () => void;
  onAddProgress?: (amount: number) => void;
};

export function TimelineItemRow({ item, onToggleComplete, onAddProgress }: TimelineItemRowProps) {
  const router = useRouter();
  const color = item.category?.color_hex ?? '#64748B';
  const isHabit = item.kind === 'habit';

  const isCompleted = isHabit
    ? item.completionPct >= 1
    : item.reminder.status === 'completed';

  const title = isHabit ? item.habit.title : item.reminder.title;

  let subtitle = '';
  if (isHabit) {
    if (item.paused) {
      subtitle = 'En pausa (racha protegida)';
    } else if (item.habit.tracking_type === 'boolean') {
      subtitle = isCompleted ? 'Completado hoy' : 'Pendiente';
    } else {
      const unit = item.habit.unit ? ` ${item.habit.unit}` : '';
      subtitle = `${item.progressValue} / ${item.habit.target_value}${unit} (${Math.round(
        item.completionPct * 100,
      )}%)`;
    }
  } else {
    const timeStr = new Date(item.reminder.due_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    subtitle = `Recordatorio · ${timeStr}${isCompleted ? ' · Listo' : ''}`;
  }

  const handlePressRow = () => {
    if (isHabit) {
      router.push(`/habit/${item.habit.id}` as never);
    } else {
      router.push(`/reminder/${item.reminder.id}` as never);
    }
  };

  const handleQuickAdd = () => {
    if (!isHabit || !onAddProgress) return;
    if (item.habit.tracking_type === 'numeric') {
      const step = item.habit.target_value >= 100 ? 100 : item.habit.target_value >= 10 ? 5 : 1;
      onAddProgress(step);
    } else if (item.habit.tracking_type === 'duration') {
      // 5 minutes or 300 seconds if stored in seconds
      const step = item.habit.target_value > 300 ? 300 : 60;
      onAddProgress(step);
    }
  };

  return (
    <Pressable onPress={handlePressRow} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {/* Category color indicator */}
        <View style={[styles.swatch, { backgroundColor: color }]} />

        {/* Content body */}
        <View style={styles.body}>
          <ThemedText
            type="default"
            style={[styles.title, isCompleted && !isHabit && styles.completedText]}>
            {title}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>

          {/* Progress bar for numeric/duration habits */}
          {isHabit && item.habit.tracking_type !== 'boolean' && (
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.round(item.completionPct * 100))}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Quick step button for numeric/duration habits if not complete */}
          {isHabit && item.habit.tracking_type !== 'boolean' && !isCompleted && onAddProgress && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAdd();
              }}
              style={styles.quickAddButton}>
              <ThemedText type="smallBold" style={{ color: color }}>
                +
              </ThemedText>
            </Pressable>
          )}

          {/* Main completion checkbox */}
          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation();
              onToggleComplete?.();
            }}
            style={[
              styles.checkbox,
              isCompleted && { backgroundColor: color, borderColor: color },
            ]}>
            {isCompleted && (
              <ThemedText type="smallBold" style={styles.checkIcon}>
                ✓
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  swatch: {
    width: 6,
    height: '100%',
    minHeight: 40,
    borderRadius: 999,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
    marginTop: Spacing.half,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  quickAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(128, 128, 128, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -2,
  },
});
