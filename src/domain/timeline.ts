import { completionPct, sumLogsOnDay } from '@/domain/progress';
import { isHabitDueOn, isHabitPausedOn } from '@/domain/schedule';
import type { Category, Habit, HabitLog, HabitPause, Reminder, TimelineItem } from '@/types/database';

type TimelineInput = {
  isoDate: string;
  habits: Habit[];
  reminders: Reminder[];
  logs: HabitLog[];
  pauses: HabitPause[];
  categories: Category[];
};

export function buildTodayTimeline({
  isoDate,
  habits,
  reminders,
  logs,
  pauses,
  categories,
}: TimelineInput): TimelineItem[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));

  const habitItems: TimelineItem[] = habits
    .filter((habit) => isHabitDueOn(habit, isoDate))
    .map((habit) => {
      const progressValue = sumLogsOnDay(logs, habit.id, isoDate);
      return {
        kind: 'habit' as const,
        id: habit.id,
        sortAt: `${isoDate}T00:00:00.000Z`,
        habit,
        category: habit.category_id ? (categoryById.get(habit.category_id) ?? null) : null,
        progressValue,
        completionPct: completionPct(habit, progressValue),
        paused: isHabitPausedOn(pauses, habit.id, isoDate),
      };
    });

  const reminderItems: TimelineItem[] = reminders
    .filter((reminder) => reminder.due_at.slice(0, 10) === isoDate)
    .map((reminder) => {
      const habit = reminder.habit_id ? (habitById.get(reminder.habit_id) ?? null) : null;
      return {
        kind: 'reminder' as const,
        id: reminder.id,
        sortAt: reminder.due_at,
        reminder,
        habit,
        category: habit?.category_id ? (categoryById.get(habit.category_id) ?? null) : null,
      };
    });

  return [...habitItems, ...reminderItems].sort((a, b) => a.sortAt.localeCompare(b.sortAt));
}

export function filterTimeline(
  items: TimelineItem[],
  options: { frequency?: Habit['frequency'] | 'all'; categoryId?: string | 'all' },
): TimelineItem[] {
  return items.filter((item) => {
    const habit = item.kind === 'habit' ? item.habit : item.habit;
    if (!habit) {
      return options.frequency === undefined || options.frequency === 'all';
    }
    if (options.frequency && options.frequency !== 'all' && habit.frequency !== options.frequency) {
      return false;
    }
    if (options.categoryId && options.categoryId !== 'all' && habit.category_id !== options.categoryId) {
      return false;
    }
    return true;
  });
}
