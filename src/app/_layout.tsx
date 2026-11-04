import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDataProvider } from '@/context/app-data-context';
import { ThemeContextProvider, useThemePreference } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { resolvedScheme } = useThemePreference();

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="habit/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="habit/[id]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="reminder/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="reminder/[id]"
          options={{ presentation: 'card', headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <AppDataProvider>
        <RootNavigator />
      </AppDataProvider>
    </ThemeContextProvider>
  );
}
