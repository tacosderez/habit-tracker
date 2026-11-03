import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Category, HabitFrequency } from '@/types/database';

type Props = {
  frequency: HabitFrequency | 'all';
  categoryId: string | 'all';
  categories: Category[];
  onFrequencyChange: (value: HabitFrequency | 'all') => void;
  onCategoryChange: (value: string | 'all') => void;
};

const FREQUENCIES: { value: HabitFrequency | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

export function TimelineFilters({
  frequency,
  categoryId,
  categories,
  onFrequencyChange,
  onCategoryChange,
}: Props) {
  return (
    <ThemedView style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {FREQUENCIES.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={frequency === item.value}
            onPress={() => onFrequencyChange(item.value)}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip label="Todas" selected={categoryId === 'all'} onPress={() => onCategoryChange('all')} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            color={category.color_hex}
            selected={categoryId === category.id}
            onPress={() => onCategoryChange(category.id)}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.chip, color ? { borderColor: color, borderWidth: 1 } : null]}>
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
});
