import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { requireDb } from '@/services/firebase/config';

/**
 * Cihazlar-arası bildirim artık SUNUCUDA (Cloud Functions) gönderilir: istemci
 * `groups/{gid}/outbox` koleksiyonuna bir istek yazar, fonksiyon alıcı
 * token'larını okuyup gönderir. Böylece gönderim gönderen cihazdan bağımsızdır
 * ve alıcının sessiz saatine denk gelenler düşmek yerine ertelenir.
 *
 * NOT: Cloud Functions deploy edilmemişse (Blaze planı + `firebase deploy`),
 * OS bildirimi gitmez; uygulama içi bildirim merkezi (aktivite kayıtları) yine
 * çalışır.
 */

function easProjectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
    ?.eas?.projectId;
  return fromExtra && fromExtra.length > 0 ? fromExtra : null;
}

/**
 * Bu cihazın Expo push token'ını + saat dilimi ofsetini üyelik belgesine yazar.
 * Ofset, sunucunun alıcının yerel sessiz saatini doğru hesaplaması içindir.
 * İzin yoksa/alınamazsa (simülatör, Expo Go, izin reddi) sessizce vazgeçer.
 */
export async function registerPushToken(gid: string, uid: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const projectId = easProjectId();
    if (!projectId) return;

    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted
      ? true
      : current.canAskAgain
        ? (await Notifications.requestPermissionsAsync()).granted
        : false;
    if (!granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await updateDoc(doc(requireDb(), 'groups', gid, 'members', uid), {
      pushToken: token,
      pushTokenUpdatedAtMs: Date.now(),
      // getTimezoneOffset(): UTC'nin gerisindeki dakika (UTC+3 → -180). Sunucu
      // için "UTC ofseti" = bunun negatifi (UTC+3 → 180).
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    });
  } catch (error) {
    console.warn('[push] token kaydı atlandı', error);
  }
}

export interface NotifyOptions {
  /** Hangi hane (outbox bu hanenin altına yazılır). */
  householdId: string;
  /** Gönderen (kendisine push gitmez). */
  excludeUid: string;
  /** Verilirse yalnızca bu kullanıcılara gönderilir. */
  onlyUids?: string[];
  title: string;
  body: string;
  /** true ise alıcının dürtme izni (nudgesEnabled) kapalıysa atlanır. */
  requireNudges?: boolean;
  data?: Record<string, string>;
}

/**
 * Bildirim isteğini hane outbox'una yazar; gönderimi Cloud Function üstlenir
 * (alıcı seçimi, sessiz saat ve token'lar sunucuda değerlendirilir). En
 * iyi-çaba: hata UI akışını bozmaz.
 */
export async function notifyMembers(options: NotifyOptions): Promise<void> {
  try {
    await addDoc(collection(requireDb(), 'groups', options.householdId, 'outbox'), {
      title: options.title,
      body: options.body,
      excludeUid: options.excludeUid,
      onlyUids: options.onlyUids ?? null,
      requireNudges: options.requireNudges ?? false,
      data: options.data ?? null,
      createdAtMs: Date.now(),
    });
  } catch (error) {
    console.warn('[push] outbox yazılamadı', error);
  }
}
