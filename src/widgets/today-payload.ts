/**
 * Widget-safe payload. Keep this module free of React hooks and app providers.
 * expo-widgets (SDK 58) runs in an isolated runtime later; feed it this shape.
 */
import { buildTodayTimeline } from '@/domain/timeline';
import type { Category, Habit, HabitLog, HabitPause, Reminder } from '@/types/database';

export type TodayWidgetItem = {
  id: string;
  kind: 'habit' | 'reminder';
  title: string;
  colorHex: string;
  subtitle: string;
};

export function buildTodayWidgetPayload(input: {
  isoDate: string;
  habits: Habit[];
  reminders: Reminder[];
  logs: HabitLog[];
  pauses: HabitPause[];
  categories: Category[];
}): TodayWidgetItem[] {
  return buildTodayTimeline(input).map((item) => {
    if (item.kind === 'habit') {
      return {
        id: item.id,
        kind: 'habit',
        title: item.habit.title,
        colorHex: item.category?.color_hex ?? '#64748B',
        subtitle: item.paused ? 'Pausa' : `${Math.round(item.completionPct * 100)}%`,
      };
    }
    return {
      id: item.id,
      kind: 'reminder',
      title: item.reminder.title,
      colorHex: item.category?.color_hex ?? '#64748B',
      subtitle: item.reminder.due_at.slice(11, 16),
    };
  });
}
