import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppDataProvider } from '@/context/app-data-context';
import { ThemeContextProvider, useThemePreference } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const { resolvedScheme } = useThemePreference();

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemeContextProvider>
      <AppDataProvider>
        <LayoutContent />
      </AppDataProvider>
    </ThemeContextProvider>
  );
}
