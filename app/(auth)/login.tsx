import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { isGoogleAuthConfigured } from '@/config/env';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { Button, Card, Nafu, Screen, Text, TextField } from '@/ui';
import { radii } from '@/ui/theme/radii';
import { spacing } from '@/ui/theme/spacing';

/** Çok renkli Google "G" markası. */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

// Google girişi gerçek build gerektirir; Expo Go'da (ya da Google henüz
// yapılandırılmadıysa) test girişini göster.
const SHOW_DEV_SIGN_IN = __DEV__ || !isGoogleAuthConfigured();

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signingIn } = useAuth();
  const [showDev, setShowDev] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const devValid = name.trim().length > 0 && email.trim().length > 3 && password.length >= 6;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl }}>
            <Nafu expression="wave" size={172} />
            <Text variant="h1" center style={{ marginTop: spacing.xl }}>
              {t('auth.welcomeTitle')}
            </Text>
            <Text tone="secondary" center style={{ marginTop: spacing.md, maxWidth: 320 }}>
              {t('auth.welcomeSubtitle')}
            </Text>
          </View>

          <View style={{ paddingBottom: spacing.xl, gap: spacing.md }}>
            {appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={radii.pill}
                style={{ height: 54 }}
                onPress={() => void signInWithApple()}
              />
            ) : null}
            {isGoogleAuthConfigured() ? (
              <Button
                title={signingIn ? t('auth.signingIn') : t('auth.googleButton')}
                variant="secondary"
                loading={signingIn}
                onPress={signInWithGoogle}
                leftSlot={<GoogleG />}
              />
            ) : null}

            {SHOW_DEV_SIGN_IN ? (
              showDev ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text variant="bodyStrong">{t('auth.devSignInTitle')}</Text>
                  <Text variant="caption" tone="secondary">
                    {t('auth.devSignInHint')}
                  </Text>
                  <TextField
                    label={t('auth.devName')}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('auth.devNamePlaceholder')}
                    autoCapitalize="words"
                  />
                  <TextField
                    label={t('auth.devEmail')}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('auth.devEmailPlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                  <TextField
                    label={t('auth.devPassword')}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('auth.devPasswordPlaceholder')}
                    secureTextEntry
                  />
                  <Button
                    title={t('auth.devSignInButton')}
                    onPress={() => void signInWithEmail(name, email, password)}
                    loading={signingIn}
                    disabled={!devValid || signingIn}
                  />
                </Card>
              ) : (
                <Pressable
                  onPress={() => setShowDev(true)}
                  hitSlop={8}
                  style={{ alignSelf: 'center' }}
                >
                  <Text variant="caption" tone="link">
                    {t('auth.devSignInToggle')}
                  </Text>
                </Pressable>
              )
            ) : null}

            <Text variant="caption" tone="muted" center style={{ marginTop: spacing.xs }}>
              {t('common.appName')} · {t('common.tagline')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
