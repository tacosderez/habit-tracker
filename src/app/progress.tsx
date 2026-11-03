import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StreakMap } from '@/components/progress/streak-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { currentStreak, toIsoDate } from '@/domain';
import {
  PLACEHOLDER_HABITS,
  PLACEHOLDER_LOGS,
  PLACEHOLDER_PAUSES,
} from '@/features/habits/placeholders';

export default function ProgressScreen() {
  const streak = currentStreak(
    PLACEHOLDER_HABITS[0],
    PLACEHOLDER_LOGS,
    PLACEHOLDER_PAUSES,
    toIsoDate(new Date()),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Mapa de racha</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Los días en pausa no rompen el nodo activo
        </ThemedText>
        <StreakMap streak={streak} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing.two,
  },
});
