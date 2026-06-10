# Nafu Planlayıcı — Proje Planı

Eşler/aileler için ortak ev işi ve todo uygulaması. WhatsApp grubunun
"unutuluyor" sorununu akıllı-kademeli hatırlatma, gerçek zamanlı senkron ve
hafif oyunlaştırmayla çözer. Sıcak & oyunbaş tasarım, Nafu maskotu, tamamen
Türkçe, emoji yerine özel SVG. iOS önce → Android'e hazır altyapı.

## Kilitlenen Kararlar

| Konu | Karar |
|---|---|
| Teknoloji | React Native + Expo (TypeScript), `expo-router` (SDK 56) |
| Backend | Firebase (Firestore, Auth, Storage, Cloud Functions, Bildirim) |
| Giriş | Google ile Giriş (Gmail) |
| Eşleşme | Ayrı hesap + Hane (davet kodlu, multi-tenant) |
| Dağıtım | TestFlight + EAS Build/Submit (Mac gerekmez; üyelik aktif) |
| İnşa | Aşamalı — her faz bitmiş ve çalışır |
| Tasarım | Sıcak & oyunbaş, teal paleti, Nafu maskotu, emoji yok |
| Hatırlatma | Akıllı kademeli (gecikme → dürtme → eşe haber → günlük özet) |
| Dil | Türkçe (i18n altyapısı; ileride Android/İngilizce hazır) |
| Görünen ad | "Nafu Planlayıcı" (marka/maskot: Nafu = Nur + Fatih) |

## Teknik Mimari

Katmanlı, Android'e hazır yapı:

- `src/domain` — platformdan bağımsız tipler ve saf iş kuralları (puan, seviye,
  tekrar, seri, zaman). Test edilebilir.
- `src/services` — firebase, auth, bildirim, depolama (arayüz arkasında).
- `src/config` — ortam değişkenleri erişimi.
- `src/i18n` — Türkçe metinler (tip-güvenli `t()`), bağımlılıksız.
- `src/ui` — tasarım sistemi (tema/token, bileşenler, Nafu maskotu, ikonlar).
- `app/` — expo-router dosya tabanlı rotalar (auth + sekmeli ana akış).
- `functions/` — Firebase Cloud Functions (sonraki fazlar: zamanlı tekrar,
  kademeli bildirim, günlük özet).

Senkron: Firestore gerçek zamanlı dinleyiciler + çevrimdışı önbellek.
Bildirim: `expo-notifications` + Expo Push (APNs) → Cloud Functions tetikler.
Güvenlik: Firestore kuralları — veriye yalnızca o hanenin üyeleri erişir.

## Veri Modeli (Firestore eşlemesi)

`src/domain/types.ts` içinde tüm varlıkların tipleri tanımlı:

- `users/{uid}`, `users/{uid}/pushTokens`, kullanıcı bildirim ayarları
- `groups/{gid}` (hane), `groups/{gid}/members/{uid}` (rol, puan, seri)
- `invitations/{token}` (davet linki, son kullanım)
- `groups/{gid}/categories` (varsayılan Türkçe set + özelleştirme)
- `groups/{gid}/tasks` (öncelik, durum, son tarih+saat, atananlar, alt görevler,
  tekrar) → yorumlar + ekler (Storage)
- `groups/{gid}/shopping` (anlık paylaşımlı alışveriş)
- `groups/{gid}/recurrences` (esnek tekrar kuralları)
- `groups/{gid}/pointsLedger`, rozetler, ödüller
- `groups/{gid}/activity` (akış + "dürtme")

## Yol Haritası

### Faz 0 — Temel / İskelet  ✅ (tamamlandı)

- [x] Expo + TypeScript projesi (SDK 56), expo-router
- [x] Tasarım sistemi: teal paleti, tipografi, boşluk, köşe, gölge
- [x] Nafu maskotu (SVG, 5 ifade: happy/wave/celebrate/sleep/remind)
- [x] Özel SVG ikon seti (emoji yok)
- [x] i18n altyapısı (Türkçe, tip-güvenli)
- [x] Alan modeli + saf iş kuralları (puan/seviye, zaman) + birim testler
- [x] Firebase servis katmanı (yapılandırma yoksa çökmeyen, korumalı)
- [x] Google ile giriş akışı + oturum yönlendirme
- [x] Sekmeli ana iskelet: Bugün, Görevler, Alışveriş, Hane
- [x] EAS yapılandırması (eas.json), `.env.example`
- [x] Web oturumları için SessionStart hook (otomatik `npm install`)
- [x] Doğrulama: tip denetimi, lint, test ve iOS Metro bundle export hatasız

### Faz 1 — Çekirdek (ilk TestFlight)

- [ ] Hane oluştur + davet linki/koduyla katıl (invitations)
- [ ] Görev CRUD + atama (bir/çok kişi)
- [ ] Bugün / Yaklaşan / Tamamlanan görünümleri
- [ ] Kategoriler (varsayılan Türkçe set, düzenlenebilir)
- [ ] Alt görevler (kontrol listesi)
- [ ] Alışveriş listesi (anlık paylaşımlı)
- [ ] Gerçek zamanlı senkron (Firestore)
- [ ] Temel hatırlatma (zamanı gelince)
- [ ] İlk TestFlight build'i (EAS) → ikiniz kullanmaya başlarsınız

### Faz 2 — Hatırlatma & Tekrar

- [ ] Esnek tekrar + zamanlı örnek üretimi (Cloud Function)
- [ ] Akıllı-kademeli bildirim (gecikme → dürtme → eşe haber → özet)
- [ ] Sessiz saat / günlük özet ayarları
- [ ] Push token yönetimi (FCM/Expo Push)
- [ ] Aktivite akışı + "dürtme"

### Faz 3 — Oyunlaştırma

- [ ] Puan/seviye, seri (streak)
- [ ] Haftalık lider tablosu (tatlı rekabet)
- [ ] Rozetler / başarımlar
- [ ] Gerçek ödüller (kullanıcı tanımlı)
- [ ] Nafu'nun kutlama tepkileri/animasyonları

### Faz 4 — Cila

- [ ] Fotoğraf ekleri (Storage), yorumlar
- [ ] İstatistik / haftalık özet ekranı
- [ ] Mikro-animasyonlar, onboarding ciladı, erişilebilirlik
- [ ] Android temel doğrulama

Faz 1'den sonra her faz TestFlight'a güncelleme olarak gider.

## Yapılandırma — gerekenler

`.env.example`'ı `.env` olarak kopyalayıp doldurun:

1. Firebase web config (apiKey, projectId, appId, …) — Firebase Console.
2. Google iOS OAuth Client ID + reversed URL scheme — Google Cloud Console.
   (Web Client ID hazır.)
3. EAS proje kimliği — `eas init` ile.

Not: Bu değerler "gizli sır" değildir (istemciye gömülür). Asıl gizli olanlar
(service-account JSON, FCM server key) Cloud Functions tarafında kalır, repoya
girmez.
