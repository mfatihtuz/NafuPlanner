import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, View } from 'react-native';

import { formatDueLabel } from '@/domain/format';
import { weeklyPoints } from '@/domain/gamification';
import type { ActivityEntry } from '@/domain/types';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { watchActivity } from '@/services/firestore/activity';
import { InviteError } from '@/services/firestore/households';
import { useWatch } from '@/services/firestore/useWatch';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Avatar, Button, Card, Icon, Nafu, Screen, Text, TextField } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { spacing } from '@/ui/theme/spacing';

function activityLine(entry: ActivityEntry): string {
  const name = entry.actorName.split(' ')[0];
  switch (entry.type) {
    case 'task_created':
      return t('activity.taskCreated', { name, task: entry.taskTitle ?? '' });
    case 'task_completed':
      return t('activity.taskCompleted', { name, task: entry.taskTitle ?? '' });
    case 'task_nudged':
      return t('activity.taskNudged', {
        name,
        targets: (entry.targetNames ?? []).join(', '),
        task: entry.taskTitle ?? '',
      });
    case 'task_commented':
      return t('activity.taskCommented', { name, task: entry.taskTitle ?? '' });
    case 'reward_redeemed':
      return t('activity.rewardRedeemed', { name, task: entry.taskTitle ?? '' });
    case 'member_joined':
      return t('activity.memberJoined', { name });
  }
}

export default function HouseholdScreen() {
  const { profileLoaded, household, householdLoaded } = useHousehold();

  return (
    <Screen scroll={false} padded={false}>
      {!profileLoaded || !householdLoaded ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : household ? (
        <HouseholdView />
      ) : (
        <SetupView />
      )}
    </Screen>
  );
}

/** Hane yokken: oluştur ya da koda katıl. */
function SetupView() {
  const { createHousehold, joinHousehold } = useHousehold();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  const onCreate = async () => {
    if (!name.trim()) return;
    setBusy('create');
    try {
      await createHousehold(name);
    } catch (error) {
      console.warn('[household] oluşturma hatası', error);
      const code = (error as { code?: string }).code;
      Alert.alert(
        t('common.appName'),
        code === 'permission-denied' ? t('common.errorRules') : t('household.errorCreate'),
      );
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async () => {
    if (!code.trim()) return;
    setBusy('join');
    try {
      await joinHousehold(code);
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message =
        error instanceof InviteError
          ? error.reason === 'notFound'
            ? t('household.errorInviteNotFound')
            : t('household.errorInviteExpired')
          : code === 'permission-denied'
            ? t('common.errorRules')
            : t('household.errorJoin');
      Alert.alert(t('common.appName'), message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        <Nafu expression="wave" size={120} />
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text variant="title">{t('household.create')}</Text>
        <Text variant="small" tone="secondary">
          {t('household.createHint')}
        </Text>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder={t('household.namePlaceholder')}
          autoCapitalize="words"
        />
        <Button
          title={t('household.create')}
          onPress={onCreate}
          loading={busy === 'create'}
          disabled={busy !== null || name.trim().length === 0}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="title">{t('household.join')}</Text>
        <Text variant="small" tone="secondary">
          {t('household.joinHint')}
        </Text>
        <TextField
          value={code}
          onChangeText={setCode}
          placeholder={t('household.codePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
        />
        <Button
          title={t('household.join')}
          variant="secondary"
          onPress={onJoin}
          loading={busy === 'join'}
          disabled={busy !== null || code.trim().length === 0}
        />
      </Card>
    </ScrollView>
  );
}

/** Hane varken: üyeler, davet, aktivite, profil, ayarlar, çıkış. */
function HouseholdView() {
  const router = useRouter();
  const now = useNow();
  const { user, signOut } = useAuth();
  const { household, members, myMember, createInvite } = useHousehold();
  const [invite, setInvite] = useState<{ code: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const activity = useWatch(household?.id ?? null, watchActivity);
  const tasks = useTasks(household?.id ?? null);
  const weekly = useMemo(() => weeklyPoints(tasks ?? [], now), [tasks, now]);
  const rankedMembers = useMemo(
    () => [...members].sort((a, b) => (weekly.get(b.userId) ?? 0) - (weekly.get(a.userId) ?? 0)),
    [members, weekly],
  );
  const weekTotal = useMemo(
    () => [...weekly.values()].reduce((sum, n) => sum + n, 0),
    [weekly],
  );

  if (!household) return null;

  const onInvite = async () => {
    setCreating(true);
    try {
      const result = await createInvite();
      setInvite({ code: result.code });
    } catch (error) {
      console.warn('[household] davet hatası', error);
      Alert.alert(t('common.appName'), t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const onShare = () => {
    if (!invite) return;
    Share.share({ message: t('household.inviteShareMessage', { code: invite.code }) }).catch(
      () => undefined,
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <Card tinted style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Icon name="home" size={26} color={colors.primaryDark} />
        <View style={{ flex: 1 }}>
          <Text variant="h2">{household.name}</Text>
          <Text variant="caption" tone="secondary">
            {members.length} {t('household.members').toLocaleLowerCase('tr')}
          </Text>
        </View>
      </Card>

      {/* Haftalık lider tablosu */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="secondary">
          {t('leaderboard.title')}
        </Text>
        <Card style={{ gap: spacing.md }}>
          {weekTotal === 0 ? (
            <Text variant="small" tone="secondary">
              {t('leaderboard.empty')}
            </Text>
          ) : (
            rankedMembers.map((member, index) => {
              const pts = weekly.get(member.userId) ?? 0;
              const leader = index === 0 && pts > 0;
              return (
                <View
                  key={member.userId}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                >
                  <Avatar
                    name={member.displayName}
                    photoUrl={member.photoUrl}
                    seed={member.userId}
                    size={32}
                  />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {member.displayName.split(' ')[0]}
                  </Text>
                  {leader ? <Icon name="trophy" size={18} color={colors.reward} /> : null}
                  <Text
                    variant="small"
                    style={{ color: leader ? colors.reward : colors.textSecondary, fontWeight: '700' }}
                  >
                    {t('leaderboard.points', { n: pts })}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="secondary">
          {t('household.members')}
        </Text>
        {members.map((member) => (
          <View
            key={member.userId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
            }}
          >
            <Avatar name={member.displayName} photoUrl={member.photoUrl} seed={member.userId} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{member.displayName}</Text>
              <Text variant="caption" tone="muted">
                {member.role === 'owner' ? t('household.roleOwner') : t('household.roleMember')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="star" size={16} color={colors.reward} />
              <Text variant="caption" tone="secondary">
                {member.points}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text variant="title">{t('household.invite')}</Text>
        {invite ? (
          <View style={{ gap: spacing.md }}>
            <View
              style={{
                backgroundColor: colors.primaryTint,
                borderRadius: radii.md,
                paddingVertical: spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text
                variant="display"
                style={{ color: colors.primaryDark, letterSpacing: 6 }}
                accessibilityLabel={t('household.inviteCode')}
              >
                {invite.code}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                {t('household.inviteValidity')}
              </Text>
            </View>
            <Button title={t('common.share')} onPress={onShare} variant="secondary" />
          </View>
        ) : (
          <Button title={t('household.inviteCreate')} onPress={onInvite} loading={creating} />
        )}
      </Card>

      {activity && activity.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('activity.title')}
          </Text>
          <Card style={{ gap: spacing.md }}>
            {activity.map((entry) => (
              <View key={entry.id} style={{ gap: 2 }}>
                <Text variant="small">{activityLine(entry)}</Text>
                <Text variant="caption" tone="muted">
                  {formatDueLabel(entry.atMs, true, now)}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.title')}
        onPress={() => router.push('/profile')}
      >
        {({ pressed }) => (
          <Card
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.9 : 1,
            }}
          >
            <Avatar
              name={user?.displayName ?? '?'}
              photoUrl={user?.photoURL}
              seed={user?.uid}
              size={48}
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{user?.displayName}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xxs }}>
                <Text variant="caption" tone="secondary">
                  {t('profile.points')}: {myMember?.points ?? 0}
                </Text>
                <Text variant="caption" tone="secondary">
                  {t('profile.streak')}: {myMember?.streakCount ?? 0}
                </Text>
              </View>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textMuted} />
          </Card>
        )}
      </Pressable>

      <Button
        title={t('rewards.title')}
        variant="ghost"
        leftSlot={<Icon name="gift" size={20} color={colors.primaryDark} />}
        onPress={() => router.push('/rewards')}
      />
      <Button
        title={t('stats.title')}
        variant="ghost"
        leftSlot={<Icon name="chart" size={20} color={colors.primaryDark} />}
        onPress={() => router.push('/stats')}
      />
      <Button
        title={t('settings.title')}
        variant="ghost"
        leftSlot={<Icon name="sliders" size={20} color={colors.primaryDark} />}
        onPress={() => router.push('/settings')}
      />
      <Button
        title={t('common.logout')}
        variant="ghost"
        leftSlot={<Icon name="logout" size={20} color={colors.primaryDark} />}
        onPress={() => void signOut()}
      />
    </ScrollView>
  );
}
