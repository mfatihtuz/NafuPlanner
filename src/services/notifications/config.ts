import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';

import { NOTIF_ACTION, NOTIF_CATEGORY } from './categories';

/**
 * Bildirimlerin uygulama açıkken de görünmesini sağlar.
 * Uygulama (app) grubuna girildiğinde bir kez import edilir.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// (7) Eyleme dönük bildirim kategorileri: görev bildirimine Tamamla/Ertele,
// tamamlama onayı bildirimine Onayla/Reddet butonları. Aksiyona basınca uygulama
// öne gelir ve NotificationActionHandler işlemi yapar.
void Notifications.setNotificationCategoryAsync(NOTIF_CATEGORY.task, [
  {
    identifier: NOTIF_ACTION.complete,
    buttonTitle: t('push.actionComplete'),
    options: { opensAppToForeground: true },
  },
  {
    identifier: NOTIF_ACTION.snooze,
    buttonTitle: t('push.actionSnooze'),
    options: { opensAppToForeground: true },
  },
]);
void Notifications.setNotificationCategoryAsync(NOTIF_CATEGORY.approval, [
  {
    identifier: NOTIF_ACTION.approve,
    buttonTitle: t('push.actionApprove'),
    options: { opensAppToForeground: true },
  },
  {
    identifier: NOTIF_ACTION.reject,
    buttonTitle: t('push.actionReject'),
    options: { opensAppToForeground: true },
  },
]);

// Android'de özel ses bir bildirim KANALINA bağlanır (iOS'ta content.sound
// yeterlidir). Haftalık Nafu ödülü bildirimi bu kanalı kullanır.
if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('weekly-reward', {
    name: 'Haftalık ödül',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'nafu-reward.wav',
  });
}
