import { Image } from 'expo-image';
import { Alert, View } from 'react-native';

import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { Button, Card, Icon, Nafu, Screen, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

function Stat({ icon, label, value }: { icon: 'star' | 'flame'; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Icon name={icon} size={20} color={colors.primary} />
      <View>
        <Text variant="bodyStrong">{value}</Text>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function HouseholdScreen() {
  const { user, signOut } = useAuth();

  const comingSoon = () =>
    Alert.alert(t('common.appName'), t('common.comingSoon'));

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          {user?.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <Nafu size={64} expression="happy" />
          )}
          <View style={{ flex: 1 }}>
            <Text variant="title">{user?.displayName ?? t('household.title')}</Text>
            {user?.email ? (
              <Text variant="small" tone="secondary">
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.xxl,
            marginTop: spacing.lg,
            paddingTop: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Stat icon="star" label={t('profile.points')} value="0" />
          <Stat icon="flame" label={t('profile.streak')} value="0" />
        </View>
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Button
          title={t('household.create')}
          variant="secondary"
          leftSlot={<Icon name="home" size={20} color={colors.primaryDark} />}
          onPress={comingSoon}
        />
        <Button
          title={t('household.join')}
          variant="ghost"
          leftSlot={<Icon name="users" size={20} color={colors.primaryDark} />}
          onPress={comingSoon}
        />
      </View>

      <View style={{ flex: 1 }} />

      <Button
        title={t('common.logout')}
        variant="ghost"
        leftSlot={<Icon name="logout" size={20} color={colors.primaryDark} />}
        onPress={signOut}
      />
    </Screen>
  );
}
