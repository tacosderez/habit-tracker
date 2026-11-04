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

const WEEKDAYS = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'M' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 7, label: 'D' },
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
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [trackingType, setTrackingType] = useState<TrackingType>('boolean');
  const [targetValue, setTargetValue] = useState('1');
  const [unit, setUnit] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
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

    setIsSubmitting(true);
    try {
      await createHabit({
        title: title.trim(),
        description: description.trim() || null,
        category_id: selectedCategoryId,
        frequency,
        tracking_type: trackingType,
        target_value: trackingType === 'boolean' ? 1 : numTarget,
        unit: trackingType === 'boolean' ? null : unit.trim() || null,
        schedule_weekdays: selectedWeekdays.length > 0 ? selectedWeekdays : null,
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

          {/* Frequency */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Frecuencia</ThemedText>
            <View style={styles.segmentedRow}>
              {[
                { freq: 'daily' as HabitFrequency, label: 'Diaria' },
                { freq: 'weekly' as HabitFrequency, label: 'Semanal' },
                { freq: 'monthly' as HabitFrequency, label: 'Mensual' },
              ].map((f) => (
                <Pressable
                  key={f.freq}
                  onPress={() => setFrequency(f.freq)}
                  style={[
                    styles.segmentButton,
                    { backgroundColor: theme.backgroundElement },
                    frequency === f.freq && {
                      backgroundColor: '#3B82F6',
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: frequency === f.freq ? '#ffffff' : theme.text }}>
                    {f.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Specific Weekdays */}
          {frequency !== 'monthly' && (
            <View style={styles.field}>
              <ThemedText type="smallBold">Días específicos</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Selecciona días puntuales o déjalo vacío para todos los días
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
  segmentedRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
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
