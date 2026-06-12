import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import type { Member, ShoppingList } from '@/domain/types';
import { RequireHousehold } from '@/features/household/NoHousehold';
import { useShopping } from '@/features/shopping/useShopping';
import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { createShoppingList } from '@/services/firestore/shoppingLists';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Avatar, Button, Card, EmptyState, Icon, Screen, Text, TextField } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

export default function ShoppingScreen() {
  return (
    <Screen padded={false}>
      <RequireHousehold>
        <ShoppingContent />
      </RequireHousehold>
    </Screen>
  );
}

function ListCard({
  title,
  subtitle,
  done,
  assignee,
  hasReminders,
  onPress,
}: {
  title: string;
  subtitle: string;
  done?: boolean;
  assignee?: Member | null;
  hasReminders?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            opacity: pressed ? 0.9 : 1,
          }}
        >
          <Icon name="cart" size={22} color={done ? colors.textMuted : colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text
              variant="bodyStrong"
              style={done ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}
            >
              {title}
            </Text>
            <Text variant="caption" tone="muted">
              {subtitle}
              {done ? ` · ${t('shopping.doneTag')}` : ''}
            </Text>
          </View>
          {hasReminders ? <Icon name="bell" size={16} color={colors.reward} /> : null}
          {assignee ? (
            <Avatar
              name={assignee.displayName}
              photoUrl={assignee.photoUrl}
              seed={assignee.userId}
              size={28}
            />
          ) : null}
          <Icon name="chevronRight" size={20} color={colors.textMuted} />
        </Card>
      )}
    </Pressable>
  );
}

function ShoppingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { household, members } = useHousehold();
  const gid = household?.id;
  const items = useShopping(gid ?? null);
  const lists = useShoppingLists(gid ?? null);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  // Ürünleri liste bazında say (listId yoksa "general" kovası).
  const countByList = useMemo(() => {
    const map = new Map<string, { total: number; checked: number }>();
    (items ?? []).forEach((it) => {
      const key = it.listId ?? 'general';
      const c = map.get(key) ?? { total: 0, checked: 0 };
      c.total += 1;
      if (it.checked) c.checked += 1;
      map.set(key, c);
    });
    return map;
  }, [items]);

  const general = countByList.get('general') ?? { total: 0, checked: 0 };

  const onCreateList = async () => {
    const name = newListName.trim();
    if (!name || !gid || !user) return;
    setCreating(true);
    try {
      const lid = await createShoppingList(gid, name, user.uid);
      setNewListName('');
      router.push({ pathname: '/shopping-list/[id]', params: { id: lid } });
    } catch (error) {
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));
    } finally {
      setCreating(false);
    }
  };

  const emptyEverything =
    lists != null && lists.length === 0 && general.total === 0;

  return (
    <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <TextField
            value={newListName}
            onChangeText={setNewListName}
            placeholder={t('shopping.newListPlaceholder')}
            returnKeyType="done"
            onSubmitEditing={() => void onCreateList()}
          />
        </View>
        <Button
          title={t('common.create')}
          fullWidth={false}
          size="md"
          style={{ height: 50 }}
          onPress={() => void onCreateList()}
          loading={creating}
          disabled={newListName.trim().length === 0}
        />
      </View>

      {emptyEverything ? (
        <EmptyState expression="happy" title={t('shopping.title')} body={t('shopping.emptyLists')} />
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {general.total > 0 ? (
            <ListCard
              title={t('shopping.generalList')}
              subtitle={t('shopping.itemProgress', { done: general.checked, total: general.total })}
              onPress={() =>
                router.push({ pathname: '/shopping-list/[id]', params: { id: 'general' } })
              }
            />
          ) : null}

          {(lists ?? []).map((list: ShoppingList) => {
            const c = countByList.get(list.id) ?? { total: 0, checked: 0 };
            return (
              <ListCard
                key={list.id}
                title={list.name}
                subtitle={t('shopping.itemProgress', { done: c.checked, total: c.total })}
                done={list.status === 'done'}
                assignee={list.assigneeId ? memberMap.get(list.assigneeId) : null}
                hasReminders={(list.reminders ?? []).length > 0}
                onPress={() =>
                  router.push({ pathname: '/shopping-list/[id]', params: { id: list.id } })
                }
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
