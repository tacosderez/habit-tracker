import { useThemePreference } from '@/context/theme-context';

export function useTheme() {
  const { colors } = useThemePreference();
  return colors;
}
