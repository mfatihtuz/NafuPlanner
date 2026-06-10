import { t } from '@/i18n';
import { EmptyState, Screen } from '@/ui';

export default function TasksScreen() {
  return (
    <Screen>
      <EmptyState expression="happy" title={t('tasks.title')} body={t('tasks.empty')} />
    </Screen>
  );
}
