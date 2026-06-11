import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { isWithinQuietHours } from '@/domain/time';
import type { Member } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

/**
 * Sunucusuz cihazlar-arası bildirim: Expo Push API'sine doğrudan istemciden
 * gönderim. Token'lar üyelik belgesinde durur ve Firestore kuralları gereği
 * yalnızca hane üyeleri okuyabilir. (Gerçek build gerektirir; Expo Go'da
 * uzaktan push desteklenmez — kayıt sessizce atlanır.)
 */

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

function easProjectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
    ?.eas?.projectId;
  return fromExtra && fromExtra.length > 0 ? fromExtra : null;
}

/**
 * Bu cihazın Expo push token'ını alıp üyelik belgesine yazar. İzin yoksa ister;
 * alınamazsa (simülatör, Expo Go, izin reddi) sessizce vazgeçer.
 */
export async function registerPushToken(gid: string, uid: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const projectId = easProjectId();
    if (!projectId) return; // eas init yapılmadan token alınamaz

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
    });
  } catch (error) {
    console.warn('[push] token kaydı atlandı', error);
  }
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, string>;
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.warn('[push] gönderim hatası', error);
  }
}

export interface NotifyOptions {
  members: Member[];
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
 * Hane üyelerine push gönderir. Alıcının sessiz saatine ve (istenirse) dürtme
 * tercihine saygı duyar. En iyi-çaba: hata UI akışını bozmaz.
 */
export async function notifyMembers(options: NotifyOptions): Promise<void> {
  const nowClock = { hour: new Date().getHours(), minute: new Date().getMinutes() };
  const recipients = options.members.filter((member) => {
    if (member.userId === options.excludeUid) return false;
    if (options.onlyUids && !options.onlyUids.includes(member.userId)) return false;
    if (!member.pushToken) return false;
    if (options.requireNudges && member.nudgesEnabled === false) return false;
    if (isWithinQuietHours(nowClock, member.quietHoursStart, member.quietHoursEnd)) {
      return false;
    }
    return true;
  });

  await sendExpoPush(
    recipients.map((member) => ({
      to: member.pushToken as string,
      title: options.title,
      body: options.body,
      sound: 'default' as const,
      data: options.data,
    })),
  );
}
