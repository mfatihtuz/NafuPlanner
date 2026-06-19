import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { actorOf } from '@/services/auth/actor';
import { formatDayKey } from '@/domain/format';
import { groupItemsByAisle, suggestItemNames } from '@/domain/shopping';
import { dayKeyFromMs, dueAtFromDayKey } from '@/domain/time';
import type { ClockTime, DayKey, ShoppingItem } from '@/domain/types';
import { useCelebration } from '@/features/celebration/CelebrationProvider';
import { useNow } from '@/hooks/useNow';
import { useShopping } from '@/features/shopping/useShopping';
import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import {
  addShoppingItem,
  removeShoppingItem,
  setShoppingItemChecked,
} from '@/services/firestore/shopping';
import { deleteShoppingList, updateShoppingList } from '@/services/firestore/shoppingLists';
import { useHousehold } from '@/services/household/HouseholdProvider';
import {
  assignShoppingListFlow,
  completeShoppingListFlow,
  reopenShoppingListFlow,
} from '@/services/workflows/shoppingWorkflows';
import {
  Avatar,
  Button,
  Calendar,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  Icon,
  KeyboardAwareScrollView,
  Screen,
  Text,
  TextField,
  TimeWheel,
} from '@/ui';
import { useColors } from '@/ui/theme';
import { rowCardSurface } from '@/ui/theme/rowCard';
import { spacing } from '@/ui/theme/spacing';

function ItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onRemove: (item: ShoppingItem) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        ...rowCardSurface(false),
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.md,
      }}
    >
      <Checkbox checked={item.checked} onToggle={() => onToggle(item)} size={26} />
      <Text
        variant="body"
        style={[
          { flex: 1 },
          item.checked && { textDecorationLine: 'line-through', color: colors.textMuted },
        ]}
      >
        {item.name}
      </Text>
      <Pressable hitSlop={8} onPress={() => onRemove(item)} accessibilityLabel={t('common.delete')}>
        <Icon name="x" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export default function ShoppingListDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const { household, members } = useHousehold();
  const gid = household?.id;
  const isGeneral = id === 'general';

  const allItems = useShopping(gid ?? null);
  const lists = useShoppingLists(gid ?? null);
  const list = useMemo(
    () => (isGeneral ? null : (lists ?? []).find((l) => l.id === id) ?? null),
    [lists, id, isGeneral],
  );

  const items = useMemo(
    () => (allItems ?? []).filter((it) => (isGeneral ? it.listId == null : it.listId === id)),
    [allItems, id, isGeneral],
  );
  const open = useMemo(() => items.filter((i) => !i.checked), [items]);
  const checkedItems = useMemo(() => items.filter((i) => i.checked), [items]);
  // Açık ürünler reyona göre gruplanır (2+ reyon varsa başlıklı gösterilir).
  const openGroups = useMemo(() => groupItemsByAisle(open), [open]);

  const [draft, setDraft] = useState('');
  const [reminderDraft, setReminderDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReminderCal, setShowReminderCal] = useState(false);
  const [spendDraft, setSpendDraft] = useState('');
  const [spentSynced, setSpentSynced] = useState<number | undefined>(undefined);

  // Sık alınanlar: tüm hane geçmişinden, bu listede açık olmayan adlardan öner.
  const suggestions = useMemo(
    () => suggestItemNames(allItems ?? [], draft, open.map((i) => i.name), 6),
    [allItems, draft, open],
  );

  const now = useNow();
  const today = dayKeyFromMs(now);
  const tomorrow = dayKeyFromMs(now + 86_400_000);

  const done = list?.status === 'done';
  const title = isGeneral ? t('shopping.generalList') : (list?.name ?? t('shopping.title'));
  const reminders = list?.reminders ?? [];

  // Harcama taslağını sunucudaki değerle eşitle (efektsiz: değer değişince
  // render sırasında ayarlanır — React'in önerdiği desen).
  if (list && list.spentAmount !== spentSynced) {
    setSpentSynced(list.spentAmount);
    setSpendDraft(list.spentAmount != null ? String(list.spentAmount) : '');
  }

  // Tarihli hatırlatma değerleri doğrudan listeden türetilir (tek kaynak
  // Firestore); değişiklikler updateShoppingList ile yazılır.
  const dueDayKey: DayKey | null = list?.dueAtMs != null ? dayKeyFromMs(list.dueAtMs) : null;
  const dueTime: ClockTime | null =
    list?.hasTime && list?.dueAtMs != null
      ? { hour: new Date(list.dueAtMs).getHours(), minute: new Date(list.dueAtMs).getMinutes() }
      : null;

  const applyReminder = (dayKey: DayKey | null, time: ClockTime | null) => {
    if (!gid || !list) return;
    const patch =
      dayKey == null ? { dueAtMs: null as number | null } : dueAtFromDayKey(dayKey, time);
    updateShoppingList(gid, list.id, patch).catch((error) =>
      console.warn('[shopping] hatırlatma güncellenemedi', error),
    );
  };

  // Liste bulunamadı (yüklendi ama yok).
  if (!isGeneral && lists != null && !list) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState expression="remind" title={t('shopping.listNotFound')} />
      </Screen>
    );
  }
  if ((!isGeneral && lists == null) || allItems == null) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const onAddItem = () => {
    const name = draft.trim();
    if (!name || !gid || !user) return;
    setDraft('');
    addShoppingItem(gid, name, user.uid, isGeneral ? undefined : id).catch((error) =>
      console.warn('[shopping] eklenemedi', error),
    );
  };

  // Öneriden (sık alınan) doğrudan ekle.
  const onAddNamed = (name: string) => {
    if (!gid || !user) return;
    addShoppingItem(gid, name, user.uid, isGeneral ? undefined : id).catch((error) =>
      console.warn('[shopping] eklenemedi', error),
    );
  };

  const onSaveSpend = () => {
    if (!gid || !list) return;
    const raw = spendDraft.trim().replace(',', '.');
    const num = raw === '' ? null : Number(raw);
    if (num != null && (Number.isNaN(num) || num < 0)) return; // geçersiz → yok say
    updateShoppingList(gid, list.id, { spentAmount: num }).catch((error) =>
      console.warn('[shopping] harcama kaydedilemedi', error),
    );
  };

  const onToggle = (item: ShoppingItem) => {
    if (!gid || !user) return;
    setShoppingItemChecked(gid, item.id, !item.checked, user.uid).catch((error) =>
      console.warn('[shopping] güncellenemedi', error),
    );
  };

  const onRemove = (item: ShoppingItem) => {
    if (!gid) return;
    removeShoppingItem(gid, item.id).catch((error) =>
      console.warn('[shopping] silinemedi', error),
    );
  };

  const onAssign = (uid: string) => {
    if (!gid || !list || !user) return;
    assignShoppingListFlow({
      list,
      assigneeId: list.assigneeId === uid ? null : uid,
      actor: actorOf(user),
      members,
    }).catch((error) => console.warn('[shopping] atama güncellenemedi', error));
  };

  const onSaveName = () => {
    const name = nameDraft.trim();
    if (!gid || !list || !name) {
      setEditingName(false);
      return;
    }
    updateShoppingList(gid, list.id, { name }).catch((error) =>
      console.warn('[shopping] ad güncellenemedi', error),
    );
    setEditingName(false);
  };

  const onAddReminder = () => {
    const text = reminderDraft.trim();
    if (!text || !gid || !list) return;
    setReminderDraft('');
    updateShoppingList(gid, list.id, { reminders: [...reminders, text] }).catch((error) =>
      console.warn('[shopping] hatırlatma eklenemedi', error),
    );
  };

  const onRemoveReminder = (index: number) => {
    if (!gid || !list) return;
    updateShoppingList(gid, list.id, {
      reminders: reminders.filter((_, i) => i !== index),
    }).catch((error) => console.warn('[shopping] hatırlatma silinemedi', error));
  };

  const onComplete = async () => {
    if (!gid || !user || !list) return;
    setBusy(true);
    try {
      const reward = await completeShoppingListFlow({
        list,
        itemCount: items.length,
        actor: actorOf(user),
        members,
      });
      celebrate(reward);
    } catch (error) {
      console.warn('[shopping] tamamlanamadı', error);
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));
    } finally {
      setBusy(false);
    }
  };

  const onReopen = () => {
    if (!list) return;
    reopenShoppingListFlow(list).catch((error) =>
      console.warn('[shopping] geri açılamadı', error),
    );
  };

  const onDelete = () => {
    if (!gid || !list) return;
    Alert.alert(t('shopping.deleteListTitle'), t('shopping.deleteListBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteShoppingList(gid, list.id)
            .then(() => router.back())
            .catch((error) => console.warn('[shopping] liste silinemedi', error));
        },
      },
    ]);
  };

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title,
          headerRight: list
            ? () => (
                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <Pressable
                    hitSlop={8}
                    accessibilityLabel={t('common.edit')}
                    onPress={() => {
                      setNameDraft(list.name);
                      setEditingName(true);
                    }}
                  >
                    <Icon name="pencil" size={20} color={colors.primaryDark} />
                  </Pressable>
                  <Pressable hitSlop={8} accessibilityLabel={t('common.delete')} onPress={onDelete}>
                    <Icon name="trash" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      >
        {/* Ad düzenleme */}
        {list && editingName ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSaveName}
              />
            </View>
            <Button title={t('common.save')} fullWidth={false} size="md" style={{ height: 50 }} onPress={onSaveName} />
          </View>
        ) : null}

        {/* Atanan kişi */}
        {list ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" tone="secondary">
              {t('shopping.assignee')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {members.map((member) => (
                <Chip
                  key={member.userId}
                  label={member.displayName.split(' ')[0]}
                  selected={list.assigneeId === member.userId}
                  onPress={() => onAssign(member.userId)}
                  leftSlot={
                    <Avatar
                      name={member.displayName}
                      photoUrl={member.photoUrl}
                      seed={member.userId}
                      size={20}
                    />
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Tarihli hatırlatma: listeyi "Bugün"e + widget'a düşürür, zamanında bildirir */}
        {list ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="calendar" size={16} color={colors.primaryDark} />
              <Text variant="bodyStrong">{t('shopping.dueReminder')}</Text>
            </View>
            <Text variant="caption" tone="secondary">
              {t('shopping.dueReminderHint')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Chip
                label={t('tasks.noDueDate')}
                selected={dueDayKey === null}
                onPress={() => {
                  applyReminder(null, null);
                  setShowReminderCal(false);
                }}
              />
              <Chip
                label={t('tasks.today')}
                selected={dueDayKey === today}
                onPress={() => applyReminder(today, dueTime)}
              />
              <Chip
                label={t('tasks.tomorrow')}
                selected={dueDayKey === tomorrow}
                onPress={() => applyReminder(tomorrow, dueTime)}
              />
              <Chip
                label={
                  dueDayKey && dueDayKey !== today && dueDayKey !== tomorrow
                    ? formatDayKey(dueDayKey)
                    : t('tasks.pickDate')
                }
                selected={showReminderCal || Boolean(dueDayKey && dueDayKey !== today && dueDayKey !== tomorrow)}
                onPress={() => setShowReminderCal((v) => !v)}
              />
            </View>
            {showReminderCal ? (
              <Calendar
                selected={dueDayKey}
                onSelect={(key) => {
                  applyReminder(key, dueTime);
                  setShowReminderCal(false);
                }}
              />
            ) : null}
            {dueDayKey ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <Chip
                    label={dueTime ? t('tasks.time') : t('tasks.addTime')}
                    leftSlot={
                      <Icon name="clock" size={14} color={dueTime ? colors.primaryDark : colors.textMuted} />
                    }
                    selected={dueTime !== null}
                    onPress={() => applyReminder(dueDayKey, dueTime ? null : { hour: 9, minute: 0 })}
                  />
                </View>
                {dueTime ? <TimeWheel value={dueTime} onChange={(tm) => applyReminder(dueDayKey, tm)} /> : null}
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* Bağlı hatırlatmalar (#7): "dönerken şunu da al/yap" */}
        {list ? (
          <Card style={{ gap: spacing.sm }} tinted>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="bell" size={16} color={colors.reward} />
              <Text variant="bodyStrong">{t('shopping.reminders')}</Text>
            </View>
            <Text variant="caption" tone="secondary">
              {t('shopping.remindersHint')}
            </Text>
            {reminders.map((reminder, index) => (
              <View
                key={`${reminder}-${index}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Icon name="check" size={14} color={colors.textMuted} />
                <Text variant="small" style={{ flex: 1 }}>
                  {reminder}
                </Text>
                <Pressable hitSlop={8} onPress={() => onRemoveReminder(index)}>
                  <Icon name="x" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={reminderDraft}
                  onChangeText={setReminderDraft}
                  placeholder={t('shopping.reminderPlaceholder')}
                  returnKeyType="done"
                  onSubmitEditing={onAddReminder}
                />
              </View>
              <Button
                title={t('common.add')}
                fullWidth={false}
                size="md"
                variant="secondary"
                style={{ height: 50 }}
                onPress={onAddReminder}
                disabled={reminderDraft.trim().length === 0}
              />
            </View>
          </Card>
        ) : null}

        {/* Ürün ekle */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder={t('shopping.inputPlaceholder')}
              returnKeyType="done"
              onSubmitEditing={onAddItem}
            />
          </View>
          <Button
            title={t('common.add')}
            fullWidth={false}
            size="md"
            style={{ height: 50 }}
            onPress={onAddItem}
            disabled={draft.trim().length === 0}
          />
        </View>

        {/* Sık alınanlar (#4): tek dokunuşla ekle */}
        {!done && suggestions.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text variant="caption" tone="muted">
              {t('shopping.suggestions')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {suggestions.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  onPress={() => onAddNamed(name)}
                  leftSlot={<Icon name="plus" size={14} color={colors.primaryDark} />}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Açık ürünler — 2+ reyon varsa reyona göre gruplanır (#5) */}
        {openGroups.length > 1
          ? openGroups.map((group) => (
              <View key={group.aisle} style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="secondary">
                  {group.label}
                </Text>
                {group.items.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
                ))}
              </View>
            ))
          : open.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
            ))}

        {checkedItems.length > 0 ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Text variant="overline" tone="secondary">
              {t('shopping.checkedSection')} ({checkedItems.length})
            </Text>
            {checkedItems.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
            ))}
          </View>
        ) : null}

        {items.length === 0 ? (
          <Text variant="caption" tone="muted" center style={{ marginTop: spacing.md }}>
            {t('shopping.empty')}
          </Text>
        ) : null}

        {/* Harcama (#13): bu alışverişe ne harcandı (opsiyonel) */}
        {list ? (
          <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="receipt" size={16} color={colors.primaryDark} />
              <Text variant="bodyStrong">{t('shopping.spendTitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="h2" tone="secondary">
                ₺
              </Text>
              <View style={{ flex: 1 }}>
                <TextField
                  value={spendDraft}
                  onChangeText={setSpendDraft}
                  onBlur={onSaveSpend}
                  placeholder={t('shopping.spendPlaceholder')}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={onSaveSpend}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {/* Tamamla / geri aç (yalnız gerçek listelerde, puanlı) */}
        {list ? (
          <View style={{ marginTop: spacing.md }}>
            {done ? (
              <Button title={t('shopping.reopenList')} variant="secondary" onPress={onReopen} />
            ) : (
              <Button
                title={t('shopping.completeList')}
                onPress={() => void onComplete()}
                loading={busy}
                disabled={items.length === 0 || busy}
                leftSlot={<Icon name="check" size={18} color={colors.onPrimary} />}
              />
            )}
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </Screen>
  );
}
