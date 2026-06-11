# TestFlight Rehberi — Nafu Planlayıcı'yı telefona kurma

Bu rehber, uygulamayı **Mac'inden** derleyip (EAS bulut derlemesi — Xcode bilgisi
gerekmez) **TestFlight** ile kendi iPhone'una ve eşinin iPhone'una kurmanı sağlar.

> Ön koşullar: bir **Apple Developer Program** üyeliği (99 USD/yıl) ve ücretsiz
> bir **Expo** hesabı. Firebase tarafı hazır (eas.json içinde gömülü).

---

## 1. Hesaplar (bir kez)

1. **Apple Developer Program**: [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll)
   → Apple Kimliğinle kaydol (bireysel üyelik yeterli). Onay birkaç saat sürebilir.
2. **Expo hesabı**: [expo.dev/signup](https://expo.dev/signup) → ücretsiz kayıt.

## 2. Mac'i hazırla (bir kez)

Terminal'i aç (`Cmd+Boşluk` → "Terminal") ve sırasıyla:

```bash
# Node yoksa: nodejs.org'dan LTS kur, sonra devam et
node -v

# Repoyu klonla (GitHub Desktop kullandıysan bu adımı atla)
git clone https://github.com/mfatihtuz/NafuPlanner.git
cd NafuPlanner
git checkout claude/awesome-feynman-scu92n

# Bağımlılıklar + EAS CLI
npm install
npm install -g eas-cli

# Expo hesabına gir
eas login
```

## 3. EAS projesini bağla (bir kez)

```bash
eas init
```

- "Create a new project?" → **Yes**.
- Komut bitince bir **Project ID** (uuid biçiminde) yazar; örn.
  `Project ID: 1a2b3c4d-….`. **Bu ID'yi bana yapıştırırsan** `eas.json` ve
  `.env`'e ben işlerim (push edip), sen sadece `git pull` yaparsın — JSON ile
  uğraşmana gerek kalmaz.

Kendin yapmak istersen: ID'yi `eas.json` içinde `build.base.env` bloğuna ekle
(build sırasında gerekli) ve ayrıca `.env`'e ekle (yerel push token'ı için):

```bash
echo "EXPO_PUBLIC_EAS_PROJECT_ID=BURAYA_PROJECT_ID" >> .env
```

> Önemli: `.env` build'e gönderilmez; bu yüzden Project ID'nin **`eas.json`**
> içinde de durması gerekir.

## 4. Google ile Giriş için client ID'ler (İSTEĞE BAĞLI — ilk build'de atlanabilir)

> **İlk build için bu adımı atlayabilirsin.** Google yapılandırılmadığında
> giriş ekranında **"Test girişi"** (e-posta/şifre) otomatik görünür ve
> TestFlight'ta uygulamanın tamamını bununla deneyebilirsiniz. Google'ı sonra
> ekleyip yeni bir build alırsın. Şimdi hızlıca çalışan sürüm istiyorsan
> doğrudan **5. adıma** geç.

TestFlight'ta **gerçek Google girişi** istediğinde iki kimlik gerekir:

**a) Web Client ID** — Firebase Console → **Authentication → Sign-in method →
Google** → paneli aç → **Web SDK configuration** → **Web client ID**'yi kopyala
(`1053559906829-….apps.googleusercontent.com` biçiminde).

**b) iOS Client ID** — [console.cloud.google.com](https://console.cloud.google.com)
→ üstte proje olarak **nafuplanner**'ı seç → **APIs & Services → Credentials →
+ Create Credentials → OAuth client ID**:

- Application type: **iOS**
- Bundle ID: `com.nafuplanner.app`
- **Create** → **Client ID**'yi kopyala. Aynı ekranda **iOS URL scheme** da
  görünür (`com.googleusercontent.apps.…` biçiminde) — onu da kopyala.

**c) Değerleri `eas.json`'a ekle** — repo kökündeki `eas.json` içinde
`build.base.env` bloğunun sonuna (son Firebase satırından sonra **virgül**
koyup) şu üç satırı **ekle**:

```json
        "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID": "G-WZKCM353R3",
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "1053559906829-XXXX.apps.googleusercontent.com",
        "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "1053559906829-YYYY.apps.googleusercontent.com",
        "EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME": "com.googleusercontent.apps.1053559906829-YYYY"
```

Sonra commit'le ki kaybolmasın: `git add eas.json && git commit -m "Google client ID'leri"`

## 5. Derle ve App Store Connect'e gönder

```bash
eas build --platform ios --profile production
```

- İlk seferde Apple hesabına girmeni ister (**Apple ID** + uygulamaya özel
  parola olabilir) ve sertifika/profili **otomatik** oluşturur — hepsine
  varsayılan cevapları ver. Push Notifications yetkisini de otomatik ekler.
- Derleme bulutta ~15-25 dk sürer. Bittiğinde:

```bash
eas submit --platform ios --latest
```

- "App Store Connect'te uygulama oluşturulsun mu?" → **Yes** (adı: Nafu
  Planlayıcı). Yükleme sonrası işlenmesi ~15-30 dk.

## 6. TestFlight'a davet

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps →
   Nafu Planlayıcı → TestFlight**.
2. Build "Ready to Test" olunca: **Internal Testing → +** ile bir grup oluştur,
   kendini ve **eşinin Apple Kimliği e-postasını** ekle.
3. İkinizin telefonuna **TestFlight** uygulamasını kurun (App Store'dan),
   davet e-postasındaki bağlantıyla uygulamayı yükleyin.

## 7. İlk kullanım

1. İkiniz de **Google ile devam et** ile girin (gerçek Google girişi).
2. Sen **hane oluştur** → **davet kodu** üret → eşinle paylaş.
3. Eşin **davet koduyla katılsın**. Hepsi bu — görevler, alışveriş, bildirimler
   (atama/tamamlama/dürtme dahil) iki telefon arasında canlı çalışır.

> Firestore kurallarını güncellediysek (repo: `firestore.rules`), Firebase
> Console → Firestore → Rules'a son halini yapıştırmayı unutma.

## Sonraki sürümler

Kodda değişiklik olduğunda aynı iki komut yeter:

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

TestFlight'taki test kullanıcıları yeni sürümü otomatik bildirimle alır.

## Sorun giderme

- **"You have no team associated"** → Apple Developer üyeliği henüz aktif değil.
- **Google girişi açılıp kapanıyor** → 4. adımdaki üç değerden biri hatalı
  (özellikle URL scheme'in `com.googleusercontent.apps.` ile başladığından emin ol).
- **Push bildirimi gelmiyor** → `.env`/app config'te `EXPO_PUBLIC_EAS_PROJECT_ID`
  boş olabilir (3. adım) ya da bildirim izni reddedilmiş olabilir (iOS Ayarlar →
  Nafu Planlayıcı → Bildirimler).
- **"Missing or insufficient permissions"** → Firestore Rules güncel değil.
