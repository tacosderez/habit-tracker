import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DEFAULT_STREAK_NODES, unlockedNodes } from '@/domain/streaks';

export function StreakMap({ streak }: { streak: number }) {
  const unlocked = new Set(unlockedNodes(streak));

  return (
    <View style={styles.wrap}>
      <ThemedText type="title">{streak}</ThemedText>
      <ThemedText themeColor="textSecondary">días de racha activa</ThemedText>
      <View style={styles.nodes}>
        {DEFAULT_STREAK_NODES.map((node) => {
          const isOn = unlocked.has(node.key);
          return (
            <ThemedView
              key={node.key}
              type={isOn ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.node}>
              <ThemedText type="smallBold">{node.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isOn ? 'Desbloqueado' : 'Bloqueado'}
              </ThemedText>
            </ThemedView>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  nodes: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  node: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
