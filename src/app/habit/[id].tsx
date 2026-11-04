import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { currentStreak, isHabitPausedOn, toIsoDate } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import type { HabitFrequency, TrackingType } from '@/types/database';

export type ScheduleMode = 'daily' | 'specific_days' | 'weekly' | 'monthly';

export const WEEKDAYS = [
  { id: 1, label: 'L', name: 'Lunes' },
  { id: 2, label: 'M', name: 'Martes' },
  { id: 3, label: 'M', name: 'Miércoles' },
  { id: 4, label: 'J', name: 'Jueves' },
  { id: 5, label: 'V', name: 'Viernes' },
  { id: 6, label: 'S', name: 'Sábado' },
  { id: 7, label: 'D', name: 'Domingo' },
];

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const todayIso = toIsoDate(new Date());

  const {
    habits,
    categories,
    logs,
    pauses,
    updateHabit,
    deleteHabit,
    pauseHabit,
    resumeHabit,
  } = useAppData();

  const habit = useMemo(() => habits.find((h) => h.id === id), [habits, id]);

  const initialScheduleMode: ScheduleMode = useMemo(() => {
    if (!habit) return 'daily';
    if (habit.frequency === 'monthly') return 'monthly';
    if (habit.frequency === 'weekly') return 'weekly';
    if (habit.schedule_weekdays && habit.schedule_weekdays.length > 0) return 'specific_days';
    return 'daily';
  }, [habit]);

  const [title, setTitle] = useState(habit?.title ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(habit?.category_id ?? null);
  const [trackingType] = useState<TrackingType>(habit?.tracking_type ?? 'boolean');
  const [targetValue, setTargetValue] = useState(String(habit?.target_value ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? '');

  // Schedule mode state
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(initialScheduleMode);
  const [weekdays, setWeekdays] = useState<number[]>(habit?.schedule_weekdays ?? []);
  const [weeklyTimes, setWeeklyTimes] = useState<number>(3);
  const [weeklyFixDays, setWeeklyFixDays] = useState<boolean>(
    Boolean(habit?.schedule_weekdays && habit.schedule_weekdays.length > 0),
  );
  const [monthlyTimes, setMonthlyTimes] = useState<number>(1);

  const [pauseReason, setPauseReason] = useState('');
  const [showPauseInput, setShowPauseInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPaused = habit ? isHabitPausedOn(pauses, habit.id, todayIso) : false;
  const streak = habit ? currentStreak(habit, logs, pauses, todayIso) : 0;

  if (!habit) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Hábito no encontrado</ThemedText>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="linkPrimary">← Volver a Hoy</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Falta título', 'El hábito debe tener un título.');
      return;
    }

    const numTarget = parseFloat(targetValue);
    if (trackingType !== 'boolean' && (isNaN(numTarget) || numTarget <= 0)) {
      Alert.alert('Meta inválida', 'La meta debe ser un número positivo.');
      return;
    }

    // Determine final frequency and weekdays
    let finalFrequency: HabitFrequency = 'daily';
    let finalWeekdays: number[] | null = null;

    if (scheduleMode === 'daily') {
      finalFrequency = 'daily';
      finalWeekdays = null;
    } else if (scheduleMode === 'specific_days') {
      if (weekdays.length === 0) {
        Alert.alert(
          'Días requeridos',
          'Selecciona al menos un día específico de la semana.',
        );
        return;
      }
      finalFrequency = 'daily';
      finalWeekdays = weekdays;
    } else if (scheduleMode === 'weekly') {
      finalFrequency = 'weekly';
      finalWeekdays = weeklyFixDays && weekdays.length > 0 ? weekdays : null;
    } else if (scheduleMode === 'monthly') {
      finalFrequency = 'monthly';
      finalWeekdays = null;
    }

    setIsSubmitting(true);
    try {
      await updateHabit(habit.id, {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        frequency: finalFrequency,
        tracking_type: trackingType,
        target_value: trackingType === 'boolean' ? 1 : numTarget,
        unit: trackingType === 'boolean' ? null : unit.trim() || null,
        schedule_weekdays: finalWeekdays,
      });

      Alert.alert('Éxito', 'Hábito actualizado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el hábito';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await resumeHabit(habit.id);
        Alert.alert('Hábito reanudado', 'El hábito ya está activo de nuevo.');
      } else {
        await pauseHabit(habit.id, todayIso, null, pauseReason.trim() || undefined);
        setShowPauseInput(false);
        setPauseReason('');
        Alert.alert(
          'Hábito en pausa',
          'Los días transcurridos no romperán tu racha mientras esté pausado.',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al gestionar la pausa';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar hábito',
      `¿Estás seguro de que deseas eliminar permanentemente "${habit.title}" y su historial de registros?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habit.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Error al eliminar el hábito';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="default" themeColor="textSecondary">
              ← Volver
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Editar Hábito</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          {/* Stats Bar */}
          <ThemedView type="backgroundElement" style={styles.statsCard}>
            <View style={styles.statCol}>
              <ThemedText type="title" style={styles.statValue}>
                {streak}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                días de racha
              </ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <ThemedText type="default" style={styles.statValue}>
                {isPaused ? '⏸ Pausado' : '🔥 Activo'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isPaused ? 'Racha protegida' : 'En progreso'}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Pause/Resume Section */}
          <ThemedView type="backgroundElement" style={styles.pauseCard}>
            <ThemedText type="smallBold">Protección de Racha</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isPaused
                ? 'El hábito está en pausa. Puedes reanudarlo cuando estés listo.'
                : 'Pausa este hábito si estás de viaje, enfermo o descansando, sin perder tu racha.'}
            </ThemedText>

            {!isPaused && showPauseInput && (
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
                ]}
                placeholder="Motivo (ej. Vacaciones, Salud)"
                placeholderTextColor={theme.textSecondary}
                value={pauseReason}
                onChangeText={setPauseReason}
              />
            )}

            <Pressable
              onPress={() => {
                if (!isPaused && !showPauseInput) {
                  setShowPauseInput(true);
                } else {
                  handleTogglePause();
                }
              }}
              style={[styles.pauseButton, isPaused && styles.resumeButton]}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {isPaused ? '▶ Reanudar Hábito' : showPauseInput ? 'Confirmar Pausa' : '⏸ Pausar Hábito'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Title */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Nombre del hábito *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Descripción (opcional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Categoría</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chipRow}>
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: theme.backgroundElement },
                        isSelected && {
                          borderColor: cat.color_hex,
                          borderWidth: 2,
                          backgroundColor: theme.backgroundSelected,
                        },
                      ]}>
                      <View style={[styles.colorDot, { backgroundColor: cat.color_hex }]} />
                      <ThemedText type="small">{cat.name}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Schedule Mode Selector */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Frecuencia y Programación</ThemedText>
            <View style={styles.scheduleGrid}>
              {[
                { key: 'daily' as ScheduleMode, label: '☀️ Diario', desc: 'Todos los días' },
                {
                  key: 'specific_days' as ScheduleMode,
                  label: '📅 Días específicos',
                  desc: 'Elige qué días',
                },
                { key: 'weekly' as ScheduleMode, label: '🔄 Semanal', desc: 'X veces por sem.' },
                { key: 'monthly' as ScheduleMode, label: '🗓️ Mensual', desc: 'X veces por mes' },
              ].map((opt) => {
                const isSelected = scheduleMode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setScheduleMode(opt.key)}
                    style={[
                      styles.scheduleCard,
                      { backgroundColor: theme.backgroundElement },
                      isSelected && { borderColor: '#3B82F6', borderWidth: 2 },
                    ]}>
                    <ThemedText type="smallBold">{opt.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {opt.desc}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Prompt: Daily */}
            {scheduleMode === 'daily' && (
              <ThemedView type="backgroundElement" style={styles.promptBox}>
                <ThemedText type="small">
                  ✓ Este hábito se programa para todos los días de la semana.
                </ThemedText>
              </ThemedView>
            )}

            {/* Prompt: Specific Days */}
            {scheduleMode === 'specific_days' && (
              <ThemedView type="backgroundElement" style={styles.promptBox}>
                <ThemedText type="smallBold">
                  Selecciona los días específicos de la semana:
                </ThemedText>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w) => {
                    const isSelected = weekdays.includes(w.id);
                    return (
                      <Pressable
                        key={w.id}
                        onPress={() => toggleWeekday(w.id)}
                        style={[
                          styles.weekdayCircle,
                          { backgroundColor: theme.backgroundSelected },
                          isSelected && { backgroundColor: '#3B82F6' },
                        ]}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: isSelected ? '#ffffff' : theme.text }}>
                          {w.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {weekdays.length === 0
                    ? 'Selecciona al menos un día'
                    : weekdays.map((id) => WEEKDAYS.find((d) => d.id === id)?.name).join(', ')}
                </ThemedText>
              </ThemedView>
            )}

            {/* Prompt: Weekly */}
            {scheduleMode === 'weekly' && (
              <ThemedView type="backgroundElement" style={styles.promptBox}>
                <ThemedText type="smallBold">¿Cuántas veces a la semana?</ThemedText>
                <View style={styles.pillsRow}>
                  {[1, 2, 3, 4, 5, 6].map((times) => (
                    <Pressable
                      key={times}
                      onPress={() => setWeeklyTimes(times)}
                      style={[
                        styles.numberPill,
                        { backgroundColor: theme.backgroundSelected },
                        weeklyTimes === times && { backgroundColor: '#3B82F6' },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: weeklyTimes === times ? '#ffffff' : theme.text }}>
                        {times}x
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.subQuestionRow}>
                  <ThemedText type="smallBold">¿Fijar días específicos de la semana?</ThemedText>
                  <View style={styles.toggleRow}>
                    <Pressable
                      onPress={() => setWeeklyFixDays(false)}
                      style={[
                        styles.toggleButton,
                        !weeklyFixDays && { backgroundColor: '#3B82F6' },
                      ]}>
                      <ThemedText
                        type="small"
                        style={{ color: !weeklyFixDays ? '#ffffff' : theme.text }}>
                        Flexible
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => setWeeklyFixDays(true)}
                      style={[
                        styles.toggleButton,
                        weeklyFixDays && { backgroundColor: '#3B82F6' },
                      ]}>
                      <ThemedText
                        type="small"
                        style={{ color: weeklyFixDays ? '#ffffff' : theme.text }}>
                        Fijar días
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {weeklyFixDays && (
                  <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((w) => {
                      const isSelected = weekdays.includes(w.id);
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => toggleWeekday(w.id)}
                          style={[
                            styles.weekdayCircle,
                            { backgroundColor: theme.backgroundSelected },
                            isSelected && { backgroundColor: '#3B82F6' },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{ color: isSelected ? '#ffffff' : theme.text }}>
                            {w.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </ThemedView>
            )}

            {/* Prompt: Monthly */}
            {scheduleMode === 'monthly' && (
              <ThemedView type="backgroundElement" style={styles.promptBox}>
                <ThemedText type="smallBold">¿Cuántas veces al mes?</ThemedText>
                <View style={styles.pillsRow}>
                  {[1, 2, 3, 4].map((times) => (
                    <Pressable
                      key={times}
                      onPress={() => setMonthlyTimes(times)}
                      style={[
                        styles.numberPill,
                        { backgroundColor: theme.backgroundSelected },
                        monthlyTimes === times && { backgroundColor: '#3B82F6' },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: monthlyTimes === times ? '#ffffff' : theme.text }}>
                        {times} {times === 1 ? 'vez' : 'veces'}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </ThemedView>
            )}
          </View>

          {/* Target Value and Unit */}
          {trackingType !== 'boolean' && (
            <View style={styles.targetRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText type="smallBold">Meta diaria</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                  keyboardType="numeric"
                  value={targetValue}
                  onChangeText={setTargetValue}
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText type="smallBold">Unidad</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <Pressable
            disabled={isSubmitting}
            onPress={handleSave}
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="default" style={styles.submitButtonText}>
                Guardar Cambios
              </ThemedText>
            )}
          </Pressable>

          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <ThemedText type="smallBold" style={styles.deleteButtonText}>
              Eliminar Hábito
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  backButton: {
    paddingVertical: Spacing.one,
  },
  form: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  statsCard: {
    flexDirection: 'row',
    padding: Spacing.four,
    borderRadius: Spacing.three,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  statValue: {
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
  },
  pauseCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  pauseButton: {
    backgroundColor: '#EAB308',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  resumeButton: {
    backgroundColor: '#22C55E',
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    marginTop: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  scheduleCard: {
    width: '48%',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
  promptBox: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  numberPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  subQuestionRow: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  targetRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  weekdayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
});
