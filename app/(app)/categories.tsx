import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import type { Category } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { t } from '@/i18n';
import {
  addCategory,
  removeCategory,
  updateCategory,
} from '@/services/firestore/categories';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Button, Card, Icon, Screen, Text, TextField } from '@/ui';
import { colors, palette } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

const COLORS = [
  palette.teal[500],
  palette.coral[500],
  palette.gold[500],
  palette.teal[700],
  '#7C6BF0',
  '#3FA7D6',
  '#E0607E',
  '#5BBF8A',
];

function ColorDots({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {COLORS.map((color) => (
        <Pressable key={color} onPress={() => onChange(color)} hitSlop={4}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: color,
              borderWidth: value === color ? 3 : 0,
              borderColor: colors.textPrimary,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}

/** Tek kategori: ad düzenleme (odak kaybında kaydeder), renk, silme. */
function CategoryRow({ category, gid }: { category: Category; gid: string }) {
  const [name, setName] = useState(category.name);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(category.name); // boş bırakılamaz → eskiye dön
      return;
    }
    if (trimmed !== category.name) {
      updateCategory(gid, category.id, { name: trimmed }).catch((error) =>
        console.warn('[categories] ad güncellenemedi', error),
      );
    }
  };

  const onRemove = () => {
    Alert.alert(t('categories.deleteTitle'), t('categories.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          removeCategory(gid, category.id).catch((error) =>
            console.warn('[categories] silinemedi', error),
          ),
      },
    ]);
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: category.color }}
        />
        <View style={{ flex: 1 }}>
          <TextField value={name} onChangeText={setName} onEndEditing={saveName} />
        </View>
        {category.isDefault ? (
          <Text variant="caption" tone="muted">
            {t('categories.defaultTag')}
          </Text>
        ) : (
          <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={t('common.delete')}>
            <Icon name="x" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <ColorDots
        value={category.color}
        onChange={(color) =>
          updateCategory(gid, category.id, { color }).catch((error) =>
            console.warn('[categories] renk güncellenemedi', error),
          )
        }
      />
    </Card>
  );
}

export default function CategoriesScreen() {
  const { household } = useHousehold();
  const gid = household?.id;
  const categories = useCategories(gid ?? null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !gid) return;
    setBusy(true);
    try {
      await addCategory(gid, trimmed, newColor);
      setNewName('');
    } catch (error) {
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="caption" tone="secondary">
          {t('categories.hint')}
        </Text>

        {gid
          ? (categories ?? []).map((category) => (
              <CategoryRow key={category.id} category={category} gid={gid} />
            ))
          : null}

        <Card style={{ gap: spacing.md }}>
          <Text variant="bodyStrong">{t('categories.addNew')}</Text>
          <TextField
            value={newName}
            onChangeText={setNewName}
            placeholder={t('tasks.categoryNamePlaceholder')}
          />
          <ColorDots value={newColor} onChange={setNewColor} />
          <Button
            title={t('common.add')}
            onPress={() => void onAdd()}
            loading={busy}
            disabled={newName.trim().length === 0 || busy}
          />
        </Card>
      </View>
    </Screen>
  );
}
