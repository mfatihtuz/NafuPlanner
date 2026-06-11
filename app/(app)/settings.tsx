import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import type { ClockTime, UserSettings } from '@/domain/types';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { saveUserSettings } from '@/services/firestore/users';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Button, Card, Screen, Text, TimeWheel } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

const DEFAULT_QUIET_START: ClockTime = { hour: 22, minute: 0 };
const DEFAULT_QUIET_END: ClockTime = { hour: 7, minute: 0 };
const DEFAULT_DIGEST: ClockTime = { hour: 8, minute: 0 };

function SettingRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, household } = useHousehold();

  const initial = profile?.settings;
  const [quietEnabled, setQuietEnabled] = useState(Boolean(initial?.quietHoursStart));
  const [quietStart, setQuietStart] = useState<ClockTime>(
    initial?.quietHoursStart ?? DEFAULT_QUIET_START,
  );
  const [quietEnd, setQuietEnd] = useState<ClockTime>(initial?.quietHoursEnd ?? DEFAULT_QUIET_END);
  const [digestEnabled, setDigestEnabled] = useState(initial?.dailyDigestEnabled ?? false);
  const [digestTime, setDigestTime] = useState<ClockTime>(
    initial?.dailyDigestTime ?? DEFAULT_DIGEST,
  );
  const [nudgesEnabled, setNudgesEnabled] = useState(initial?.nudgesEnabled ?? true);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user) return;
    const settings: UserSettings = {
      quietHoursStart: quietEnabled ? quietStart : undefined,
      quietHoursEnd: quietEnabled ? quietEnd : undefined,
      dailyDigestEnabled: digestEnabled,
      dailyDigestTime: digestEnabled ? digestTime : undefined,
      nudgesEnabled,
    };
    setSaving(true);
    try {
      await saveUserSettings(user.uid, household?.id ?? null, settings);
      router.back();
    } catch (error) {
      console.warn('[settings] kaydedilemedi', error);
      Alert.alert(t('common.appName'), t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="overline" tone="secondary">
          {t('settings.notifications')}
        </Text>

        <Card style={{ gap: spacing.md }}>
          <SettingRow
            title={t('settings.quietHours')}
            hint={t('settings.quietHoursHint')}
            value={quietEnabled}
            onChange={setQuietEnabled}
          />
          {quietEnabled ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" tone="muted">
                {t('settings.quietStart')}
              </Text>
              <TimeWheel value={quietStart} onChange={setQuietStart} />
              <Text variant="caption" tone="muted">
                {t('settings.quietEnd')}
              </Text>
              <TimeWheel value={quietEnd} onChange={setQuietEnd} />
            </View>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <SettingRow
            title={t('settings.dailyDigest')}
            hint={t('settings.dailyDigestHint')}
            value={digestEnabled}
            onChange={setDigestEnabled}
          />
          {digestEnabled ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" tone="muted">
                {t('settings.digestTime')}
              </Text>
              <TimeWheel value={digestTime} onChange={setDigestTime} />
            </View>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <SettingRow
            title={t('settings.nudges')}
            hint={t('settings.nudgesHint')}
            value={nudgesEnabled}
            onChange={setNudgesEnabled}
          />
        </Card>

        <Text variant="caption" tone="muted" center>
          {t('settings.pushNote')}
        </Text>

        <Button title={t('common.save')} onPress={() => void onSave()} loading={saving} />
      </View>
    </Screen>
  );
}
