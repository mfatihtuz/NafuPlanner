import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import type { CompletionReward } from '@/services/workflows/taskWorkflows';
import { t } from '@/i18n';
import { Icon, Nafu, Text } from '@/ui';
import { colors, palette } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { shadows } from '@/ui/theme/shadows';
import { spacing } from '@/ui/theme/spacing';

interface CelebrationContextValue {
  /** Görev tamamlanma ödülünü kısa bir kutlama kartıyla gösterir. */
  celebrate: (reward: CompletionReward) => void;
}

const CelebrationContext = createContext<CelebrationContextValue | undefined>(undefined);

const AUTO_HIDE_MS = 2400;

const STAR_ANGLES = [-150, -110, -70, -30, 30, 90] as const;
const STAR_COLORS = [
  palette.gold[500],
  palette.coral[500],
  palette.teal[500],
  palette.gold[300],
  palette.coral[300],
  palette.teal[400],
];

/** Karttan dışarı saçılan minik yıldızlar. */
function StarBurst({ progress }: { progress: Animated.Value }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STAR_ANGLES.map((angle, index) => {
        const rad = (angle * Math.PI) / 180;
        const tx = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(rad) * 110],
        });
        const ty = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(rad) * 110],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, 1, 0],
        });
        return (
          <Animated.View
            key={angle}
            style={{
              position: 'absolute',
              left: '50%',
              top: '38%',
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }],
            }}
          >
            <Icon name="star" size={16} color={STAR_COLORS[index]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function CelebrationOverlay({
  reward,
  onDismiss,
}: {
  reward: CompletionReward;
  onDismiss: () => void;
}) {
  const [pop] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(burst, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [pop, burst, onDismiss]);

  const badge = reward.newBadges[0] ?? null;

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      style={[StyleSheet.absoluteFill, styles.backdrop]}
    >
      <Animated.View
        style={[
          styles.card,
          shadows.lg,
          {
            opacity: pop,
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            ],
          },
        ]}
      >
        <StarBurst progress={burst} />
        <Nafu expression="celebrate" size={104} />
        <Text variant="title" center style={{ marginTop: spacing.sm }}>
          {t('celebration.title')}
        </Text>
        <Text
          variant="h2"
          center
          style={{ color: colors.primaryDark, marginTop: spacing.xxs }}
        >
          {t('celebration.points', { n: reward.pointsAwarded })}
        </Text>

        {reward.streakCount > 1 ? (
          <Text variant="small" tone="secondary" center style={{ marginTop: spacing.xs }}>
            {t('celebration.streak', { n: reward.streakCount })}
          </Text>
        ) : null}

        {reward.newLevel != null ? (
          <Text variant="bodyStrong" center style={{ color: colors.reward, marginTop: spacing.xs }}>
            {t('celebration.levelUp', { n: reward.newLevel })}
          </Text>
        ) : null}

        {badge ? (
          <View style={styles.badgeRow}>
            <Icon name={badge.icon as never} size={18} color={colors.reward} />
            <Text variant="small" style={{ color: colors.textPrimary, fontWeight: '600' }}>
              {t('celebration.newBadge', { name: badge.name })}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [reward, setReward] = useState<CompletionReward | null>(null);

  const celebrate = useCallback((next: CompletionReward) => {
    setReward(next);
  }, []);
  const dismiss = useCallback(() => setReward(null), []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {reward ? <CelebrationOverlay reward={reward} onDismiss={dismiss} /> : null}
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration, CelebrationProvider içinde kullanılmalı.');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 33, 30, 0.35)',
    padding: spacing.xl,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
