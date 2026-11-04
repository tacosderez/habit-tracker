import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_HABITS,
  PLACEHOLDER_LOGS,
  PLACEHOLDER_PAUSES,
  PLACEHOLDER_REMINDERS,
} from '@/features/habits/placeholders';
import { addDays, parseIsoDate, toIsoDate } from '@/domain';
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
  authWarning: string | null;
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
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // Initialize Auth & Supabase Session
  const initAuth = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);
        setAuthWarning(null);
        return session.user.id;
      }

      // Try anonymous sign-in
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && anonData?.user) {
        setUserId(anonData.user.id);
        setAuthWarning(null);
        return anonData.user.id;
      }

      // If anon sign-in failed, record warning
      if (anonError) {
        setAuthWarning(anonError.message);
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
      if (habitRes.data && habitRes.data.length > 0) {
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
      console.warn('Supabase fetch warning:', message);
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
    let uid = userId;
    if (!uid) uid = await initAuth();

    const localId = `habit-${Date.now()}`;
    const newHabitRecord: Habit = {
      id: localId,
      user_id: uid ?? 'local-device',
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Always persist in local state immediately
    setHabits((prev) => [...prev, newHabitRecord]);

    // If Supabase user is authenticated, sync to Supabase
    if (uid && uid !== 'local-device') {
      try {
        const supabase = getSupabase();
        const { data, error: insertError } = await supabase
          .from('habits')
          .insert({
            user_id: uid,
            title: newHabitRecord.title,
            description: newHabitRecord.description,
            category_id: newHabitRecord.category_id,
            frequency: newHabitRecord.frequency,
            tracking_type: newHabitRecord.tracking_type,
            target_value: newHabitRecord.target_value,
            unit: newHabitRecord.unit,
            schedule_weekdays: newHabitRecord.schedule_weekdays,
            schedule_month_days: newHabitRecord.schedule_month_days,
            is_archived: false,
          })
          .select()
          .single();

        if (insertError) {
          console.warn('Supabase insert warning:', insertError.message);
        } else if (data) {
          setHabits((prev) => prev.map((h) => (h.id === localId ? (data as Habit) : h)));
          return data as Habit;
        }
      } catch (err: unknown) {
        console.warn('Supabase sync error on createHabit:', err);
      }
    }

    return newHabitRecord;
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    // Optimistic update
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase.from('habits').update(updates).eq('id', id);
      } catch (err: unknown) {
        console.warn('Supabase update warning on habit:', err);
      }
    }
  };

  const deleteHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => prev.filter((l) => l.habit_id !== id));
    setPauses((prev) => prev.filter((p) => p.habit_id !== id));

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase.from('habits').delete().eq('id', id);
      } catch (err: unknown) {
        console.warn('Supabase delete warning on habit:', err);
      }
    }
  };

  const pauseHabit = async (
    habitId: string,
    startsOn: string,
    endsOn?: string | null,
    reason?: string,
  ) => {
    let uid = userId;
    if (!uid) uid = await initAuth();

    const localPause: HabitPause = {
      id: `pause-${Date.now()}`,
      user_id: uid ?? 'local-device',
      habit_id: habitId,
      starts_on: startsOn,
      ends_on: endsOn ?? null,
      reason: reason ?? null,
      created_at: new Date().toISOString(),
    };

    setPauses((prev) => [localPause, ...prev]);

    if (uid && uid !== 'local-device') {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('habit_pauses')
          .insert({
            user_id: uid,
            habit_id: habitId,
            starts_on: startsOn,
            ends_on: endsOn ?? null,
            reason: reason ?? null,
          })
          .select()
          .single();

        if (data) {
          setPauses((prev) => prev.map((p) => (p.id === localPause.id ? (data as HabitPause) : p)));
        }
      } catch (err: unknown) {
        console.warn('Supabase pause warning:', err);
      }
    }
  };

  const resumeHabit = async (habitId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const activePause = pauses.find(
      (p) => p.habit_id === habitId && (p.ends_on === null || p.ends_on >= today),
    );

    if (!activePause) return;

    const startsOn = activePause.starts_on;
    const isStartedTodayOrLater = startsOn >= today;

    if (isStartedTodayOrLater) {
      // Pause started today or in the future: delete it so today is active
      setPauses((prev) => prev.filter((p) => p.id !== activePause.id));

      if (userId && userId !== 'local-device') {
        try {
          const supabase = getSupabase();
          await supabase.from('habit_pauses').delete().eq('id', activePause.id);
        } catch (err: unknown) {
          console.warn('Supabase resume delete warning:', err);
        }
      }
    } else {
      // Pause started in the past: set ends_on to yesterday so today is active
      const yesterday = toIsoDate(addDays(parseIsoDate(today), -1));
      setPauses((prev) =>
        prev.map((p) => (p.id === activePause.id ? { ...p, ends_on: yesterday } : p)),
      );

      if (userId && userId !== 'local-device') {
        try {
          const supabase = getSupabase();
          await supabase
            .from('habit_pauses')
            .update({ ends_on: yesterday })
            .eq('id', activePause.id);
        } catch (err: unknown) {
          console.warn('Supabase resume update warning:', err);
        }
      }
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
    let uid = userId;
    if (!uid) uid = await initAuth();

    const tempId = `log-${Date.now()}`;
    const newLog: HabitLog = {
      id: tempId,
      user_id: uid ?? 'local-device',
      habit_id: habitId,
      reminder_id: null,
      logged_on: isoDate,
      value,
      source,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setLogs((prev) => [newLog, ...prev]);

    if (uid && uid !== 'local-device') {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('habit_logs')
          .insert({
            user_id: uid,
            habit_id: habitId,
            logged_on: isoDate,
            value,
            source,
          })
          .select()
          .single();

        if (data) {
          setLogs((prev) => prev.map((l) => (l.id === tempId ? (data as HabitLog) : l)));
        }
      } catch (err: unknown) {
        console.warn('Supabase logProgress warning:', err);
      }
    }
  };

  const deleteLogsOnDay = async (habitId: string, isoDate: string) => {
    const toDelete = logs.filter((l) => l.habit_id === habitId && l.logged_on === isoDate);
    if (toDelete.length === 0) return;

    setLogs((prev) =>
      prev.filter((l) => !(l.habit_id === habitId && l.logged_on === isoDate)),
    );

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        for (const item of toDelete) {
          if (!item.id.startsWith('log-')) {
            await supabase.from('habit_logs').delete().eq('id', item.id);
          }
        }
      } catch (err: unknown) {
        console.warn('Supabase deleteLogs warning:', err);
      }
    }
  };

  const toggleBooleanProgress = async (habitId: string, isoDate: string) => {
    const todayLogs = logs.filter((l) => l.habit_id === habitId && l.logged_on === isoDate);
    const currentSum = todayLogs.reduce((sum, l) => sum + Number(l.value), 0);

    if (currentSum >= 1) {
      await deleteLogsOnDay(habitId, isoDate);
    } else {
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
    let uid = userId;
    if (!uid) uid = await initAuth();

    const localReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      user_id: uid ?? 'local-device',
      title: reminderInput.title.trim(),
      notes: reminderInput.notes?.trim() || null,
      due_at: reminderInput.due_at,
      status: 'pending' as const,
      habit_id: reminderInput.habit_id || null,
      contribution_value: reminderInput.contribution_value || null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setReminders((prev) => [...prev, localReminder]);

    if (uid && uid !== 'local-device') {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('reminders')
          .insert({
            user_id: uid,
            title: localReminder.title,
            notes: localReminder.notes,
            due_at: localReminder.due_at,
            status: 'pending',
            habit_id: localReminder.habit_id,
            contribution_value: localReminder.contribution_value,
          })
          .select()
          .single();

        if (data) {
          setReminders((prev) =>
            prev.map((r) => (r.id === localReminder.id ? (data as Reminder) : r)),
          );
          return data as Reminder;
        }
      } catch (err: unknown) {
        console.warn('Supabase createReminder warning:', err);
      }
    }

    return localReminder;
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase.from('reminders').update(updates).eq('id', id);
      } catch (err: unknown) {
        console.warn('Supabase updateReminder warning:', err);
      }
    }
  };

  const deleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase.from('reminders').delete().eq('id', id);
      } catch (err: unknown) {
        console.warn('Supabase deleteReminder warning:', err);
      }
    }
  };

  const toggleReminderComplete = async (reminderId: string, completed: boolean) => {
    const newStatus = completed ? 'completed' : 'pending';
    const completedAt = completed ? new Date().toISOString() : null;

    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId ? { ...r, status: newStatus, completed_at: completedAt } : r,
      ),
    );

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase
          .from('reminders')
          .update({
            status: newStatus,
            completed_at: completedAt,
          })
          .eq('id', reminderId);

        const { data: logData } = await supabase
          .from('habit_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (logData) {
          setLogs(logData as HabitLog[]);
        }
      } catch (err: unknown) {
        console.warn('Supabase toggleReminderComplete warning:', err);
      }
    }
  };

  // Category mutations
  const createCategory = async (catInput: {
    name: string;
    color_hex: string;
    icon?: string | null;
  }): Promise<Category> => {
    let uid = userId;
    if (!uid) uid = await initAuth();

    const localCat: Category = {
      id: `cat-${Date.now()}`,
      user_id: uid ?? 'local-device',
      name: catInput.name.trim(),
      color_hex: catInput.color_hex,
      icon: catInput.icon || 'tag',
      sort_order: categories.length + 1,
      created_at: new Date().toISOString(),
    };

    setCategories((prev) => [...prev, localCat]);

    if (uid && uid !== 'local-device') {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('categories')
          .insert({
            user_id: uid,
            name: localCat.name,
            color_hex: localCat.color_hex,
            icon: localCat.icon,
            sort_order: localCat.sort_order,
          })
          .select()
          .single();

        if (data) {
          setCategories((prev) =>
            prev.map((c) => (c.id === localCat.id ? (data as Category) : c)),
          );
          return data as Category;
        }
      } catch (err: unknown) {
        console.warn('Supabase createCategory warning:', err);
      }
    }

    return localCat;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase.from('categories').update(updates).eq('id', id);
      } catch (err: unknown) {
        console.warn('Supabase updateCategory warning:', err);
      }
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setHabits((prev) =>
      prev.map((h) => (h.category_id === id ? { ...h, category_id: null } : h)),
    );

    if (userId && userId !== 'local-device') {
      try {
        const supabase = getSupabase();
        await supabase.from('categories').delete().eq('id', id);
      } catch (err: unknown) {
        console.warn('Supabase deleteCategory warning:', err);
      }
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
        authWarning,
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
