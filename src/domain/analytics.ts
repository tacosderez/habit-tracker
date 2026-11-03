import { addDays, parseIsoDate, toIsoDate } from '@/domain/dates';
import { completionPct, sumLogsOnDay } from '@/domain/progress';
import { isHabitDueOn, isHabitPausedOn } from '@/domain/schedule';
import type { Category, Habit, HabitLog, HabitPause } from '@/types/database';

export type HeatmapCell = {
  date: string;
  completionPct: number | null;
};

export type CategoryStat = {
  categoryId: string;
  name: string;
  colorHex: string;
  completionPct: number;
};

export function dailyHeatmap(
  habits: Habit[],
  logs: HabitLog[],
  pauses: HabitPause[],
  endIso: string,
  days = 119,
): HeatmapCell[] {
  const end = parseIsoDate(endIso);
  const start = addDays(end, -(days - 1));
  const cells: HeatmapCell[] = [];

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const isoDate = toIsoDate(cursor);
    const dueHabits = habits.filter(
      (habit) => isHabitDueOn(habit, isoDate) && !isHabitPausedOn(pauses, habit.id, isoDate),
    );

    if (dueHabits.length === 0) {
      cells.push({ date: isoDate, completionPct: null });
      continue;
    }

    const total = dueHabits.reduce((sum, habit) => {
      return sum + completionPct(habit, sumLogsOnDay(logs, habit.id, isoDate));
    }, 0);

    cells.push({ date: isoDate, completionPct: total / dueHabits.length });
  }

  return cells;
}

export function categoryPerformance(
  habits: Habit[],
  logs: HabitLog[],
  pauses: HabitPause[],
  categories: Category[],
): CategoryStat[] {
  return categories.map((category) => {
    const grouped = habits.filter((habit) => habit.category_id === category.id && !habit.is_archived);
    const scores: number[] = [];

    for (const habit of grouped) {
      const days = new Set(
        logs.filter((log) => log.habit_id === habit.id).map((log) => log.logged_on),
      );
      for (const isoDate of days) {
        if (isHabitPausedOn(pauses, habit.id, isoDate) || !isHabitDueOn(habit, isoDate)) {
          continue;
        }
        scores.push(completionPct(habit, sumLogsOnDay(logs, habit.id, isoDate)));
      }
    }

    const completion =
      scores.length === 0 ? 0 : scores.reduce((sum, value) => sum + value, 0) / scores.length;

    return {
      categoryId: category.id,
      name: category.name,
      colorHex: category.color_hex,
      completionPct: completion,
    };
  });
}
