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
import { useTheme } from '@/hooks/use-theme';

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const {
    reminders,
    habits,
    updateReminder,
    deleteReminder,
    toggleReminderComplete,
  } = useAppData();

  const reminder = useMemo(() => reminders.find((r) => r.id === id), [reminders, id]);

  const initialDate = reminder ? reminder.due_at.slice(0, 10) : '';
  const initialTime = reminder ? reminder.due_at.slice(11, 16) : '09:00';

  const [title, setTitle] = useState(reminder?.title ?? '');
  const [notes, setNotes] = useState(reminder?.notes ?? '');
  const [dateStr, setDateStr] = useState(initialDate);
  const [timeStr, setTimeStr] = useState(initialTime);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(reminder?.habit_id ?? null);
  const [contributionValue, setContributionValue] = useState(
    String(reminder?.contribution_value ?? 1),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reminder) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Recordatorio no encontrado</ThemedText>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="linkPrimary">← Volver a Hoy</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isCompleted = reminder.status === 'completed';
  const selectedHabit = habits.find((h) => h.id === selectedHabitId);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Falta título', 'El recordatorio debe tener un título.');
      return;
    }

    const dueAt = `${dateStr}T${timeStr}:00.000Z`;
    const numContribution = parseFloat(contributionValue);

    setIsSubmitting(true);
    try {
      await updateReminder(reminder.id, {
        title: title.trim(),
        notes: notes.trim() || null,
        due_at: dueAt,
        habit_id: selectedHabitId,
        contribution_value:
          selectedHabitId && !isNaN(numContribution) && numContribution > 0
            ? numContribution
            : null,
      });

      Alert.alert('Éxito', 'Recordatorio actualizado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar recordatorio';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async () => {
    try {
      await toggleReminderComplete(reminder.id, !isCompleted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar recordatorio',
      `¿Deseas eliminar el recordatorio "${reminder.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(reminder.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Error al eliminar';
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="default" themeColor="textSecondary">
              ← Volver
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Editar Recordatorio</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          {/* Status Banner */}
          <ThemedView type="backgroundElement" style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <ThemedText type="smallBold">Estado actual</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isCompleted ? '✓ Completado' : '⏳ Pendiente'}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleToggleComplete}
              style={[styles.statusToggle, isCompleted && styles.completedToggle]}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {isCompleted ? 'Marcar Pendiente' : '✓ Marcar Completado'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Title */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Título *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
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
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* Date & Time */}
          <View style={styles.dateTimeRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText type="smallBold">Fecha</ThemedText>
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

            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText type="smallBold">Hora</ThemedText>
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
          </View>

          {/* Linked Habit */}
          <View style={styles.field}>
            <ThemedText type="smallBold">Vincular a un hábito</ThemedText>
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

          {/* Contribution */}
          {selectedHabit && selectedHabit.tracking_type !== 'boolean' && (
            <View style={styles.field}>
              <ThemedText type="smallBold">
                Valor aportado ({selectedHabit.unit ?? 'unidades'})
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

          {/* Save Button */}
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

          {/* Delete Button */}
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <ThemedText type="smallBold" style={styles.deleteButtonText}>
              Eliminar Recordatorio
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
  statusCard: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    gap: Spacing.half,
  },
  statusToggle: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  completedToggle: {
    backgroundColor: '#64748B',
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.three,
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
  deleteButton: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
});
