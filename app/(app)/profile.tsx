import { View } from 'react-native';

import {
  BADGES,
  levelForPoints,
  levelProgress,
  pointsToNextLevel,
} from '@/domain/gamification';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Avatar, Card, Icon, Screen, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { spacing } from '@/ui/theme/spacing';

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card padded={false} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
      <Text variant="h2" style={{ color: colors.primaryDark }}>
        {value}
      </Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </Card>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { myMember } = useHousehold();

  const points = myMember?.points ?? 0;
  const level = levelForPoints(points);
  const progress = levelProgress(points);
  const earned = new Set(myMember?.earnedBadgeKeys ?? []);

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
          <Avatar
            name={user?.displayName ?? '?'}
            photoUrl={user?.photoURL}
            seed={user?.uid}
            size={84}
          />
          <Text variant="h1" center>
            {user?.displayName}
          </Text>
          <View
            style={{
              backgroundColor: colors.primarySoft,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xxs,
            }}
          >
            <Text variant="small" style={{ color: colors.primaryDark, fontWeight: '700' }}>
              {t('profile.level', { n: level })}
            </Text>
          </View>
        </View>

        {/* Seviye ilerlemesi */}
        <Card style={{ gap: spacing.sm }}>
          <View
            style={{
              height: 12,
              borderRadius: 6,
              backgroundColor: colors.primaryTint,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.max(4, Math.round(progress * 100))}%`,
                height: '100%',
                borderRadius: 6,
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <Text variant="caption" tone="secondary" center>
            {t('profile.nextLevel', { n: pointsToNextLevel(points) })}
          </Text>
        </Card>

        {/* İstatistikler */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatBox label={t('profile.points')} value={String(points)} />
          <StatBox
            label={t('profile.streak')}
            value={t('profile.streakDays', { n: myMember?.streakCount ?? 0 })}
          />
          <StatBox label={t('profile.tasksDone')} value={String(myMember?.tasksCompleted ?? 0)} />
        </View>

        {/* Rozetler */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('profile.badges')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {BADGES.map((badge) => {
              const has = earned.has(badge.key);
              return (
                <View
                  key={badge.key}
                  style={{
                    width: '31%',
                    flexGrow: 1,
                    alignItems: 'center',
                    gap: spacing.xs,
                    backgroundColor: has ? colors.rewardSoft : colors.surface,
                    borderWidth: 1,
                    borderColor: has ? colors.reward : colors.border,
                    borderRadius: radii.lg,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.xs,
                    opacity: has ? 1 : 0.55,
                  }}
                >
                  <Icon
                    name={badge.icon as never}
                    size={26}
                    color={has ? colors.reward : colors.textMuted}
                  />
                  <Text variant="small" center style={{ fontWeight: '600' }}>
                    {badge.name}
                  </Text>
                  <Text variant="caption" tone="muted" center>
                    {badge.description}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
}
