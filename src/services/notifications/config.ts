import * as Notifications from 'expo-notifications';

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
