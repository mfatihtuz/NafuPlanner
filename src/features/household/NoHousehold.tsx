import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { t } from '@/i18n';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Button, EmptyState } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

/**
 * Hane gerektiren sekmeler için kapı: yükleniyorsa spinner, hane yoksa
 * yönlendirme içeren boş durum, varsa children.
 */
export function RequireHousehold({ children }: { children: React.ReactNode }) {
  const { profileLoaded, household, householdLoaded } = useHousehold();
  const router = useRouter();

  if (!profileLoaded || !householdLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!household) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState
          expression="remind"
          title={t('household.noHouseholdTitle')}
          body={t('household.noHouseholdBody')}
        />
        <View style={{ paddingBottom: spacing.xl }}>
          <Button title={t('household.goHousehold')} onPress={() => router.navigate('/household')} />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}
