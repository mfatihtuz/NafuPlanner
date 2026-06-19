import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { localClock, nextQuietEndMs, withinQuietHours, type Clock } from './quietHours';
import { weeklyRewardFor } from './weekly';

initializeApp();
const db = getFirestore();

// --- Expo push gönderimi -------------------------------------------------------

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, unknown>;
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) logger.warn('Expo push HTTP', res.status, await res.text());
    } catch (error) {
      logger.warn('Expo push gönderilemedi', error);
    }
  }
}

interface MemberDoc {
  pushToken?: string;
  nudgesEnabled?: boolean;
  quietHoursStart?: Clock;
  quietHoursEnd?: Clock;
  utcOffsetMinutes?: number;
}

/**
 * (1) + (6) Sunucu-taraflı push: istemci `groups/{gid}/outbox` koleksiyonuna bir
 * istek yazar; bu fonksiyon alıcı token'larını okuyup gönderir. Gönderen
 * cihazdan bağımsızdır. Alıcının sessiz saatine denk gelenler DÜŞÜRÜLMEZ; bitişe
 * ertelenir (deferred) ve flushDeferred ile gönderilir.
 */
export const onNotificationQueued = onDocumentCreated(
  'groups/{gid}/outbox/{id}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const gid = event.params.gid;
    const o = snap.data() as {
      title: string;
      body: string;
      excludeUid?: string;
      onlyUids?: string[] | null;
      requireNudges?: boolean;
      data?: Record<string, unknown> | null;
    };

    const membersSnap = await db.collection(`groups/${gid}/members`).get();
    const now = Date.now();
    const immediate: PushMessage[] = [];
    const deferred: { token: string; sendAtMs: number }[] = [];

    for (const m of membersSnap.docs) {
      const uid = m.id;
      const d = m.data() as MemberDoc;
      if (uid === o.excludeUid) continue;
      if (Array.isArray(o.onlyUids) && o.onlyUids.length > 0 && !o.onlyUids.includes(uid)) continue;
      if (o.requireNudges && d.nudgesEnabled === false) continue;
      if (!d.pushToken) continue;

      const offset = typeof d.utcOffsetMinutes === 'number' ? d.utcOffsetMinutes : 0;
      if (withinQuietHours(localClock(now, offset), d.quietHoursStart, d.quietHoursEnd)) {
        deferred.push({
          token: d.pushToken,
          sendAtMs: nextQuietEndMs(now, offset, d.quietHoursEnd as Clock),
        });
      } else {
        immediate.push({
          to: d.pushToken,
          title: o.title,
          body: o.body,
          sound: 'default',
          data: o.data ?? undefined,
        });
      }
    }

    await sendExpoPush(immediate);

    if (deferred.length > 0) {
      const batch = db.batch();
      for (const def of deferred) {
        const ref = db.collection(`groups/${gid}/deferred`).doc();
        batch.set(ref, {
          token: def.token,
          title: o.title,
          body: o.body,
          data: o.data ?? null,
          sendAtMs: def.sendAtMs,
        });
      }
      await batch.commit();
    }

    await snap.ref.delete();
  },
);

/** (6) Sessiz saat nedeniyle ertelenen bildirimleri zamanı gelince gönderir. */
export const flushDeferred = onSchedule('every 15 minutes', async () => {
  const now = Date.now();
  const due = await db
    .collectionGroup('deferred')
    .where('sendAtMs', '<=', now)
    .limit(400)
    .get();
  if (due.empty) return;

  const messages: PushMessage[] = [];
  const batch = db.batch();
  for (const doc of due.docs) {
    const d = doc.data() as { token: string; title: string; body: string; data?: Record<string, unknown> | null };
    messages.push({ to: d.token, title: d.title, body: d.body, sound: 'default', data: d.data ?? undefined });
    batch.delete(doc.ref);
  }
  await sendExpoPush(messages);
  await batch.commit();
});

/**
 * (3) Haftalık Nafu sistem ödülünü her pazartesi (UTC) tüm hanelerde garanti
 * eder — uygulama açılışından bağımsız. Kimlik haftaya sabit; create() ile
 * idempotent (zaten varsa atlanır).
 */
export const weeklyReward = onSchedule({ schedule: '5 0 * * 1', timeZone: 'Etc/UTC' }, async () => {
  const now = Date.now();
  const reward = weeklyRewardFor(now);
  const groups = await db.collection('groups').get();
  let created = 0;
  for (const g of groups.docs) {
    const ref = db.doc(`groups/${g.id}/rewards/${reward.id}`);
    try {
      await ref.create({
        title: reward.title,
        costPoints: reward.costPoints,
        createdBy: 'system',
        createdAtMs: now,
        status: 'active',
      });
      created += 1;
    } catch {
      // Zaten var → atla (idempotent).
    }
  }
  logger.info(`weeklyReward: ${created}/${groups.size} hane güncellendi (${reward.id})`);
});

/**
 * (2) Puan onarımı: bir hane üyesinin isteğiyle, puan defterinden (points alt
 * koleksiyonu) tüm üyelerin toplam puanını ve seviyesini yeniden hesaplar.
 * İstemci tarafı hesap hatası/çakışmasından sonra "doğru değere çek" güvencesi.
 */
export const rebuildPoints = onCall(async (req) => {
  const gid = (req.data as { householdId?: string } | undefined)?.householdId;
  if (!req.auth) throw new HttpsError('unauthenticated', 'Oturum gerekli.');
  if (!gid) throw new HttpsError('invalid-argument', 'householdId gerekli.');

  const meSnap = await db.doc(`groups/${gid}/members/${req.auth.uid}`).get();
  if (!meSnap.exists) throw new HttpsError('permission-denied', 'Bu hanenin üyesi değilsiniz.');

  const ledger = await db.collection(`groups/${gid}/points`).get();
  const totals: Record<string, number> = {};
  for (const d of ledger.docs) {
    const x = d.data() as { userId?: string; delta?: number };
    if (!x.userId) continue;
    totals[x.userId] = (totals[x.userId] ?? 0) + (x.delta ?? 0);
  }

  const members = await db.collection(`groups/${gid}/members`).get();
  const batch = db.batch();
  for (const m of members.docs) {
    const pts = Math.max(0, totals[m.id] ?? 0);
    batch.update(m.ref, { points: pts, level: Math.floor(pts / 100) + 1 });
  }
  await batch.commit();
  return { ok: true, members: members.size };
});
