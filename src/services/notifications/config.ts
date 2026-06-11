import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

// Android'de özel ses bir bildirim KANALINA bağlanır (iOS'ta content.sound
// yeterlidir). Haftalık Nafu ödülü bildirimi bu kanalı kullanır.
if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('weekly-reward', {
    name: 'Haftalık ödül',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'nafu-reward.wav',
  });
}
