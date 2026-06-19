import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { actorOf } from '@/services/auth/actor';
import { useMemberMap } from '@/features/household/useMemberMap';
import { shoppingListsDue } from '@/domain/shopping';
import { groupTasks } from '@/domain/tasks';
import type { ShoppingList, Task } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { useCelebration } from '@/features/celebration/CelebrationProvider';
import { RequireHousehold } from '@/features/household/NoHousehold';
import { getNotifSeen, useNotifications } from '@/features/notifications/useNotifications';
import { WelcomeCard } from '@/features/onboarding/WelcomeCard';
import { ShoppingAgendaCard } from '@/features/shopping/ShoppingAgendaCard';
import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { TaskCard } from '@/features/tasks/TaskCard';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t, type TranslationKey } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { markOnboarded } from '@/services/firestore/users';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { reopenTaskGate } from '@/features/tasks/reopenTask';
import { completeTaskFlow } from '@/services/workflows/taskWorkflows';
import { EmptyState, FAB, Icon, Screen, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

function greetingKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 12) return 'today.greetingMorning';
  if (hour < 18) return 'today.greetingAfternoon';
  return 'today.greetingEvening';
}

export default function TodayScreen() {
  return (
    <Screen padded={false}>
      <RequireHousehold>
        <TodayContent />
      </RequireHousehold>
    </Screen>
  );
}

function TodayContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const { household, members, profile } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const lists = useShoppingLists(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);

  // Bildirim merkezi: bana ait atama/yorum/dürtme + okunmamış sayacı.
  const uid = user?.uid ?? null;
  const notifications = useNotifications(household?.id ?? null, uid);
  const [seenMs, setSeenMs] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (uid) void getNotifSeen(uid).then(setSeenMs);
    }, [uid]),
  );
  const unread = useMemo(
    () => (notifications ?? []).filter((n) => n.atMs > seenMs).length,
    [notifications, seenMs],
  );

  const now = useNow();
  const sections = useMemo(() => (tasks ? groupTasks(tasks, now) : null), [tasks, now]);
  const shoppingDue = useMemo(() => shoppingListsDue(lists ?? [], now, uid), [lists, now, uid]);
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  const memberMap = useMemberMap(members);

  const firstName = user?.displayName?.split(' ')[0] ?? '';

  const onToggle = (task: Task) => {
    if (!household || !user) return;
    const actor = actorOf(user);
    if (task.status === 'done') {
      reopenTaskGate(task, actor, members);
    } else {
      completeTaskFlow({ task, actor, members })
        .then(celebrate)
        .catch((error) => console.warn('[today] görev güncellenemedi', error));
    }
  };

  const renderTask = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      category={task.categoryId ? categoryMap.get(task.categoryId) : null}
      assignees={task.assigneeIds
        .map((id) => memberMap.get(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))}
      onToggleComplete={onToggle}
      onPress={(item) => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
    />
  );

  const renderShopping = (list: ShoppingList) => (
    <ShoppingAgendaCard
      key={list.id}
      list={list}
      assignee={list.assigneeId ? memberMap.get(list.assigneeId) : null}
      onPress={(l) => router.push({ pathname: '/shopping-list/[id]', params: { id: l.id } })}
    />
  );

  const hasOverdue =
    sections != null && (sections.overdue.length > 0 || shoppingDue.overdue.length > 0);
  const hasToday = sections != null && (sections.today.length > 0 || shoppingDue.today.length > 0);
  const isEmpty = sections != null && !hasOverdue && !hasToday;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: spacing.lg,
          }}
        >
          <View>
            <Text variant="small" tone="secondary">
              {t(greetingKey())}
            </Text>
            <Text variant="h1">{firstName || t('today.title')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={8}
              accessibilityLabel={t('notifications.title')}
            >
              <Icon name="bell" size={26} color={colors.primaryDark} />
              {unread > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    paddingHorizontal: 3,
                    backgroundColor: colors.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: '700' }}>
                    {unread > 9 ? '9+' : String(unread)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/calendar')}
              hitSlop={8}
              accessibilityLabel={t('calendar.title')}
            >
              <Icon name="calendar" size={26} color={colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        {profile && !profile.onboardedAtMs ? (
          <WelcomeCard
            onAddTask={() => router.push('/task-form')}
            onInvite={() => router.navigate('/household')}
            onDismiss={() => {
              if (user) void markOnboarded(user.uid);
            }}
          />
        ) : null}

        {sections == null ? null : isEmpty ? (
          tasks != null && tasks.length === 0 ? (
            // Yeni hane: henüz hiç görev yok → kutlama yerine eyleme yönlendir.
            <EmptyState
              expression="happy"
              title={t('today.firstTaskTitle')}
              body={t('today.firstTaskBody')}
              actionLabel={t('tasks.add')}
              onAction={() => router.push('/task-form')}
            />
          ) : (
            <EmptyState
              expression="celebrate"
              title={t('today.emptyTitle')}
              body={t('today.emptyBody')}
            />
          )
        ) : (
          <View style={{ gap: spacing.xl }}>
            {hasOverdue ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="accent">
                  {t('today.overdue')}
                </Text>
                {sections.overdue.map(renderTask)}
                {shoppingDue.overdue.map(renderShopping)}
              </View>
            ) : null}

            {hasToday ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="secondary">
                  {t('today.todayTasks')}
                </Text>
                {sections.today.map(renderTask)}
                {shoppingDue.today.map(renderShopping)}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <FAB accessibilityLabel={t('tasks.add')} onPress={() => router.push('/task-form')} />
    </View>
  );
}
