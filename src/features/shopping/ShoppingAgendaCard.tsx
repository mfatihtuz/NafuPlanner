import { Pressable, View } from 'react-native';

import { formatDueLabel } from '@/domain/format';
import { dayKeyFromMs } from '@/domain/time';
import type { Member, ShoppingList } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { Avatar, Icon, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { rowCardSurface } from '@/ui/theme/rowCard';
import { shadows } from '@/ui/theme/shadows';
import { spacing } from '@/ui/theme/spacing';

export interface ShoppingAgendaCardProps {
  list: ShoppingList;
  assignee?: Member | null;
  onPress: (list: ShoppingList) => void;
}

/**
 * "Bugün" görünümünde tarihli bir alışveriş listesini gösteren kart. Görev
 * kartına benzer ama tamamlama kutusu yerine sepet simgesi taşır; dokununca
 * liste ayrıntısına gider (tamamlama orada, puanlı akışla yapılır).
 */
export function ShoppingAgendaCard({ list, assignee, onPress }: ShoppingAgendaCardProps) {
  const now = useNow();
  const overdue = list.dueAtMs != null && dayKeyFromMs(list.dueAtMs) < dayKeyFromMs(now);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(list)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          ...rowCardSurface(true),
          padding: spacing.md,
          gap: spacing.md,
        },
        shadows.sm,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.surfaceTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cart" size={18} color={colors.primaryDark} />
      </View>

      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {list.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
          {list.dueAtMs != null ? (
            <Text
              variant="caption"
              style={{
                color: overdue ? colors.danger : colors.textSecondary,
                fontWeight: overdue ? '700' : '500',
              }}
            >
              {formatDueLabel(list.dueAtMs, list.hasTime ?? false, now)}
            </Text>
          ) : null}
          <Text variant="caption" tone="muted">
            {t('shopping.tag')}
          </Text>
        </View>
      </View>

      {assignee ? (
        <Avatar name={assignee.displayName} photoUrl={assignee.photoUrl} seed={assignee.userId} size={28} />
      ) : null}
      <Icon name="chevronRight" size={20} color={colors.textMuted} />
    </Pressable>
  );
}
