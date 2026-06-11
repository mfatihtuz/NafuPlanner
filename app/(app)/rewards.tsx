import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { SYSTEM_REWARD_AUTHOR } from '@/domain/systemRewards';
import type { Reward } from '@/domain/types';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { addReward, removeReward, watchRewards } from '@/services/firestore/rewards';
import { useWatch } from '@/services/firestore/useWatch';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { redeemRewardFlow } from '@/services/workflows/taskWorkflows';
import { Button, Card, Icon, Screen, Text, TextField } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

const COST_STEP = 25;
const COST_MIN = 25;
const COST_MAX = 1000;

export default function RewardsScreen() {
  const { user } = useAuth();
  const { household, members, myMember } = useHousehold();
  const rewards = useWatch(household?.id ?? null, watchRewards);

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(100);
  const [busy, setBusy] = useState(false);

  const myPoints = myMember?.points ?? 0;
  const gid = household?.id;

  const onAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed || !gid || !user) return;
    setBusy(true);
    try {
      await addReward(gid, trimmed, cost, user.uid);
      setTitle('');
    } catch (error) {
      console.warn('[rewards] eklenemedi', error);
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));
    } finally {
      setBusy(false);
    }
  };

  const onRedeem = (reward: Reward) => {
    if (!user) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    redeemRewardFlow({ reward, actor, members })
      .then(() =>
        Alert.alert(t('common.appName'), t('rewards.redeemed', { reward: reward.title })),
      )
      .catch((error) => Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))));
  };

  const onRemove = (reward: Reward) => {
    if (!gid) return;
    Alert.alert(t('rewards.deleteTitle'), t('rewards.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeReward(gid, reward.id).catch((error) =>
            Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
          );
        },
      },
    ]);
  };

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="small" tone="secondary">
          {t('rewards.hint')}
        </Text>

        {/* Yeni ödül */}
        <Card style={{ gap: spacing.md }}>
          <TextField
            value={title}
            onChangeText={setTitle}
            placeholder={t('rewards.titlePlaceholder')}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text variant="small" tone="secondary" style={{ flex: 1 }}>
              {t('rewards.cost')}
            </Text>
            <Pressable
              hitSlop={8}
              accessibilityLabel="-"
              onPress={() => setCost((c) => Math.max(COST_MIN, c - COST_STEP))}
            >
              <Icon name="minus" size={22} color={colors.primaryDark} />
            </Pressable>
            <Text variant="h2" style={{ minWidth: 64, textAlign: 'center' }}>
              {cost}
            </Text>
            <Pressable
              hitSlop={8}
              accessibilityLabel="+"
              onPress={() => setCost((c) => Math.min(COST_MAX, c + COST_STEP))}
            >
              <Icon name="plus" size={22} color={colors.primaryDark} />
            </Pressable>
          </View>
          <Button
            title={t('common.add')}
            onPress={() => void onAdd()}
            loading={busy}
            disabled={title.trim().length === 0 || busy}
          />
        </Card>

        {/* Mevcut ödüller */}
        {rewards == null ? null : rewards.length === 0 ? (
          <Card>
            <Text variant="small" tone="secondary" center>
              {t('rewards.empty')}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {rewards.map((reward) => {
              const rewardCost = reward.costPoints ?? 0;
              const canRedeem = myPoints >= rewardCost;
              const isWeekly = reward.createdBy === SYSTEM_REWARD_AUTHOR;
              const isWon = reward.status === 'won';
              return (
                <Card
                  key={reward.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    ...(isWeekly ? { borderWidth: 1.5, borderColor: colors.reward } : null),
                  }}
                >
                  <Icon name={isWeekly ? 'sparkles' : 'gift'} size={24} color={colors.reward} />
                  <View style={{ flex: 1 }}>
                    {isWeekly ? (
                      <Text variant="caption" style={{ color: colors.reward, fontWeight: '700' }}>
                        {t('rewards.weeklyTitle')}
                      </Text>
                    ) : null}
                    <Text variant="bodyStrong">{reward.title}</Text>
                    <Text variant="caption" tone="secondary">
                      {t('rewards.costPoints', { n: rewardCost })}
                    </Text>
                  </View>
                  <Button
                    title={
                      isWon
                        ? t('rewards.weeklyWon')
                        : canRedeem
                          ? t('rewards.redeem')
                          : t('rewards.notEnough')
                    }
                    size="md"
                    fullWidth={false}
                    variant={canRedeem && !isWon ? 'primary' : 'ghost'}
                    disabled={!canRedeem || isWon}
                    onPress={() => onRedeem(reward)}
                  />
                  {/* Sistem ödülü silinemez (her hafta otomatik yenilenir). */}
                  {isWeekly ? null : (
                    <Pressable
                      hitSlop={8}
                      accessibilityLabel={t('common.delete')}
                      onPress={() => onRemove(reward)}
                    >
                      <Icon name="x" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
