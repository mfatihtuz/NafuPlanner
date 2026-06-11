import '@/services/notifications/config';

import { Stack } from 'expo-router';

import { t } from '@/i18n';
import { HouseholdProvider } from '@/services/household/HouseholdProvider';
import { colors } from '@/ui/theme/colors';
import { typography } from '@/ui/theme/typography';

export default function AppLayout() {
  return (
    <HouseholdProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTitleStyle: { ...typography.title, color: colors.textPrimary },
          headerTitleAlign: 'center',
          headerTintColor: colors.primaryDark,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task-form"
          options={{ presentation: 'modal', title: t('tasks.newTask') }}
        />
        <Stack.Screen name="task/[id]" options={{ title: '' }} />
        <Stack.Screen
          name="settings"
          options={{ presentation: 'modal', title: t('settings.title') }}
        />
      </Stack>
    </HouseholdProvider>
  );
}
