import type { Category, Habit, HabitLog, HabitPause, Reminder } from '@/types/database';

export const PLACEHOLDER_CATEGORIES: Category[] = [
  {
    id: 'cat-physical',
    user_id: 'local',
    name: 'Físico',
    color_hex: '#22C55E',
    icon: 'dumbbell',
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-finance',
    user_id: 'local',
    name: 'Finanzas',
    color_hex: '#EAB308',
    icon: 'wallet',
    sort_order: 2,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-creative',
    user_id: 'local',
    name: 'Creativo',
    color_hex: '#A855F7',
    icon: 'palette',
    sort_order: 3,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

export const PLACEHOLDER_HABITS: Habit[] = [
  {
    id: 'habit-water',
    user_id: 'local',
    category_id: 'cat-physical',
    title: 'Beber agua',
    description: null,
    frequency: 'daily',
    tracking_type: 'numeric',
    target_value: 2000,
    unit: 'ml',
    schedule_weekdays: null,
    schedule_month_days: null,
    is_archived: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'habit-write',
    user_id: 'local',
    category_id: 'cat-creative',
    title: 'Escribir',
    description: null,
    frequency: 'weekly',
    tracking_type: 'duration',
    target_value: 1800,
    unit: 's',
    schedule_weekdays: [1, 4],
    schedule_month_days: null,
    is_archived: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const PLACEHOLDER_REMINDERS: Reminder[] = [];
export const PLACEHOLDER_LOGS: HabitLog[] = [];
export const PLACEHOLDER_PAUSES: HabitPause[] = [];
