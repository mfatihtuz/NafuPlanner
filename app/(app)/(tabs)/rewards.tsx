import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { actorOf } from '@/services/auth/actor';
import { canApproveReward, groupRewards } from '@/domain/rewards';
import { SYSTEM_REWARD_AUTHOR } from '@/domain/systemRewards';
import type { Reward } from '@/domain/types';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { addReward, removeReward, RewardError, watchRewards } from '@/services/firestore/rewards';
import { useWatch } from '@/services/firestore/useWatch';
import { useHousehold } from '@/services/household/HouseholdProvider';
import {
  approveRewardFlow,
  claimRewardFlow,
  fulfillRewardFlow,
  rejectRewardFlow,
} from '@/services/workflows/rewardWorkflows';
import { Button, Card, Icon, Screen, Text, TextField, type IconName } from '@/ui';
import { useColors } from '@/ui/theme';
import { spacing } from '@/ui/theme/spacing';

const COST_STEP = 25;
const COST_MIN = 25;
const COST_MAX = 1000;

const firstName = (name?: string) => (name ?? t('common.member')).split(' ')[0];

/** Ortak ödül kartı: ikon + başlık + meta + aksiyon(lar) + opsiyonel sil. */
function RewardCard({
  reward,
  weekly,
  meta,
  actions,
  onDelete,
}: {
  reward: Reward;
  weekly: boolean;
  meta?: ReactNode;
  actions?: ReactNode;
  onDelete?: () => void;
}) {
  const colors = useColors();
  return (
    <Card
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        ...(weekly ? { borderWidth: 1.5, borderColor: colors.reward } : null),
      }}
    >
      <Icon name={weekly ? 'sparkles' : 'gift'} size={24} color={colors.reward} />
      <View style={{ flex: 1, gap: 2 }}>
        {weekly ? (
          <Text variant="caption" style={{ color: colors.reward, fontWeight: '700' }}>
            {t('rewards.weeklyTitle')}
          </Text>
        ) : null}
        <Text variant="bodyStrong">{reward.title}</Text>
        {meta}
      </View>
      {actions}
      {onDelete ? (
        <Pressable hitSlop={8} accessibilityLabel={t('common.delete')} onPress={onDelete}>
          <Icon name="x" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Card>
  );
}

function Section({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Icon name={icon} size={14} color={colors.textSecondary} />
        <Text variant="overline" tone="secondary">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function RewardsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { household, members, myMember } = useHousehold();
  const rewards = useWatch(household?.id ?? null, watchRewards);

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(100);
  const [busy, setBusy] = useState(false);

  const myPoints = myMember?.points ?? 0;
  const gid = household?.id;
  const uid = user?.uid ?? '';

  const groups = useMemo(() => groupRewards(rewards ?? []), [rewards]);

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

  const report = (error: unknown) =>
    Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));

  const onClaim = (reward: Reward) => {
    if (!user) return;
    Alert.alert(
      t('common.appName'),
      t('rewards.claimConfirm', { reward: reward.title, n: reward.costPoints ?? 0 }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('rewards.redeem'),
          onPress: () =>
            claimRewardFlow({ reward, actor: actorOf(user), members })
              .then(() =>
                Alert.alert(t('common.appName'), t('rewards.redeemed', { reward: reward.title })),
              )
              .catch((error) => {
                if (error instanceof RewardError) {
                  Alert.alert(
                    t('common.appName'),
                    error.reason === 'already-claimed'
                      ? t('rewards.alreadyClaimed')
                      : error.reason === 'insufficient'
                        ? t('rewards.notEnough')
                        : firestoreErrorMessage(error, t('common.error')),
                  );
                } else {
                  report(error);
                }
              }),
        },
      ],
    );
  };

  const onFulfill = (reward: Reward) => {
    if (!user) return;
    fulfillRewardFlow({ reward, actor: actorOf(user), members }).catch(report);
  };
  const onApprove = (reward: Reward) => {
    if (!user) return;
    approveRewardFlow({ reward, actor: actorOf(user), members }).catch(report);
  };
  const onReject = (reward: Reward) => {
    if (!user) return;
    rejectRewardFlow({ reward, actor: actorOf(user), members }).catch(report);
  };

  const onRemove = (reward: Reward) => {
    if (!gid) return;
    Alert.alert(t('rewards.deleteTitle'), t('rewards.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => removeReward(gid, reward.id).catch(report),
      },
    ]);
  };

  const isWeekly = (r: Reward) => r.createdBy === SYSTEM_REWARD_AUTHOR;
  const isEmpty =
    groups.available.length === 0 &&
    groups.claimed.length === 0 &&
    groups.completed.length === 0;

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

        {rewards == null ? null : isEmpty ? (
          <Card>
            <Text variant="small" tone="secondary" center>
              {t('rewards.empty')}
            </Text>
          </Card>
        ) : null}

        {/* 1) Vitrin — alınmayı bekleyen */}
        {groups.available.length > 0 ? (
          <Section title={t('rewards.sectionAvailable')} icon="gift">
            {groups.available.map((reward) => {
              const rewardCost = reward.costPoints ?? 0;
              const canBuy = myPoints >= rewardCost;
              return (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  weekly={isWeekly(reward)}
                  meta={
                    <Text variant="caption" tone="secondary">
                      {t('rewards.costPoints', { n: rewardCost })}
                    </Text>
                  }
                  actions={
                    <Button
                      title={canBuy ? t('rewards.redeem') : t('rewards.notEnough')}
                      size="md"
                      fullWidth={false}
                      variant={canBuy ? 'primary' : 'ghost'}
                      disabled={!canBuy}
                      onPress={() => onClaim(reward)}
                    />
                  }
                  onDelete={isWeekly(reward) ? undefined : () => onRemove(reward)}
                />
              );
            })}
          </Section>
        ) : null}

        {/* 2) Alınan — uygulanmayı/onayı bekleyen */}
        {groups.claimed.length > 0 ? (
          <Section title={t('rewards.sectionClaimed')} icon="clock">
            {groups.claimed.map((reward) => {
              const pending = reward.fulfilledBy != null;
              const iAmOwner = canApproveReward(reward, uid);
              return (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  weekly={isWeekly(reward)}
                  meta={
                    <>
                      <Text variant="caption" tone="secondary">
                        {t('rewards.claimedBy', { name: firstName(reward.claimedByName) })}
                      </Text>
                      {pending ? (
                        <Text variant="caption" tone="muted">
                          {t('rewards.fulfilledBy', { name: firstName(reward.fulfilledByName) })}
                        </Text>
                      ) : null}
                    </>
                  }
                  actions={
                    !pending ? (
                      <Button
                        title={t('rewards.markFulfilled')}
                        size="md"
                        fullWidth={false}
                        variant="secondary"
                        onPress={() => onFulfill(reward)}
                      />
                    ) : iAmOwner ? (
                      <View style={{ gap: spacing.xs }}>
                        <Button
                          title={t('rewards.approve')}
                          size="md"
                          fullWidth={false}
                          onPress={() => onApprove(reward)}
                        />
                        <Button
                          title={t('rewards.reject')}
                          size="md"
                          fullWidth={false}
                          variant="ghost"
                          onPress={() => onReject(reward)}
                        />
                      </View>
                    ) : (
                      <Text variant="caption" tone="secondary">
                        {t('rewards.pendingApproval')}
                      </Text>
                    )
                  }
                />
              );
            })}
          </Section>
        ) : null}

        {/* 3) Tamamlanan */}
        {groups.completed.length > 0 ? (
          <Section title={t('rewards.sectionCompleted')} icon="check">
            {groups.completed.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                weekly={isWeekly(reward)}
                meta={
                  <Text variant="caption" tone="muted">
                    {t('rewards.completedBy', { name: firstName(reward.claimedByName) })}
                  </Text>
                }
                onDelete={isWeekly(reward) ? undefined : () => onRemove(reward)}
              />
            ))}
          </Section>
        ) : null}
      </View>
    </Screen>
  );
}
