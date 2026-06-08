# NafuPlanner — Teknik Konvansiyonlar

Bu dosya frontend ve backend'in ortak sozlesmesidir. Iki taraf da buna uyar.

## Dizin yerlesimi

```
/web    React + TypeScript + Vite kaynak kodu (PWA arayuzu)
/api    PHP REST API (Hostinger'da public_html/api altina gider)
/db     MySQL semasi (schema.sql) ve baslangic verisi (seed.sql)
/docs   Plan ve dokumanlar
```

Dagitim eslemesi (Hostinger):
- `web` derlenir → `web/dist/*` → `public_html/` (kok)
- `api/*` → `public_html/api/`
- Yuklenen fotograflar → `public_html/api/uploads/` (web'den `/api/uploads/...` ile erisilir)

## API sozlesmesi

- Taban yol: `/api`. Tum yanitlar JSON, UTF-8.
- Zarf bicimi:
  - Basari: `{ "ok": true, "data": <icerik> }`
  - Hata:  `{ "ok": false, "error": { "code": "string", "message": "Turkce mesaj" } }`
- HTTP durumu anlamlica kullanilir (200, 201, 400, 401, 403, 404, 409, 422, 500).
- **Alan adlandirma: her yerde snake_case** (DB, JSON, TypeScript tipleri). Ara donusum katmani yok.
- Tarihler ISO-8601 UTC string (`2026-06-08T19:00:00Z`). Istemci yerel saate cevirir.

### Kimlik dogrulama

- `POST /api/auth/google` — govde `{ "id_token": "..." }`. Google ID token dogrulanir
  (audience = GOOGLE_CLIENT_ID). Kullanici yoksa olusturulur. httpOnly + Secure cerezde oturum JWT'si set edilir, yenileme oturumu kaydedilir. Doner: `{ user }`.
- `POST /api/auth/logout` — oturumu sonlandirir.
- `GET /api/me` — gecerli kullanici + uyesi oldugu gruplar.
- Korumali uclar `Authorization` cerezi/JWT ile calisir. Yetki: kullanici yalnizca uyesi oldugu grubun verisini gorur/degistirir.

### Uc nokta listesi (v1)

```
Auth/Profil
  POST   /api/auth/google
  POST   /api/auth/logout
  GET    /api/me
  PATCH  /api/me                      (ad, saat dilimi)

Gruplar ve davet
  GET    /api/groups
  POST   /api/groups
  GET    /api/groups/{id}
  PATCH  /api/groups/{id}
  DELETE /api/groups/{id}
  GET    /api/groups/{id}/members
  POST   /api/groups/{id}/invitations         -> { token, url }
  GET    /api/invitations/{token}             (onizleme: grup adi)
  POST   /api/invitations/{token}/accept

Kategoriler / etiketler
  GET    /api/groups/{id}/categories
  POST   /api/groups/{id}/categories
  PATCH  /api/categories/{id}
  DELETE /api/categories/{id}
  GET    /api/groups/{id}/tags
  POST   /api/groups/{id}/tags

Gorevler
  GET    /api/groups/{id}/tasks?scope=today|all|overdue|upcoming&category=&assignee=
  POST   /api/groups/{id}/tasks
  GET    /api/tasks/{id}
  PATCH  /api/tasks/{id}
  DELETE /api/tasks/{id}
  POST   /api/tasks/{id}/complete
  POST   /api/tasks/{id}/uncomplete
  POST   /api/tasks/{id}/subtasks
  PATCH  /api/subtasks/{id}
  DELETE /api/subtasks/{id}
  GET    /api/tasks/{id}/comments
  POST   /api/tasks/{id}/comments
  POST   /api/tasks/{id}/attachments          (multipart)
  DELETE /api/attachments/{id}

Tekrar serileri
  GET    /api/groups/{id}/series
  POST   /api/groups/{id}/series
  PATCH  /api/series/{id}
  DELETE /api/series/{id}

Alisveris
  GET    /api/groups/{id}/shopping
  POST   /api/groups/{id}/shopping
  PATCH  /api/shopping/{id}
  POST   /api/shopping/{id}/toggle
  DELETE /api/shopping/{id}

Bildirim / push
  POST   /api/push/subscribe                  ({ endpoint, keys })
  POST   /api/push/unsubscribe
  GET    /api/settings/notifications?group_id=
  PATCH  /api/settings/notifications

Oyunlastirma / akis
  GET    /api/groups/{id}/leaderboard?range=week|all
  GET    /api/groups/{id}/badges
  GET    /api/groups/{id}/activity?before=

Sistem
  GET    /api/cron/run?key=CRON_SECRET        (kullanici auth'u yok, gizli anahtar)
  GET    /api/health
```

## Yapilandirma

`api/config.php` (git'e KOYULMAZ; `api/config.example.php` sablonu var):
```php
return [
  'db' => ['host'=>'localhost','name'=>'','user'=>'','pass'=>'','charset'=>'utf8mb4'],
  'google_client_id' => '',
  'jwt_secret'       => '',   // uzun rastgele dize
  'cron_secret'      => '',   // cron uc noktasi anahtari
  'vapid' => ['public'=>'','private'=>'','subject'=>'mailto:...'],
  'app_url'          => 'https://alanadi',
  'upload_dir'       => __DIR__ . '/uploads',
];
```

## Renk paleti (Tailwind)

`web/tailwind.config.js > theme.extend.colors` icine birebir:

```js
porcelain:    { DEFAULT:'#fffffa',100:'#656500',200:'#caca00',300:'#ffff30',400:'#ffff95',500:'#fffffa',600:'#fffffb',700:'#fffffc',800:'#fffffd',900:'#fffffe' },
stormy_teal:  { DEFAULT:'#0d5c63',100:'#031214',200:'#052528',300:'#08373c',400:'#0a4a4f',500:'#0d5c63',600:'#169daa',700:'#2cd4e4',800:'#72e2ed',900:'#b9f1f6' },
tropical_teal:{ DEFAULT:'#44a1a0',100:'#0e2020',200:'#1b4140',300:'#296160',400:'#368180',500:'#44a1a0',600:'#61bdbb',700:'#88cdcc',800:'#b0dedd',900:'#d7eeee' },
pearl_aqua:   { DEFAULT:'#78cdd7',100:'#0f3034',200:'#1f6068',300:'#2e919c',400:'#46bbc8',500:'#78cdd7',600:'#94d8df',700:'#afe1e7',800:'#caebef',900:'#e4f5f7' },
teal:         { DEFAULT:'#247b7b',100:'#071919',200:'#0e3131',300:'#154a4a',400:'#1c6262',500:'#247b7b',600:'#33b1b1',700:'#5bcfcf',800:'#92dfdf',900:'#c8efef' },
```

Palette notr gri olmadigi icin okunabilirlik adina ayri bir `ink` (notr gri) skala eklenir.
Semantik kullanim (CSS degiskenleriyle, sistem temasina uyumlu):
- Acik tema: zemin `porcelain.DEFAULT`, yuzey beyaz, birincil `tropical_teal.DEFAULT`,
  vurgu `teal.DEFAULT`, baslik metni `stormy_teal.200`.
- Koyu tema: zemin `stormy_teal.100`, yuzey `stormy_teal.300/400`, birincil `pearl_aqua.500`,
  metin `porcelain.DEFAULT`.

## Kurallar

- **Emoji kullanilmaz.** Tum ikonlar Lucide (SVG).
- Tum kullanici metinleri Turkce ve tek yerde: `web/src/i18n/tr.ts`. Ton: samimi, sicak, olgun.
- Tipografi: Inter (tam Turkce glif: i, I, g, s, c, o, u). 
- Tema sistem ayarina uyar (`prefers-color-scheme`), kullanici elle de degistirebilir.
- Erisilebilirlik: yeterli kontrast, klavye/odak, dokunma hedefleri >= 44px.
- Guvenlik: hazirlanmis ifadeler (PDO prepared), grup bazli yetki kontrolu, CSRF icin
  SameSite cerez + gerekli yerlerde token, yukleme tipi/boyut dogrulamasi, cron gizli anahtari.
