import type { Habit, HabitLog } from '@/types/database';

export function sumLogsOnDay(logs: HabitLog[], habitId: string, isoDate: string): number {
  return logs
    .filter((log) => log.habit_id === habitId && log.logged_on === isoDate)
    .reduce((total, log) => total + Number(log.value), 0);
}

export function completionPct(habit: Habit, value: number): number {
  if (habit.target_value <= 0) {
    return 0;
  }
  return Math.min(1, value / Number(habit.target_value));
}

export function reminderContribution(habit: Habit, contributionValue: number | null): number {
  if (contributionValue != null) {
    return contributionValue;
  }
  return habit.tracking_type === 'boolean' ? 1 : Number(habit.target_value);
}
