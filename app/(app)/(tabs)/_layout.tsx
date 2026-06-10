import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { t } from '@/i18n';
import { Icon, type IconName } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { typography } from '@/ui/theme/typography';

function tabIcon(name: IconName) {
  function TabBarIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color as string} size={24} />;
  }
  return TabBarIcon;
}

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { ...typography.title, color: colors.textPrimary },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { ...typography.caption },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.today'), tabBarIcon: tabIcon('calendar') }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: t('tabs.tasks'), tabBarIcon: tabIcon('checkSquare') }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: t('tabs.shopping'), tabBarIcon: tabIcon('cart') }}
      />
      <Tabs.Screen
        name="household"
        options={{ title: t('tabs.household'), tabBarIcon: tabIcon('users') }}
      />
    </Tabs>
  );
}
