import { addDays, parseIsoDate, toIsoDate } from '@/domain/dates';
import { completionPct, sumLogsOnDay } from '@/domain/progress';
import { isHabitDueOn, isHabitPausedOn } from '@/domain/schedule';
import type { Habit, HabitLog, HabitPause, StreakNode } from '@/types/database';

export const DEFAULT_STREAK_NODES: StreakNode[] = [
  { threshold_days: 7, key: 'spark', title: '7 días', sort_order: 1 },
  { threshold_days: 21, key: 'habit', title: '21 días', sort_order: 2 },
  { threshold_days: 30, key: 'anchor', title: '30 días', sort_order: 3 },
];

function wasCompleted(habit: Habit, logs: HabitLog[], isoDate: string): boolean {
  return completionPct(habit, sumLogsOnDay(logs, habit.id, isoDate)) >= 1;
}

export function currentStreak(
  habit: Habit,
  logs: HabitLog[],
  pauses: HabitPause[],
  todayIso: string,
): number {
  let streak = 0;
  let cursor = parseIsoDate(todayIso);

  for (let i = 0; i < 3650; i += 1) {
    const isoDate = toIsoDate(cursor);

    if (isHabitPausedOn(pauses, habit.id, isoDate) || !isHabitDueOn(habit, isoDate)) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (!wasCompleted(habit, logs, isoDate)) {
      if (isoDate === todayIso) {
        cursor = addDays(cursor, -1);
        continue;
      }
      break;
    }

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function unlockedNodes(streak: number, nodes: StreakNode[] = DEFAULT_STREAK_NODES): string[] {
  return nodes.filter((node) => streak >= node.threshold_days).map((node) => node.key);
}
