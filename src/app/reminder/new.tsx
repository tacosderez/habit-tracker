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
import { addDays, toIsoDate } from '@/domain';
import { useTheme } from '@/hooks/use-theme';

export default function NewReminderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { habits, createReminder } = useAppData();

  const today = new Date();
  const todayStr = toIsoDate(today);
  const tomorrowStr = toIsoDate(addDays(today, 1));

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dateStr, setDateStr] = useState(todayStr);
  const [timeStr, setTimeStr] = useState('09:00');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [contributionValue, setContributionValue] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedHabit = habits.find((h) => h.id === selectedHabitId);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Falta título', 'Ingresa un título para el recordatorio.');
      return;
    }

    // Build ISO timestamp
    const dueAt = `${dateStr}T${timeStr}:00.000Z`;
    const numContribution = parseFloat(contributionValue);

    setIsSubmitting(true);
    try {
      await createReminder({
        title: title.trim(),
        notes: notes.trim() || null,
        due_at: dueAt,
        habit_id: selectedHabitId,
        contribution_value:
          selectedHabitId && !isNaN(numContribution) && numContribution > 0
            ? numContribution
            : null,
      });

      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear recordatorio';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="default" themeColor="textSecondary">
              ← Cancelar
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Nuevo Recordatorio</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Título *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="Ej. Tomar vitaminas, Llamar al médico, Enviar reporte"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Notas (opcional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="Detalles adicionales"
              placeholderTextColor={theme.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* Date Presets */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Fecha</ThemedText>
            <View style={styles.segmentedRow}>
              {[
                { label: 'Hoy', value: todayStr },
                { label: 'Mañana', value: tomorrowStr },
                { label: 'En 3 días', value: toIsoDate(addDays(today, 3)) },
              ].map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setDateStr(d.value)}
                  style={[
                    styles.segmentButton,
                    { backgroundColor: theme.backgroundElement },
                    dateStr === d.value && { backgroundColor: '#3B82F6' },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: dateStr === d.value ? '#ffffff' : theme.text }}>
                    {d.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Time Presets */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Hora</ThemedText>
            <View style={styles.segmentedRow}>
              {['08:00', '12:00', '18:00', '21:00'].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTimeStr(t)}
                  style={[
                    styles.segmentButton,
                    { backgroundColor: theme.backgroundElement },
                    timeStr === t && { backgroundColor: '#3B82F6' },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: timeStr === t ? '#ffffff' : theme.text }}>
                    {t}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              value={timeStr}
              onChangeText={setTimeStr}
              placeholder="HH:MM"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Link to Habit (Optional) */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Vincular a un hábito (opcional)</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Al completar este recordatorio, sumará avance al hábito elegido.
            </ThemedText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setSelectedHabitId(null)}
                  style={[
                    styles.habitChip,
                    { backgroundColor: theme.backgroundElement },
                    selectedHabitId === null && {
                      borderColor: '#3B82F6',
                      borderWidth: 2,
                    },
                  ]}>
                  <ThemedText type="small">Sin hábito vinculado</ThemedText>
                </Pressable>

                {habits.map((h) => {
                  const isSelected = selectedHabitId === h.id;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => setSelectedHabitId(h.id)}
                      style={[
                        styles.habitChip,
                        { backgroundColor: theme.backgroundElement },
                        isSelected && {
                          borderColor: '#3B82F6',
                          borderWidth: 2,
                        },
                      ]}>
                      <ThemedText type="smallBold">{h.title}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Contribution Value */}
          {selectedHabit && selectedHabit.tracking_type !== 'boolean' && (
            <View style={styles.field}>
              <ThemedText type="smallBold">
                Valor aportado al hábito ({selectedHabit.unit ?? 'unidades'})
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
                keyboardType="numeric"
                value={contributionValue}
                onChangeText={setContributionValue}
              />
            </View>
          )}

          {/* Submit */}
          <Pressable
            disabled={isSubmitting}
            onPress={handleSave}
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="default" style={styles.submitButtonText}>
                Guardar Recordatorio
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
  chipsScroll: {
    marginTop: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  habitChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
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
