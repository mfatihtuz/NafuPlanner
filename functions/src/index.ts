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
  /** Eyleme dönük bildirim kategorisi (Tamamla/Ertele/Onayla butonları). */
  categoryId?: string;
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
      categoryId?: string | null;
    };

    const membersSnap = await db.collection(`groups/${gid}/members`).get();
    const now = Date.now();
    const immediate: PushMessage[] = [];
    const deferred: { token: string; sendAtMs: number }[] = [];
    const deferredCategoryId = o.categoryId ?? null;

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
          categoryId: o.categoryId ?? undefined,
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
          categoryId: deferredCategoryId,
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
    const d = doc.data() as {
      token: string;
      title: string;
      body: string;
      data?: Record<string, unknown> | null;
      categoryId?: string | null;
    };
    messages.push({
      to: d.token,
      title: d.title,
      body: d.body,
      sound: 'default',
      data: d.data ?? undefined,
      categoryId: d.categoryId ?? undefined,
    });
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
 * (10) Haftalık karne: her pazartesi sabahı (06:00 UTC ≈ 09:00 TR) son 7 günün
 * özetini hesaplar ve hane outbox'una yazar — gönderimi onNotificationQueued
 * üstlenir (token + sessiz saat sunucuda). Hiç iş bitmediyse mesaj gönderilmez.
 * `completedAtMs` yalnız tamamlanan görevlerde bulunduğundan tek alanlı sorgu
 * yeterli (bileşik indeks gerekmez).
 */
export const weeklyRecap = onSchedule(
  { schedule: '0 6 * * 1', timeZone: 'Etc/UTC' },
  async () => {
    const now = Date.now();
    const weekAgo = now - 7 * 86_400_000;
    const groups = await db.collection('groups').get();
    let sent = 0;

    for (const g of groups.docs) {
      const gid = g.id;
      const tasksSnap = await db
        .collection(`groups/${gid}/tasks`)
        .where('completedAtMs', '>=', weekAgo)
        .get();
      if (tasksSnap.empty) continue;

      const byUser: Record<string, number> = {};
      let total = 0;
      for (const d of tasksSnap.docs) {
        const x = d.data() as { status?: string; completedBy?: string };
        if (x.status !== 'done' || !x.completedBy) continue;
        byUser[x.completedBy] = (byUser[x.completedBy] ?? 0) + 1;
        total += 1;
      }
      if (total === 0) continue;

      let topUid = '';
      let topCount = 0;
      for (const [uid, count] of Object.entries(byUser)) {
        if (count > topCount) {
          topUid = uid;
          topCount = count;
        }
      }
      let topName = '';
      if (topUid) {
        const mem = await db.doc(`groups/${gid}/members/${topUid}`).get();
        topName = ((mem.data() as { displayName?: string } | undefined)?.displayName ?? '').split(
          ' ',
        )[0];
      }

      const multipleContributors = Object.keys(byUser).length > 1;
      const title = 'Haftalık karne 📊';
      const body =
        multipleContributors && topName
          ? `Geçen hafta birlikte ${total} iş tamamladınız! 👏 En çok ${topName} katkı verdi (${topCount}).`
          : `Geçen hafta ${total} iş tamamladınız! 👏 Böyle devam!`;

      await db.collection(`groups/${gid}/outbox`).add({
        title,
        body,
        excludeUid: null,
        onlyUids: null,
        requireNudges: false,
        data: { type: 'weekly_recap' },
        createdAtMs: now,
      });
      sent += 1;
    }
    logger.info(`weeklyRecap: ${sent}/${groups.size} haneye özet yazıldı`);
  },
);

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
