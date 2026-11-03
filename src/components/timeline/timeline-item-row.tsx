import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TimelineItem } from '@/types/database';

export function TimelineItemRow({ item }: { item: TimelineItem }) {
  const color = item.category?.color_hex ?? '#64748B';
  const title = item.kind === 'habit' ? item.habit.title : item.reminder.title;
  const subtitle =
    item.kind === 'habit'
      ? item.paused
        ? 'En pausa'
        : `${Math.round(item.completionPct * 100)}%`
      : new Date(item.reminder.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <ThemedView style={styles.body}>
        <ThemedText>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.kind === 'habit' ? 'Hábito' : 'Recordatorio'} · {subtitle}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  swatch: {
    width: 10,
    height: 36,
    borderRadius: 999,
  },
  body: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
