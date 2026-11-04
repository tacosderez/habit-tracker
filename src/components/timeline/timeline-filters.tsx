import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Category } from '@/types/database';

type Props = {
  categoryId: string | 'all';
  categories: Category[];
  onCategoryChange: (value: string | 'all') => void;
};

export function TimelineFilters({ categoryId, categories, onCategoryChange }: Props) {
  return (
    <ThemedView style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        <Chip
          label="Todas"
          selected={categoryId === 'all'}
          onPress={() => onCategoryChange('all')}
        />
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
    gap: Spacing.one,
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
