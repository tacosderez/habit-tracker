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

const WEEKDAYS = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'M' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 7, label: 'D' },
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

  const [title, setTitle] = useState(habit?.title ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(habit?.category_id ?? null);
  const [frequency] = useState<HabitFrequency>(habit?.frequency ?? 'daily');
  const [trackingType] = useState<TrackingType>(habit?.tracking_type ?? 'boolean');
  const [targetValue, setTargetValue] = useState(String(habit?.target_value ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(habit?.schedule_weekdays ?? []);
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

    setIsSubmitting(true);
    try {
      await updateHabit(habit.id, {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        frequency,
        tracking_type: trackingType,
        target_value: trackingType === 'boolean' ? 1 : numTarget,
        unit: trackingType === 'boolean' ? null : unit.trim() || null,
        schedule_weekdays: weekdays.length > 0 ? weekdays : null,
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

          {/* Weekdays */}
          {frequency !== 'monthly' && (
            <View style={styles.field}>
              <ThemedText type="smallBold">Días programados</ThemedText>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((w) => {
                  const isSelected = weekdays.includes(w.id);
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => toggleWeekday(w.id)}
                      style={[
                        styles.weekdayCircle,
                        { backgroundColor: theme.backgroundElement },
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
