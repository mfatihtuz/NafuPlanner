import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, View } from 'react-native';

import { formatDueLabel } from '@/domain/format';
import { weeklyPoints } from '@/domain/gamification';
import { REACTIONS, summarizeReactions } from '@/domain/reactions';
import type { ActivityEntry } from '@/domain/types';
import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { setActivityReaction, watchActivity } from '@/services/firestore/activity';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { InviteError } from '@/services/firestore/households';
import { useWatch } from '@/services/firestore/useWatch';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Avatar, Button, Card, Icon, KeyboardAwareScrollView, Nafu, Screen, Text, TextField } from '@/ui';
import { palette } from '@/ui/theme/colors';
import { useColors } from '@/ui/theme';
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
    case 'task_assigned':
      return t('activity.taskAssigned', { name, task: entry.taskTitle ?? '' });
    case 'task_reopen_requested':
      return t('activity.reopenRequested', { name, task: entry.taskTitle ?? '' });
    case 'task_complete_requested':
      return t('activity.completeRequested', { name, task: entry.taskTitle ?? '' });
    case 'reward_redeemed':
      return t('activity.rewardRedeemed', { name, task: entry.taskTitle ?? '' });
    case 'shopping_created':
      return t('activity.shoppingCreated', { name, list: entry.taskTitle ?? '' });
    case 'shopping_assigned':
      return t('activity.shoppingAssigned', { name, list: entry.taskTitle ?? '' });
    case 'shopping_completed':
      return t('activity.shoppingCompleted', { name, list: entry.taskTitle ?? '' });
    case 'member_joined':
      return t('activity.memberJoined', { name });
  }
}

// Denge çubuğu renkleri (üye sırasına göre döner; temadan bağımsız palet).
const SHARE_COLORS = [
  palette.teal[500],
  palette.coral[500],
  palette.gold[500],
  palette.teal[300],
  '#2BB673',
];

/** Tamamlanan işlere emoji tepki çubuğu (övgü + esprili). */
function ReactionBar({
  entry,
  uid,
  open,
  onToggleOpen,
}: {
  entry: ActivityEntry;
  uid: string;
  open: boolean;
  onToggleOpen: (id: string | null) => void;
}) {
  const colors = useColors();
  const mine = entry.reactions?.[uid];
  const summary = summarizeReactions(entry.reactions);
  const react = (emoji: string) => {
    void setActivityReaction(
      entry.householdId,
      entry.id,
      uid,
      mine === emoji ? null : emoji,
    ).catch((error) => console.warn('[activity] tepki yazılamadı', error));
    onToggleOpen(null);
  };
  return (
    <View style={{ gap: spacing.xs, marginTop: spacing.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
        {summary.map((s) => (
          <Text key={s.emoji} variant="small">
            {s.emoji}
            {s.count > 1 ? ` ${s.count}` : ''}
          </Text>
        ))}
        <Pressable
          onPress={() => onToggleOpen(open ? null : entry.id)}
          hitSlop={6}
          accessibilityLabel={t('activity.react')}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: open ? colors.primaryTint : colors.surface,
          }}
        >
          <Icon name="heart" size={13} color={colors.primaryDark} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {REACTIONS.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => react(r.emoji)}
              accessibilityLabel={r.label}
              hitSlop={4}
              style={{ opacity: mine === r.emoji ? 1 : 0.9 }}
            >
              <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function HouseholdScreen() {
  const colors = useColors();
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
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('household.errorCreate')));
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
      const message =
        error instanceof InviteError
          ? error.reason === 'notFound'
            ? t('household.errorInviteNotFound')
            : t('household.errorInviteExpired')
          : firestoreErrorMessage(error, t('household.errorJoin'));
      Alert.alert(t('common.appName'), message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
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
    </KeyboardAwareScrollView>
  );
}

/** Hane varken: üyeler, davet, aktivite, profil, ayarlar, çıkış. */
function HouseholdView() {
  const colors = useColors();
  const router = useRouter();
  const now = useNow();
  const { user, signOut } = useAuth();
  const { household, members, myMember, createInvite } = useHousehold();
  const [invite, setInvite] = useState<{ code: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const activity = useWatch(household?.id ?? null, watchActivity);
  const tasks = useTasks(household?.id ?? null);
  const shoppingLists = useShoppingLists(household?.id ?? null);
  const weekly = useMemo(
    () => weeklyPoints(tasks ?? [], shoppingLists ?? [], now),
    [tasks, shoppingLists, now],
  );
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
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));
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

      {/* Denge: bu haftaki yükün üyelere dağılımı (#8) */}
      {members.length > 1 && weekTotal > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('balance.title')}
          </Text>
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
              {rankedMembers.map((member, index) => {
                const pts = weekly.get(member.userId) ?? 0;
                if (pts <= 0) return null;
                return (
                  <View
                    key={member.userId}
                    style={{ flex: pts, backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length] }}
                  />
                );
              })}
            </View>
            <View style={{ gap: spacing.xs }}>
              {rankedMembers.map((member, index) => {
                const pts = weekly.get(member.userId) ?? 0;
                const pct = Math.round((pts / weekTotal) * 100);
                return (
                  <View
                    key={member.userId}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length],
                      }}
                    />
                    <Text variant="small" style={{ flex: 1 }}>
                      {member.displayName.split(' ')[0]}
                    </Text>
                    <Text variant="small" tone="secondary">
                      %{pct}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text variant="caption" tone="muted">
              {t('balance.hint')}
            </Text>
          </Card>
        </View>
      ) : null}

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
            {(showAllActivity ? activity : activity.slice(0, 5)).map((entry) => {
              const reactable =
                (entry.type === 'task_completed' || entry.type === 'shopping_completed') &&
                members.length > 1;
              return (
                <View key={entry.id} style={{ gap: 2 }}>
                  <Text variant="small">{activityLine(entry)}</Text>
                  <Text variant="caption" tone="muted">
                    {formatDueLabel(entry.atMs, true, now)}
                  </Text>
                  {reactable && user ? (
                    <ReactionBar
                      entry={entry}
                      uid={user.uid}
                      open={reactingId === entry.id}
                      onToggleOpen={setReactingId}
                    />
                  ) : null}
                </View>
              );
            })}
            {activity.length > 5 ? (
              <Pressable onPress={() => setShowAllActivity((v) => !v)} hitSlop={6}>
                <Text variant="small" style={{ color: colors.primaryDark, fontWeight: '700' }}>
                  {showAllActivity
                    ? t('activity.showLess')
                    : t('activity.showMore', { n: activity.length - 5 })}
                </Text>
              </Pressable>
            ) : null}
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
