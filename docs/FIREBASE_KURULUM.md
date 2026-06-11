# Firebase Kurulum Rehberi (≈10 dakika)

Uygulamanın çalışması için bir Firebase projesi gerekiyor. Bu adımları bir kez
yapacaksın; sonrasında her şey otomatik.

## 1. Firebase projesi oluştur

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Ad: `nafu-planlayici` (ya da istediğin bir ad) → devam.
3. Google Analytics: **kapatabilirsin** (gerekmiyor) → **Create project**.

## 2. Web uygulaması ekle (config için)

1. Proje ana sayfasında **</>** (Web) simgesine tıkla.
2. Takma ad: `nafu-app` → **Register app**.
3. Karşına çıkan `firebaseConfig` değerlerini kopyala — birazdan `.env`'e
   yazacağız. (Bu değerler gizli sır değildir; istemciye gömülür.)

## 3. Google ile Girişi aç

1. Sol menü → **Build → Authentication** → **Get started**.
2. **Sign-in method** sekmesi → **Google** → **Enable**.
3. Project support email: kendi Gmail adresin → **Save**.

## 4. Firestore'u aç

1. Sol menü → **Build → Firestore Database** → **Create database**.
2. Konum: `europe-west1` (Belçika) ya da sana yakın bir bölge.
3. **Production mode** seç (kuralları birazdan yükleyeceğiz) → **Create**.

## 5. Güvenlik kurallarını yükle

1. Firestore → **Rules** sekmesi.
2. Bu repodaki [`firestore.rules`](../firestore.rules) dosyasının içeriğini
   olduğu gibi yapıştır → **Publish**.

> Bu kurallar "hane verisine yalnızca o hanenin üyeleri erişir" ilkesini
> sunucu tarafında zorunlu kılar.

## 6. `.env` dosyasını doldur

Repo kökünde:

```bash
cp .env.example .env
```

`.env` içine 2. adımda kopyaladığın değerleri yaz:

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<proje>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<proje>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<proje>.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=1:...:web:...
```

## 7. Google iOS OAuth Client ID (native giriş için)

Google ile girişin iOS'ta native çalışması için bir iOS OAuth client gerekir:

1. [console.cloud.google.com](https://console.cloud.google.com) → üstten
   Firebase projenle aynı projeyi seç.
2. **APIs & Services → Credentials** → **+ Create credentials → OAuth client ID**.
3. Application type: **iOS**.
4. Bundle ID: `com.nafuplanner.app`
5. **Create** → çıkan **Client ID**'yi ve **iOS URL scheme**'i kopyala.

`.env`'e ekle:

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=XXXX.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.XXXX
```

> Not: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` zaten `.env.example`'da hazır.

## 8. Test et

```bash
npm install
npm start
```

Telefonda Expo Go ile QR'ı okut → Google ile giriş → hane oluştur. Eşinin
telefonunda da giriş yapıp davet koduyla katılın; görevlerin iki cihazda da
anlık senkronize olduğunu görmelisin.

> Expo Go sınırı: yerel bildirimler çalışır; uzaktan push bildirimleri yalnızca
> EAS ile derlenen gerçek uygulamada çalışır (TestFlight adımında geleceğiz).

## Sorun giderme

- **"Kurulum tamamlanmadı" uyarısı** → `.env` eksik/yanlış; uygulamayı
  yeniden başlat (`npm start -- --clear`).
- **Giriş açılıp hemen kapanıyor** → iOS Client ID veya URL scheme hatalı.
- **"Missing or insufficient permissions"** → 5. adımdaki kurallar
  yayınlanmamış.
