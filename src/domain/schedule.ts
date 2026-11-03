import { isoWeekday, parseIsoDate } from '@/domain/dates';
import type { Habit, HabitPause } from '@/types/database';

export function isHabitPausedOn(pauses: HabitPause[], habitId: string, isoDate: string): boolean {
  return pauses.some(
    (pause) =>
      pause.habit_id === habitId &&
      pause.starts_on <= isoDate &&
      (pause.ends_on === null || pause.ends_on >= isoDate),
  );
}

export function isHabitDueOn(habit: Habit, isoDate: string): boolean {
  if (habit.is_archived) {
    return false;
  }

  const date = parseIsoDate(isoDate);
  const weekday = isoWeekday(date);
  const monthDay = date.getDate();

  if (habit.frequency === 'daily') {
    if (!habit.schedule_weekdays?.length) {
      return true;
    }
    return habit.schedule_weekdays.includes(weekday);
  }

  if (habit.frequency === 'weekly') {
    if (!habit.schedule_weekdays?.length) {
      return weekday === 1;
    }
    return habit.schedule_weekdays.includes(weekday);
  }

  if (!habit.schedule_month_days?.length) {
    return monthDay === 1;
  }
  return habit.schedule_month_days.includes(monthDay);
}
