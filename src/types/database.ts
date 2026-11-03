export type ThemePreference = 'system' | 'light' | 'dark';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type TrackingType = 'boolean' | 'numeric' | 'duration';
export type ReminderStatus = 'pending' | 'completed' | 'cancelled' | 'snoozed';
export type LogSource = 'manual' | 'reminder' | 'widget';

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  theme_preference: ThemePreference;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  color_hex: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  tracking_type: TrackingType;
  target_value: number;
  unit: string | null;
  schedule_weekdays: number[] | null;
  schedule_month_days: number[] | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitPause = {
  id: string;
  habit_id: string;
  user_id: string;
  starts_on: string;
  ends_on: string | null;
  reason: string | null;
  created_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  habit_id: string | null;
  title: string;
  notes: string | null;
  due_at: string;
  status: ReminderStatus;
  completed_at: string | null;
  contribution_value: number | null;
  created_at: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  user_id: string;
  habit_id: string;
  reminder_id: string | null;
  logged_on: string;
  value: number;
  source: LogSource;
  created_at: string;
};

export type StreakNode = {
  threshold_days: number;
  key: string;
  title: string;
  sort_order: number;
};

export type TimelineKind = 'habit' | 'reminder';

export type TimelineItem =
  | {
      kind: 'habit';
      id: string;
      sortAt: string;
      habit: Habit;
      category: Category | null;
      progressValue: number;
      completionPct: number;
      paused: boolean;
    }
  | {
      kind: 'reminder';
      id: string;
      sortAt: string;
      reminder: Reminder;
      habit: Habit | null;
      category: Category | null;
    };
