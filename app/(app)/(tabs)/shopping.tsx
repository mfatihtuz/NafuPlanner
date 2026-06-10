import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import type { ShoppingItem } from '@/domain/types';
import { RequireHousehold } from '@/features/household/NoHousehold';
import { useShopping } from '@/features/shopping/useShopping';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import {
  addShoppingItem,
  removeShoppingItem,
  setShoppingItemChecked,
} from '@/services/firestore/shopping';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Button, Checkbox, EmptyState, Icon, Screen, Text, TextField } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
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

function ItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onRemove: (item: ShoppingItem) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
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

function ShoppingContent() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const items = useShopping(household?.id ?? null);
  const [draft, setDraft] = useState('');

  const { open, checked } = useMemo(() => {
    const list = items ?? [];
    return {
      open: list.filter((i) => !i.checked),
      checked: list.filter((i) => i.checked),
    };
  }, [items]);

  const gid = household?.id;
  const uid = user?.uid;

  const onAdd = () => {
    const name = draft.trim();
    if (!name || !gid || !uid) return;
    setDraft('');
    addShoppingItem(gid, name, uid).catch(() => Alert.alert(t('common.appName'), t('common.error')));
  };

  const onToggle = (item: ShoppingItem) => {
    if (!gid || !uid) return;
    setShoppingItemChecked(gid, item.id, !item.checked, uid).catch((error) =>
      console.warn('[shopping] güncellenemedi', error),
    );
  };

  const onRemove = (item: ShoppingItem) => {
    if (!gid) return;
    removeShoppingItem(gid, item.id).catch((error) =>
      console.warn('[shopping] silinemedi', error),
    );
  };

  const onClearChecked = () => {
    if (!gid) return;
    Promise.all(checked.map((i) => removeShoppingItem(gid, i.id))).catch((error) =>
      console.warn('[shopping] temizlenemedi', error),
    );
  };

  return (
    <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <TextField
            value={draft}
            onChangeText={setDraft}
            placeholder={t('shopping.inputPlaceholder')}
            returnKeyType="done"
            onSubmitEditing={onAdd}
          />
        </View>
        <Button
          title={t('common.add')}
          fullWidth={false}
          size="md"
          onPress={onAdd}
          disabled={draft.trim().length === 0}
          style={{ height: 50 }}
        />
      </View>

      {items != null && open.length === 0 && checked.length === 0 ? (
        <EmptyState expression="happy" title={t('shopping.title')} body={t('shopping.empty')} />
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {open.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
          ))}

          {checked.length > 0 ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="overline" tone="secondary">
                  {t('shopping.checkedSection')} ({checked.length})
                </Text>
                <Pressable onPress={onClearChecked} hitSlop={8}>
                  <Text variant="caption" tone="link">
                    {t('shopping.clearChecked')}
                  </Text>
                </Pressable>
              </View>
              {checked.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
