# NafuPlanner — Kurulum ve Dagitim Kilavuzu

Bu kilavuz uygulamayi sifirdan Hostinger'da yayina almak icindir. Sirasiyla izle.
Tahmini sure: 30-45 dakika. Sirlari (sifre, anahtar) kimseyle paylasma, git'e koyma.

---

## 0. Gerekenler ozet

| Ihtiyac | Nereden | Ucret |
|--------|---------|-------|
| Google OAuth Client ID | Google Cloud Console | Ucretsiz |
| MySQL veritabani | Hostinger > phpMyAdmin | Plan dahili |
| (Alt)alan adi + SSL | Hostinger | Plan dahili |
| Cron (zamanlanmis gorev) | Hostinger cron veya cron-job.org | Ucretsiz |
| VAPID anahtar cifti | `npx web-push generate-vapid-keys` | Ucretsiz |

---

## 1. Google ile giris (OAuth Client ID)

1. https://console.cloud.google.com adresine gir, ust soldan yeni bir proje olustur (or. "NafuPlanner").
2. Sol menu > **APIs & Services > OAuth consent screen**:
   - User type: **External**, devam et.
   - Uygulama adi: NafuPlanner, destek e-postasi: kendi e-postan.
   - Kaydet. "Test users" bolumune kendinizin ve esinizin Gmail adresini ekleyin
     (uygulama "Testing" modundayken yalnizca eklenen hesaplar girebilir; sinirsiz kullanim
     icin sonra "Publish" edebilirsin).
3. Sol menu > **Credentials > Create Credentials > OAuth client ID**:
   - Application type: **Web application**.
   - Name: NafuPlanner Web.
   - **Authorized JavaScript origins**: alan adini ekle, or:
     - `https://alanadiniz.com`
     - (yerel gelistirme icin) `http://localhost:5173`
   - "Authorized redirect URIs" gerekmiyor (Google Identity Services token akisi kullaniyoruz).
   - Olustur. Ciktidaki **Client ID** degerini kopyala (sonunda `.apps.googleusercontent.com`).
4. Bu Client ID iki yere girilecek:
   - Sunucu: `api/config.php > google_client_id`
   - Arayuz derlemesi: `web/.env > VITE_GOOGLE_CLIENT_ID`

> Client secret'a ihtiyac yok; ID token Google'in genel anahtarlariyla dogrulanir.

---

## 2. Hostinger: veritabani

1. hPanel > **Databases > MySQL Databases**.
2. Yeni veritabani olustur: ad, kullanici ve guclu bir sifre belirle. Uc degeri not al:
   - Veritabani adi, kullanici adi, sifre (host genelde `localhost`).
3. **phpMyAdmin**'i ac, bu veritabanini sec.
4. **Import** sekmesi: `db/schema.sql` dosyasini yukle ve calistir.
5. Tekrar **Import**: `db/seed.sql` dosyasini yukle ve calistir (rozet katalogu).
6. PHP surumunu kontrol et: hPanel > **Advanced > PHP Configuration** > en az **8.1** (tercihen 8.2+).
   `pdo_mysql` etkin olmali (varsayilan etkindir).

---

## 3. Hostinger: alan adi ve SSL

1. Bir alan adi veya alt alan adi yayina hazir olsun (or. `nafu.alanadiniz.com`).
2. hPanel > **SSL**: ucretsiz SSL'i etkinlestir. **https zorunlu** (PWA ve push icin sart).
3. Dosya kok dizini genelde `public_html` (alt alan adi icin ilgili klasor).

---

## 4. Arayuzu derle ve yukle

Yerel makinende (veya bu repoda):

```bash
cd web
cp .env.example .env
# .env icine yaz:
#   VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
#   VITE_API_BASE=/api
npm install
npm run build      # cikti: web/dist/
```

`web/dist/` icindeki TUM dosyalari Hostinger'da alan adinin kok dizinine (`public_html/`) yukle
(File Manager veya FTP). PWA ve servis worker'in calismasi icin kokte olmalilar.

---

## 5. Sunucuyu (API) yukle ve yapilandir

1. `api/` klasorunun tamamini `public_html/api/` altina yukle (vendor/ dahil; vendor'i
   yerelde `composer install` ile uretip yukle).
2. `public_html/api/config.example.php` dosyasini kopyalayip **`config.php`** yap ve doldur:

```php
return [
  'db' => [
    'host' => 'localhost',
    'name' => 'VERITABANI_ADI',
    'user' => 'KULLANICI',
    'pass' => 'SIFRE',
    'charset' => 'utf8mb4',
  ],
  'google_client_id' => 'XXXX.apps.googleusercontent.com',
  'jwt_secret'  => 'BURAYA_UZUN_RASTGELE_DIZE',   // asagida uretimi
  'cron_secret' => 'BURAYA_BASKA_RASTGELE_DIZE',
  'vapid' => [
    'public'  => 'VAPID_PUBLIC',
    'private' => 'VAPID_PRIVATE',
    'subject' => 'mailto:senin@eposta.com',
  ],
  'app_url'    => 'https://nafu.alanadiniz.com',
  'upload_dir' => __DIR__ . '/uploads',
];
```

3. `uploads/` klasorunun yazilabilir oldugundan emin ol (izin 755).

### Rastgele sir uretmek
```bash
# jwt_secret / cron_secret icin (her biri ayri calistir):
openssl rand -hex 32
```

### VAPID anahtarlari (push icin)
```bash
npx web-push generate-vapid-keys
# Cikan Public Key -> config.php vapid.public ve web build env'ine (asagi)
#       Private Key -> config.php vapid.private
```
VAPID public key arayuzde de gerekir. `web/.env` icine ekle ve yeniden derle:
```
VITE_VAPID_PUBLIC=BURAYA_VAPID_PUBLIC
```

---

## 6. Cron: hatirlatma motoru

Hatirlatmalarin gonderilmesi icin `/api/cron/run` ucu belirli araliklarla cagrilmali.

### Secenek A — Hostinger cron (varsa)
hPanel > **Advanced > Cron Jobs** > yeni gorev:
- Siklik: her 5-10 dakikada bir.
- Komut:
  ```
  php /home/KULLANICI/public_html/api/cron.php
  ```
  (cron.php, cron_secret'i bilerek dahili cagiri yapar; ya da asagidaki URL yontemini kullan.)

### Secenek B — cron-job.org (cron yoksa, ucretsiz)
1. https://cron-job.org hesabi ac.
2. Yeni cronjob:
   - URL: `https://nafu.alanadiniz.com/api/cron/run?key=CRON_SECRET`
   - Siklik: her 10 dakika.
3. Kaydet. Bu, sunucu cron'u olmadan da hatirlatmalari tetikler.

> `key` parametresi config'teki `cron_secret` ile ayni olmali; yanlissa istek reddedilir.

---

## 7. Dogrulama

1. Tarayicidan `https://nafu.alanadiniz.com` ac. Giris ekrani gelmeli.
2. `https://nafu.alanadiniz.com/api/health` -> `{"ok":true,...}` donmeli.
3. Google ile giris yap. Ilk girişte bir grup olustur.
4. iPhone Safari'de siteyi ac > Paylas > **Ana Ekrana Ekle**. Uygulama ana ekrana kurulur.
5. Ana ekrandan acip bir gorev ekle, son tarih ver. Bildirim iznini ver.
6. Esini davet linki ile cagir (Daha > Grup > Davet et). O da ana ekrana eklesin.

---

## Sorun giderme

- **Beyaz ekran / 404:** dist dosyalari koke yuklenmemis olabilir; `index.html` `public_html/` altinda mi?
- **API 500:** `config.php` eksik/yanlis; DB bilgilerini ve PHP surumunu kontrol et.
- **Google giris calismiyor:** Authorized JavaScript origins'e tam alan adini (https) ekledin mi? Client ID hem config hem build env'inde ayni mi?
- **Bildirim gelmiyor:** site https mi; PWA ana ekrana eklendi mi (iOS'ta sart); cron calisiyor mu (cron-job.org gecmisine bak).
- **Turkce karakter bozuk:** veritabani ve tablolar utf8mb4 mu (schema oyle olusturur); baglanti charset utf8mb4 mu.
