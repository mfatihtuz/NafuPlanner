# Nafu Planlayıcı

Eşler ve aileler için ortak ev işi, alışveriş ve hatırlatma uygulaması.
"WhatsApp grubuna yazılıyor ama unutuluyor" sorununu; akıllı-kademeli
hatırlatmalar, gerçek zamanlı senkron ve hafif oyunlaştırmayla çözer.

Maskotu **Nafu** (Nur + Fatih), sıcak ve oyunbaş bir kimlik. Tamamen Türkçe.

> Ayrıntılı yol haritası ve kararlar için [`docs/PLAN.md`](docs/PLAN.md).

## Teknoloji

- **React Native + Expo** (SDK 56, TypeScript), `expo-router`
- **Firebase** — Firestore, Auth (Google), Storage, Cloud Functions, Bildirim
- **EAS Build/Submit** → TestFlight (iOS önce, Android'e hazır)

## Kurulum

```bash
npm install
cp .env.example .env   # değerleri doldurun (Firebase + Google client ID'leri)
npm start              # Expo geliştirme sunucusu
```

`.env` doldurulmadan uygulama açılır ancak giriş ekranı "kurulum eksik" uyarısı
gösterir. Gerekli değerler `.env.example` içinde açıklanmıştır.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm start` | Expo geliştirme sunucusu |
| `npm run ios` / `npm run android` | Platform üzerinde başlat |
| `npm run typecheck` | TypeScript tip denetimi |
| `npm run lint` | ESLint |
| `npm test` | Jest birim testleri |

## Proje Yapısı

```
app/                 expo-router rotaları
  (auth)/login       Google ile giriş
  (app)/             sekmeler: Bugün, Görevler, Alışveriş, Hane
src/
  domain/            tipler + saf iş kuralları (test edilir)
  services/          firebase, auth
  config/            ortam değişkenleri
  i18n/              Türkçe metinler (tip-güvenli t())
  ui/                tema/token, bileşenler, Nafu maskotu, ikonlar
docs/PLAN.md         yol haritası
```

## Dağıtım (TestFlight)

EAS ile Mac gerekmeden bulutta derlenir ve TestFlight'a gönderilir:

```bash
npx eas init           # proje kimliği oluştur (ilk sefer)
npx eas build -p ios --profile preview
npx eas submit -p ios
```

Apple Developer Program üyeliği gerekir (aktif).
