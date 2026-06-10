import { t } from '@/i18n';
import { EmptyState, Screen } from '@/ui';

export default function ShoppingScreen() {
  return (
    <Screen>
      <EmptyState
        expression="happy"
        title={t('shopping.title')}
        body={t('shopping.empty')}
      />
    </Screen>
  );
}
