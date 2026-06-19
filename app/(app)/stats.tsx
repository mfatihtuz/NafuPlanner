import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { weeklyPoints } from '@/domain/gamification';
import { categoryDoneCounts, dailyDoneCounts } from '@/domain/stats';
import { useCategories } from '@/features/categories/useCategories';
import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Avatar, Card, Screen, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

const CHART_HEIGHT = 110;
const THIRTY_DAYS_MS = 30 * 86_400_000;

export default function StatsScreen() {
  const now = useNow();
  const { household, members } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const shoppingLists = useShoppingLists(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);

  const weekly = useMemo(
    () => weeklyPoints(tasks ?? [], shoppingLists ?? [], now),
    [tasks, shoppingLists, now],
  );
  const daily = useMemo(() => dailyDoneCounts(tasks ?? [], now), [tasks, now]);
  const byCategory = useMemo(
    () => categoryDoneCounts(tasks ?? [], now - THIRTY_DAYS_MS),
    [tasks, now],
  );

  const rankedMembers = useMemo(
    () => [...members].sort((a, b) => (weekly.get(b.userId) ?? 0) - (weekly.get(a.userId) ?? 0)),
    [members, weekly],
  );
  const maxWeekly = Math.max(1, ...rankedMembers.map((m) => weekly.get(m.userId) ?? 0));
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  const categoryRows = useMemo(() => {
    const list = [...byCategory.entries()].map(([categoryId, count]) => {
      const category = categoryId ? (categories ?? []).find((c) => c.id === categoryId) : null;
      return {
        key: categoryId ?? 'none',
        name: category?.name ?? t('stats.uncategorized'),
        color: category?.color ?? colors.textMuted,
        count,
      };
    });
    return list.sort((a, b) => b.count - a.count);
  }, [byCategory, categories]);
  const maxCategory = Math.max(1, ...categoryRows.map((r) => r.count));

  const hasAnyData = daily.some((d) => d.count > 0) || categoryRows.length > 0;

  if (tasks == null) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        {!hasAnyData ? (
          <Card>
            <Text variant="small" tone="secondary" center>
              {t('stats.empty')}
            </Text>
          </Card>
        ) : null}

        {/* Bu hafta: üye karşılaştırması */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('stats.thisWeek')}
          </Text>
          <Card style={{ gap: spacing.md }}>
            {rankedMembers.map((member) => {
              const pts = weekly.get(member.userId) ?? 0;
              return (
                <View
                  key={member.userId}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <Avatar
                    name={member.displayName}
                    photoUrl={member.photoUrl}
                    seed={member.userId}
                    size={28}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="caption" tone="secondary">
                      {member.displayName.split(' ')[0]}
                    </Text>
                    <View
                      style={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: colors.primaryTint,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(3, Math.round((pts / maxWeekly) * 100))}%`,
                          height: '100%',
                          borderRadius: 5,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </View>
                  </View>
                  <Text variant="small" style={{ fontWeight: '700', color: colors.primaryDark }}>
                    {pts}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Son 7 gün */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('stats.last7days')}
          </Text>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: CHART_HEIGHT + 28,
                gap: spacing.xs,
              }}
            >
              {daily.map((day) => (
                <View key={day.dayKey} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text variant="caption" tone="muted">
                    {day.count > 0 ? day.count : ''}
                  </Text>
                  <View
                    style={{
                      width: '62%',
                      height: Math.max(5, (day.count / maxDaily) * CHART_HEIGHT),
                      borderRadius: 6,
                      backgroundColor: day.count > 0 ? colors.primary : colors.primaryTint,
                    }}
                  />
                  <Text variant="caption" tone="muted">
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Kategoriler */}
        {categoryRows.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" tone="secondary">
              {t('stats.categories')}
            </Text>
            <Card style={{ gap: spacing.md }}>
              {categoryRows.map((row) => (
                <View
                  key={row.key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <View
                    style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: row.color }}
                  />
                  <Text variant="small" style={{ flex: 1 }}>
                    {row.name}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primaryTint,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(4, Math.round((row.count / maxCategory) * 100))}%`,
                        height: '100%',
                        borderRadius: 4,
                        backgroundColor: row.color,
                      }}
                    />
                  </View>
                  <Text variant="caption" tone="secondary">
                    {t('stats.totalDone', { n: row.count })}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
