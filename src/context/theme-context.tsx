import React, { createContext, useContext, useState } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme as useDeviceColorScheme } from '@/hooks/use-color-scheme';
import { resolveColorScheme } from '@/lib/theme/preference';
import type { ThemePreference } from '@/types/database';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

type ThemeContextType = {
  preference: ThemePreference;
  resolvedScheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  resolvedScheme: 'light',
  setPreference: () => {},
  colors: Colors.light,
});

export function ThemeContextProvider({
  children,
  initialPreference = 'system',
}: {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const deviceScheme = useDeviceColorScheme();
  const resolvedScheme = resolveColorScheme(preference, deviceScheme);
  const colors = Colors[resolvedScheme];

  return (
    <ThemeContext.Provider value={{ preference, resolvedScheme, setPreference, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
