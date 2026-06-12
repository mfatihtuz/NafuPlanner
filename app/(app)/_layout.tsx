import '@/services/notifications/config';

import { Stack } from 'expo-router';

import { CelebrationProvider } from '@/features/celebration/CelebrationProvider';
import { t } from '@/i18n';
import { HouseholdProvider } from '@/services/household/HouseholdProvider';
import { colors } from '@/ui/theme/colors';
import { typography } from '@/ui/theme/typography';

export default function AppLayout() {
  return (
    <HouseholdProvider>
      <CelebrationProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerShadowVisible: false,
            headerTitleStyle: { ...typography.title, color: colors.textPrimary },
            headerTitleAlign: 'center',
            headerTintColor: colors.primaryDark,
            // iOS geri düğmesi, önceki ekranın başlığını gösterir; (tabs)'ın
            // başlığı olmadığı için "(tabs)" yazıyordu. Her yerde "Geri" yaz.
            headerBackTitle: t('common.back'),
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="task-form"
            options={{ presentation: 'modal', title: t('tasks.newTask') }}
          />
          <Stack.Screen name="task/[id]" options={{ title: '' }} />
          <Stack.Screen name="shopping-list/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="settings"
            options={{ presentation: 'modal', title: t('settings.title') }}
          />
          <Stack.Screen
            name="profile"
            options={{ presentation: 'modal', title: t('profile.title') }}
          />
          <Stack.Screen
            name="stats"
            options={{ presentation: 'modal', title: t('stats.title') }}
          />
          <Stack.Screen
            name="rewards"
            options={{ presentation: 'modal', title: t('rewards.title') }}
          />
          <Stack.Screen
            name="categories"
            options={{ presentation: 'modal', title: t('categories.title') }}
          />
          <Stack.Screen
            name="calendar"
            options={{ presentation: 'modal', title: t('calendar.title') }}
          />
          <Stack.Screen
            name="notifications"
            options={{ presentation: 'modal', title: t('notifications.title') }}
          />
        </Stack>
      </CelebrationProvider>
    </HouseholdProvider>
  );
}
