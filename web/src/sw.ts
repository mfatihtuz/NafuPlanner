/// <reference lib="webworker" />
//
// NafuPlanner servis worker'i (vite-plugin-pwa, injectManifest stratejisi).
// Sorumluluklar:
//   1) Uygulama kabugunu on-bellekle (precache).
//   2) Web Push bildirimlerini goster (cron tetikli hatirlatma motoru gonderir).
//   3) Bildirime tiklayinca ilgili sayfayi ac/odakla.
//   4) (Faz 4) Cevrimdisi yazma kuyrugu — asagida stub olarak birakildi.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox precache manifesti derleme aninda buraya enjekte edilir.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Yeni surum hazir olur olmaz devral (registerType: 'autoUpdate' ile uyumlu).
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Web Push -------------------------------------------------------------

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {};
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload;
    } catch {
      // Duz metin gelirse govde olarak kullan.
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title ?? 'NafuPlanner';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon-192.png',
    badge: payload.badge ?? '/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url ?? '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tiklayinca: ilgili url acik bir sekmede varsa odakla, yoksa ac.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const data = (event.notification.data ?? {}) as { url?: string };
  const targetUrl = data.url ?? '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const absoluteTarget = new URL(targetUrl, self.location.origin).href;

      for (const client of allClients) {
        // Ayni yola sahip acik sekme varsa onu one getir.
        if (client.url === absoluteTarget && 'focus' in client) {
          return client.focus();
        }
      }

      // Acik herhangi bir sekme varsa oraya yon ver, yoksa yeni sekme ac.
      const existing = allClients[0];
      if (existing && 'navigate' in existing) {
        await existing.navigate(absoluteTarget);
        return existing.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteTarget);
      }
      return undefined;
    })(),
  );
});

// --- Faz 4: Cevrimdisi yazma kuyrugu (stub) -------------------------------
//
// Plan: cevrimdisi yapilan POST/PATCH/DELETE istekleri IndexedDB'de (idb) bir
// "outbox" deposunda biriktirilecek; baglanti gelince Background Sync ile
// sirayla tekrar gonderilecek. Cakismalar sunucu zaman damgasiyla cozulecek.
//
// self.addEventListener('sync', (event) => {
//   if (event.tag === 'np-outbox-sync') {
//     event.waitUntil(flushOutbox());
//   }
// });
//
// async function flushOutbox(): Promise<void> {
//   // 1) idb 'outbox' deposundaki bekleyen yazmalari oku
//   // 2) her birini api'ye gonder; basarili olani sil
//   // 3) basarisizlari tekrar denemek uzere birak
// }

export {};
