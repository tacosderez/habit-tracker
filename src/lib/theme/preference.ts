import { useColorScheme as useDeviceColorScheme } from '@/hooks/use-color-scheme';
import type { ThemePreference } from '@/types/database';

export function resolveColorScheme(
  preference: ThemePreference,
  deviceScheme: ReturnType<typeof useDeviceColorScheme>,
): 'light' | 'dark' {
  if (preference === 'system') {
    return deviceScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function useResolvedColorScheme(preference: ThemePreference = 'system'): 'light' | 'dark' {
  const deviceScheme = useDeviceColorScheme();
  return resolveColorScheme(preference, deviceScheme);
}
