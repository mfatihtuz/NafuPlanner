import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, View } from 'react-native';

import { InviteError } from '@/services/firestore/households';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Avatar, Button, Card, Icon, Nafu, Screen, Text, TextField } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { spacing } from '@/ui/theme/spacing';

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
      Alert.alert(t('common.appName'), t('household.errorCreate'));
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

/** Hane varken: üyeler, davet, profil, çıkış. */
function HouseholdView() {
  const { user, signOut } = useAuth();
  const { household, members, myMember, createInvite } = useHousehold();
  const [invite, setInvite] = useState<{ code: string } | null>(null);
  const [creating, setCreating] = useState(false);

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

      <View style={{ flex: 1 }} />

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
      </Card>

      <Button
        title={t('common.logout')}
        variant="ghost"
        leftSlot={<Icon name="logout" size={20} color={colors.primaryDark} />}
        onPress={() => void signOut()}
      />
    </ScrollView>
  );
}
