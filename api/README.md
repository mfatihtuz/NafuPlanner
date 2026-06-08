# NafuPlanner API

NafuPlanner'in PHP REST API'si. Paylasimli grup gorev planlayici icin backend.
Hostinger paylasimli hostingde `public_html/api/` altinda calisir; ayrica PHP
yerlesik sunucusuyla yerelde de calistirilabilir.

- PHP 8.1+ (hedef 8.4), yalnizca PDO + hazirlanmis ifadeler.
- JSON zarfi: basari `{"ok":true,"data":...}`, hata `{"ok":false,"error":{"code","message"}}`.
- Alan adlandirma her yerde snake_case. Tum hata mesajlari Turkce.
- Ayrintili sozlesme: `docs/CONVENTIONS.md`.

## Dizin yapisi

```
api/
  index.php              On denetleyici (tum istekler buraya gelir)
  router.php             PHP yerlesik sunucusu icin yonlendirme yardimcisi
  .htaccess              Apache yonlendirme + guvenlik
  composer.json          Bagimliliklar (firebase/php-jwt, minishlink/web-push)
  config.example.php     Yapilandirma sablonu (config.php olarak kopyalanir)
  uploads/               Yuklenen dosyalar (web'den /api/uploads/... ile erisilir)
  src/
    autoload.php         Composer yoksa devreye giren yedek PSR-4 yukleyici
    routes.php           Uc nokta -> denetleyici eslemeleri
    Config.php           Yapilandirma yukleyici
    Database.php         PDO singleton (utf8mb4, exception modu)
    Http/                Request, Response, Router
    Auth/                GoogleVerifier, Jwt, Session, Auth (ara katman)
    Support/             Validator, Str, ApiException, ValidationException
    Controllers/         Denetleyiciler (uygulanmis + stub)
```

## 1. Yerel kurulum ve calistirma

Gereksinimler: PHP 8.1+ (pdo_mysql, openssl, curl, mbstring, json), Composer.

```bash
cd api

# Bagimliliklari kur
composer install
# gmp/bcmath eksikse ve web-push platform gereksinimi engellerse:
# composer install --ignore-platform-reqs

# Yapilandirmayi olustur
cp config.example.php config.php
# config.php'yi duzenleyip db, google_client_id, jwt_secret, cron_secret,
# vapid, app_url alanlarini doldurun.

# jwt_secret ve cron_secret uretmek icin:
php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"   # jwt_secret
php -r "echo bin2hex(random_bytes(24)).PHP_EOL;"   # cron_secret

# VAPID anahtarlari uretmek icin (vendor kurulu olmali):
php -r "require 'vendor/autoload.php'; var_export(Minishlink\WebPush\VAPID::createVapidKeys());"
```

Yerlesik sunucuyla calistirma (proje kokunden):

```bash
php -S localhost:8000 api/router.php
```

veya `api/` icinden:

```bash
php -S localhost:8000 router.php
```

Saglik kontrolu (veritabani gerektirmez):

```bash
curl http://localhost:8000/api/health
# {"ok":true,"data":{"status":"ok","time":"2026-06-08T..."}}
```

> Not: `config.php` git'e KOYULMAZ (`.gitignore`'da). Sirlar yalnizca buraya yazilir.
> `health` ucu DB gerektirmez; diger uclar gecerli bir `config.php` ve veritabani ister.

## 2. Veritabani kurulumu

Sema ve baslangic verisi `db/` altindadir.

phpMyAdmin ile (Hostinger):
1. Veritabanini secin.
2. "Ice Aktar" sekmesinden `db/schema.sql` dosyasini yukleyip calistirin.
3. Ardindan `db/seed.sql` dosyasini yukleyip calistirin (rozet katalogu).

Komut satiriyla:

```bash
mysql -u KULLANICI -p VERITABANI < db/schema.sql
mysql -u KULLANICI -p VERITABANI < db/seed.sql
```

> Kategoriler grup olusturulurken uygulama tarafinda tohumlanir
> ('Ev İşleri', 'Yapılacaklar', 'Alışveriş', 'Faturalar'); seed.sql yalnizca
> global rozet katalogunu doldurur.

## 3. Hostinger'a dagitim

1. `api/` klasorunu `public_html/api/` altina yukleyin (vendor/ dahil).
   - `config.php`'yi sunucuda olusturun (yereldekini yuklemeyin; sirlar ortama gore).
   - `uploads/` dizininin yazilabilir (genelde 755) oldugundan emin olun.
2. Veritabanini phpMyAdmin'den olusturun ve `db/schema.sql` + `db/seed.sql`'i calistirin.
3. `config.php` icindeki `db`, `app_url`, `google_client_id` ve sir alanlarini
   uretim degerleriyle doldurun. `app_url` `https://` ile baslamali (cerez Secure bayragi
   buna gore acilir).
4. `web/dist/*` icerigini `public_html/` koküne (api'nin disina) yukleyin.

Apache `.htaccess` tum istekleri `index.php`'ye yonlendirir; `config.php`, `*.sql`,
`composer.*`, `vendor/` ve `src/` dogrudan HTTP erisimine kapalidir.

## 4. Cron kurulumu

Hatirlatmalarin gonderilmesi ve tekrar serilerinin uretilmesi periyodik bir
istekle tetiklenir:

```
GET https://ALANADI/api/cron/run?key=CRON_SECRET
```

- `key`, `config.php` icindeki `cron_secret` ile birebir ayni olmali; aksi halde 403 doner.
- Kullanici oturumu gerektirmez.

Secenek A — Hostinger Cron Jobs (hPanel > Gelismis > Cron Jobs):

```
*/5 * * * *  curl -s "https://ALANADI/api/cron/run?key=CRON_SECRET" > /dev/null 2>&1
```

Secenek B — cron-job.org (veya benzeri harici servis):
- URL: `https://ALANADI/api/cron/run?key=CRON_SECRET`
- Aralik: 5 dakika.

> Not: cron is mantigi (tarama/gonderme/uretim) henuz uygulanmamistir; uc nokta
> su an dogru anahtarla 501 (not_implemented) doner. Anahtar dogrulamasi ve
> koruma calisir durumdadir.

## Uygulanma durumu

Tam uygulanmis uclar:
- `GET /api/health`
- `POST /api/auth/google`, `POST /api/auth/logout`, `GET /api/me`, `PATCH /api/me`
- `GET/POST /api/groups`, `GET/PATCH/DELETE /api/groups/{id}`, `GET /api/groups/{id}/members`
- `POST /api/groups/{id}/invitations`, `GET /api/invitations/{token}`, `POST /api/invitations/{token}/accept`

Bağlı ancak henuz 501 (not_implemented) donen uclar: kategoriler, etiketler,
gorevler, alt gorevler, yorumlar, ekler, tekrar serileri, alisveris, push,
bildirim ayarlari, siralama, rozetler, aktivite ve `cron/run` (anahtar dogru olunca).

Tum uc noktalarin listesi: `docs/CONVENTIONS.md`.
