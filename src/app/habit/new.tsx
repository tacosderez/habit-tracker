import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function NewHabitScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { categories, createHabit } = useAppData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  // Measurement type
  const [trackingType, setTrackingType] = useState<TrackingType>('boolean');
  const [targetValue, setTargetValue] = useState('1');
  const [unit, setUnit] = useState('');

  // Schedule mode: 'daily' | 'specific_days' | 'weekly' | 'monthly'
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [weeklyTimes, setWeeklyTimes] = useState<number>(3);
  const [weeklyFixDays, setWeeklyFixDays] = useState<boolean>(false);
  const [monthlyTimes, setMonthlyTimes] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Falta información', 'Por favor ingresa un nombre para el hábito.');
      return;
    }

    const numTarget = parseFloat(targetValue);
    if (trackingType !== 'boolean' && (isNaN(numTarget) || numTarget <= 0)) {
      Alert.alert('Meta inválida', 'La meta debe ser un número positivo.');
      return;
    }

    // Validate schedule mode
    let finalFrequency: HabitFrequency = 'daily';
    let finalWeekdays: number[] | null = null;

    if (scheduleMode === 'daily') {
      finalFrequency = 'daily';
      finalWeekdays = null;
    } else if (scheduleMode === 'specific_days') {
      if (selectedWeekdays.length === 0) {
        Alert.alert(
          'Días requeridos',
          'Selecciona al menos un día de la semana para este hábito puntual.',
        );
        return;
      }
      finalFrequency = 'daily';
      finalWeekdays = selectedWeekdays;
    } else if (scheduleMode === 'weekly') {
      finalFrequency = 'weekly';
      if (weeklyFixDays && selectedWeekdays.length > 0) {
        finalWeekdays = selectedWeekdays;
      } else {
        finalWeekdays = null;
      }
    } else if (scheduleMode === 'monthly') {
      finalFrequency = 'monthly';
      finalWeekdays = null;
    }

    setIsSubmitting(true);
    try {
      await createHabit({
        title: title.trim(),
        description: description.trim() || null,
        category_id: selectedCategoryId,
        frequency: finalFrequency,
        tracking_type: trackingType,
        target_value: trackingType === 'boolean' ? 1 : numTarget,
        unit: trackingType === 'boolean' ? null : unit.trim() || null,
        schedule_weekdays: finalWeekdays,
      });

      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el hábito';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="default" themeColor="textSecondary">
              ← Cancelar
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Nuevo Hábito</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Nombre del hábito *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="Ej. Beber agua, Leer 20 páginas, Meditar"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Descripción o notas (opcional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="Detalles o motivación para este hábito"
              placeholderTextColor={theme.textSecondary}
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
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
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

          {/* Schedule Mode Selector (Diario, Días específicos, Semanal, Mensual) */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Frecuencia y Programación</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ¿Cuándo quieres realizar este hábito?
            </ThemedText>

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

            {/* Sub-prompt based on scheduleMode */}
            {scheduleMode === 'daily' && (
              <ThemedView type="backgroundElement" style={styles.promptBox}>
                <ThemedText type="small">
                  ✓ Este hábito se programará automáticamente para todos los días de la semana.
                </ThemedText>
              </ThemedView>
            )}

            {scheduleMode === 'specific_days' && (
              <ThemedView type="backgroundElement" style={styles.promptBox}>
                <ThemedText type="smallBold">
                  Selecciona los días específicos de la semana:
                </ThemedText>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w) => {
                    const isSelected = selectedWeekdays.includes(w.id);
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
                  {selectedWeekdays.length === 0
                    ? 'Selecciona al menos un día'
                    : selectedWeekdays.map((id) => WEEKDAYS.find((d) => d.id === id)?.name).join(', ')}
                </ThemedText>
              </ThemedView>
            )}

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
                      const isSelected = selectedWeekdays.includes(w.id);
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

          {/* Tracking Type */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Tipo de medición</ThemedText>
            <View style={styles.optionsRow}>
              {[
                { type: 'boolean' as TrackingType, label: 'Sí / No', desc: 'Checkmark' },
                { type: 'numeric' as TrackingType, label: 'Numérico', desc: 'ml, pasos, etc.' },
                { type: 'duration' as TrackingType, label: 'Tiempo', desc: 'minutos/segundos' },
              ].map((opt) => {
                const isSelected = trackingType === opt.type;
                return (
                  <Pressable
                    key={opt.type}
                    onPress={() => {
                      setTrackingType(opt.type);
                      if (opt.type === 'duration' && !unit) setUnit('min');
                      if (opt.type === 'numeric' && !unit) setUnit('veces');
                    }}
                    style={[
                      styles.optionCard,
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
          </View>

          {/* Numeric / Duration Target Inputs */}
          {trackingType !== 'boolean' && (
            <View style={styles.targetRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText type="smallBold">Meta diaria *</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                  placeholder="Ej. 2000"
                  placeholderTextColor={theme.textSecondary}
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
                  placeholder="Ej. ml, págs, min"
                  placeholderTextColor={theme.textSecondary}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            disabled={isSubmitting}
            onPress={handleSave}
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="default" style={styles.submitButtonText}>
                Guardar Hábito
              </ThemedText>
            )}
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
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  optionCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
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
});
