import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_HABITS,
  PLACEHOLDER_LOGS,
  PLACEHOLDER_PAUSES,
  PLACEHOLDER_REMINDERS,
} from '@/features/habits/placeholders';
import { getSupabase } from '@/lib/supabase/client';
import type {
  Category,
  Habit,
  HabitLog,
  HabitPause,
  LogSource,
  Reminder,
  StreakNode,
} from '@/types/database';

type AppDataContextType = {
  userId: string | null;
  categories: Category[];
  habits: Habit[];
  reminders: Reminder[];
  logs: HabitLog[];
  pauses: HabitPause[];
  streakNodes: StreakNode[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  refreshData: () => Promise<void>;

  // Habit mutations
  createHabit: (habit: {
    title: string;
    description?: string | null;
    category_id?: string | null;
    frequency: Habit['frequency'];
    tracking_type: Habit['tracking_type'];
    target_value: number;
    unit?: string | null;
    schedule_weekdays?: number[] | null;
    schedule_month_days?: number[] | null;
  }) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  pauseHabit: (habitId: string, startsOn: string, endsOn?: string | null, reason?: string) => Promise<void>;
  resumeHabit: (habitId: string) => Promise<void>;

  // Progress log mutations
  logProgress: (habitId: string, isoDate: string, value: number, source?: LogSource) => Promise<void>;
  toggleBooleanProgress: (habitId: string, isoDate: string) => Promise<void>;
  deleteLogsOnDay: (habitId: string, isoDate: string) => Promise<void>;

  // Reminder mutations
  createReminder: (reminder: {
    title: string;
    notes?: string | null;
    due_at: string;
    habit_id?: string | null;
    contribution_value?: number | null;
  }) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminderComplete: (reminderId: string, completed: boolean) => Promise<void>;

  // Category mutations
  createCategory: (cat: { name: string; color_hex: string; icon?: string | null }) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(PLACEHOLDER_CATEGORIES);
  const [habits, setHabits] = useState<Habit[]>(PLACEHOLDER_HABITS);
  const [reminders, setReminders] = useState<Reminder[]>(PLACEHOLDER_REMINDERS);
  const [logs, setLogs] = useState<HabitLog[]>(PLACEHOLDER_LOGS);
  const [pauses, setPauses] = useState<HabitPause[]>(PLACEHOLDER_PAUSES);
  const [streakNodes, setStreakNodes] = useState<StreakNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Auth & Supabase Session
  const initAuth = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);
        return session.user.id;
      }

      // Try anonymous sign-in
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && anonData?.user) {
        setUserId(anonData.user.id);
        return anonData.user.id;
      }

      // If anon sign-in failed, check if user session exists or log warning
      if (anonError) {
        console.warn('Supabase anonymous sign-in warning:', anonError.message);
      }
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      console.warn('Auth initialization error:', message);
      setError(message);
      return null;
    }
  }, []);

  const refreshData = useCallback(async () => {
    queueMicrotask(() => setIsSyncing(true));
    try {
      const supabase = getSupabase();
      let currentUid = userId;
      if (!currentUid) {
        currentUid = await initAuth();
      }

      const [catRes, habitRes, reminderRes, logRes, pauseRes, nodeRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('habits').select('*').order('created_at', { ascending: true }),
        supabase.from('reminders').select('*').order('due_at', { ascending: true }),
        supabase.from('habit_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('habit_pauses').select('*').order('starts_on', { ascending: false }),
        supabase.from('streak_nodes').select('*').order('sort_order', { ascending: true }),
      ]);

      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data as Category[]);
      }
      if (habitRes.data) {
        setHabits(habitRes.data as Habit[]);
      }
      if (reminderRes.data) {
        setReminders(reminderRes.data as Reminder[]);
      }
      if (logRes.data) {
        setLogs(logRes.data as HabitLog[]);
      }
      if (pauseRes.data) {
        setPauses(pauseRes.data as HabitPause[]);
      }
      if (nodeRes.data) {
        setStreakNodes(nodeRes.data as StreakNode[]);
      }
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar datos';
      console.warn('Supabase fetch error:', message);
      setError(message);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [initAuth, userId]);

  useEffect(() => {
    let isSubscribed = true;
    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (isSubscribed) {
        await refreshData();
      }
    })();
    return () => {
      isSubscribed = false;
    };
  }, [refreshData]);

  // Habit mutations
  const createHabit = async (habitInput: {
    title: string;
    description?: string | null;
    category_id?: string | null;
    frequency: Habit['frequency'];
    tracking_type: Habit['tracking_type'];
    target_value: number;
    unit?: string | null;
    schedule_weekdays?: number[] | null;
    schedule_month_days?: number[] | null;
  }): Promise<Habit> => {
    const supabase = getSupabase();
    let uid = userId;
    if (!uid) uid = await initAuth();

    const newHabitRecord = {
      user_id: uid ?? 'local',
      title: habitInput.title.trim(),
      description: habitInput.description?.trim() || null,
      category_id: habitInput.category_id || null,
      frequency: habitInput.frequency,
      tracking_type: habitInput.tracking_type,
      target_value: habitInput.tracking_type === 'boolean' ? 1 : Number(habitInput.target_value),
      unit: habitInput.tracking_type === 'boolean' ? null : habitInput.unit || null,
      schedule_weekdays: habitInput.schedule_weekdays ?? null,
      schedule_month_days: habitInput.schedule_month_days ?? null,
      is_archived: false,
    };

    const { data, error: insertError } = await supabase
      .from('habits')
      .insert(newHabitRecord)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const created = data as Habit;
    setHabits((prev) => [...prev, created]);
    return created;
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    const supabase = getSupabase();
    // Optimistic update
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));

    const { error: updateError } = await supabase.from('habits').update(updates).eq('id', id);

    if (updateError) {
      refreshData();
      throw updateError;
    }
  };

  const deleteHabit = async (id: string) => {
    const supabase = getSupabase();
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => prev.filter((l) => l.habit_id !== id));
    setPauses((prev) => prev.filter((p) => p.habit_id !== id));

    const { error: deleteError } = await supabase.from('habits').delete().eq('id', id);
    if (deleteError) {
      refreshData();
      throw deleteError;
    }
  };

  const pauseHabit = async (
    habitId: string,
    startsOn: string,
    endsOn?: string | null,
    reason?: string,
  ) => {
    const supabase = getSupabase();
    let uid = userId;
    if (!uid) uid = await initAuth();

    const pauseRecord = {
      user_id: uid ?? 'local',
      habit_id: habitId,
      starts_on: startsOn,
      ends_on: endsOn ?? null,
      reason: reason ?? null,
    };

    const { data, error: pauseError } = await supabase
      .from('habit_pauses')
      .insert(pauseRecord)
      .select()
      .single();

    if (pauseError) throw pauseError;
    if (data) {
      setPauses((prev) => [data as HabitPause, ...prev]);
    }
  };

  const resumeHabit = async (habitId: string) => {
    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    const activePause = pauses.find(
      (p) => p.habit_id === habitId && (p.ends_on === null || p.ends_on >= today),
    );

    if (activePause) {
      const { error: resumeError } = await supabase
        .from('habit_pauses')
        .update({ ends_on: today })
        .eq('id', activePause.id);

      if (resumeError) throw resumeError;
      setPauses((prev) =>
        prev.map((p) => (p.id === activePause.id ? { ...p, ends_on: today } : p)),
      );
    }
  };

  // Progress Log mutations
  const logProgress = async (
    habitId: string,
    isoDate: string,
    value: number,
    source: LogSource = 'manual',
  ) => {
    if (value <= 0) return;
    const supabase = getSupabase();
    let uid = userId;
    if (!uid) uid = await initAuth();

    const tempId = `temp-${Date.now()}`;
    const newLog: HabitLog = {
      id: tempId,
      user_id: uid ?? 'local',
      habit_id: habitId,
      reminder_id: null,
      logged_on: isoDate,
      value,
      source,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setLogs((prev) => [newLog, ...prev]);

    const { data, error: logError } = await supabase
      .from('habit_logs')
      .insert({
        user_id: uid ?? 'local',
        habit_id: habitId,
        logged_on: isoDate,
        value,
        source,
      })
      .select()
      .single();

    if (logError) {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      throw logError;
    }

    if (data) {
      setLogs((prev) => prev.map((l) => (l.id === tempId ? (data as HabitLog) : l)));
    }
  };

  const deleteLogsOnDay = async (habitId: string, isoDate: string) => {
    const supabase = getSupabase();
    const toDelete = logs.filter((l) => l.habit_id === habitId && l.logged_on === isoDate);
    if (toDelete.length === 0) return;

    setLogs((prev) =>
      prev.filter((l) => !(l.habit_id === habitId && l.logged_on === isoDate)),
    );

    for (const item of toDelete) {
      await supabase.from('habit_logs').delete().eq('id', item.id);
    }
  };

  const toggleBooleanProgress = async (habitId: string, isoDate: string) => {
    const todayLogs = logs.filter((l) => l.habit_id === habitId && l.logged_on === isoDate);
    const currentSum = todayLogs.reduce((sum, l) => sum + Number(l.value), 0);

    if (currentSum >= 1) {
      // Toggle off -> remove logs for today
      await deleteLogsOnDay(habitId, isoDate);
    } else {
      // Toggle on -> log 1
      await logProgress(habitId, isoDate, 1, 'manual');
    }
  };

  // Reminder mutations
  const createReminder = async (reminderInput: {
    title: string;
    notes?: string | null;
    due_at: string;
    habit_id?: string | null;
    contribution_value?: number | null;
  }): Promise<Reminder> => {
    const supabase = getSupabase();
    let uid = userId;
    if (!uid) uid = await initAuth();

    const record = {
      user_id: uid ?? 'local',
      title: reminderInput.title.trim(),
      notes: reminderInput.notes?.trim() || null,
      due_at: reminderInput.due_at,
      status: 'pending' as const,
      habit_id: reminderInput.habit_id || null,
      contribution_value: reminderInput.contribution_value || null,
    };

    const { data, error: insertError } = await supabase
      .from('reminders')
      .insert(record)
      .select()
      .single();

    if (insertError) throw insertError;
    const created = data as Reminder;
    setReminders((prev) => [...prev, created]);
    return created;
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const supabase = getSupabase();
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    const { error: updateError } = await supabase.from('reminders').update(updates).eq('id', id);

    if (updateError) {
      refreshData();
      throw updateError;
    }
  };

  const deleteReminder = async (id: string) => {
    const supabase = getSupabase();
    setReminders((prev) => prev.filter((r) => r.id !== id));

    const { error: deleteError } = await supabase.from('reminders').delete().eq('id', id);
    if (deleteError) {
      refreshData();
      throw deleteError;
    }
  };

  const toggleReminderComplete = async (reminderId: string, completed: boolean) => {
    const supabase = getSupabase();
    const newStatus = completed ? 'completed' : 'pending';
    const completedAt = completed ? new Date().toISOString() : null;

    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId ? { ...r, status: newStatus, completed_at: completedAt } : r,
      ),
    );

    const { error: updateError } = await supabase
      .from('reminders')
      .update({
        status: newStatus,
        completed_at: completedAt,
      })
      .eq('id', reminderId);

    if (updateError) {
      refreshData();
      throw updateError;
    } else {
      // Refresh logs because of Supabase trigger reminders_sync_habit_log
      const { data: logData } = await supabase
        .from('habit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (logData) {
        setLogs(logData as HabitLog[]);
      }
    }
  };

  // Category mutations
  const createCategory = async (catInput: {
    name: string;
    color_hex: string;
    icon?: string | null;
  }): Promise<Category> => {
    const supabase = getSupabase();
    let uid = userId;
    if (!uid) uid = await initAuth();

    const record = {
      user_id: uid ?? 'local',
      name: catInput.name.trim(),
      color_hex: catInput.color_hex,
      icon: catInput.icon || 'tag',
      sort_order: categories.length + 1,
    };

    const { data, error: catError } = await supabase
      .from('categories')
      .insert(record)
      .select()
      .single();

    if (catError) throw catError;
    const created = data as Category;
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const supabase = getSupabase();
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

    const { error: updateError } = await supabase.from('categories').update(updates).eq('id', id);

    if (updateError) {
      refreshData();
      throw updateError;
    }
  };

  const deleteCategory = async (id: string) => {
    const supabase = getSupabase();
    setCategories((prev) => prev.filter((c) => c.id !== id));
    // Category id in habits becomes null
    setHabits((prev) =>
      prev.map((h) => (h.category_id === id ? { ...h, category_id: null } : h)),
    );

    const { error: delError } = await supabase.from('categories').delete().eq('id', id);
    if (delError) {
      refreshData();
      throw delError;
    }
  };

  return (
    <AppDataContext.Provider
      value={{
        userId,
        categories,
        habits,
        reminders,
        logs,
        pauses,
        streakNodes,
        isLoading,
        isSyncing,
        error,
        refreshData,
        createHabit,
        updateHabit,
        deleteHabit,
        pauseHabit,
        resumeHabit,
        logProgress,
        toggleBooleanProgress,
        deleteLogsOnDay,
        createReminder,
        updateReminder,
        deleteReminder,
        toggleReminderComplete,
        createCategory,
        updateCategory,
        deleteCategory,
      }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
