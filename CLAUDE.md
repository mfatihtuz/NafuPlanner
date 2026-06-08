# NafuPlanner — Proje Hafızası

Eş/ev arkadaşı/aile gibi küçük grupların ortak yaşamını ve yapılacaklarını tek yerde
toplayan, Bugün odaklı, oyunlaştırılmış bir **PWA**. Arayüz tamamen Türkçe.

## Mimari
- **Arayüz:** React + TypeScript + Vite + Tailwind, PWA (`web/`)
- **Sunucu:** PHP 8.x REST API + MySQL, Hostinger (`api/`)
- **Giriş:** yalnızca Google. Client ID derleme anında değil, çalışma anında
  `GET /api/config` ile okunur (tek config dosyası yeter).
- **Veri:** MySQL, tablolar `np_` önekli (`db/schema.sql`).

## Dizinler
- `web/` arayüz · `api/` sunucu · `db/` şema + seed · `docs/` plan/sözleşme/kurulum · `deploy/` dağıtım

## Kurallar (ZORUNLU)
- **Emoji kullanılmaz.** Tüm ikonlar Lucide (SVG).
- **Tüm kullanıcı-görünür metin gerçek Türkçe karakterlerle yazılır** (ç ğ ı İ ö ş ü).
  ASCII-Türkçe (örn. "Gorevler") kabul edilmez. Arayüz, API mesajları, aktivite akışı,
  rozetler, kategori adları dâhil. Metin tek yerde: `web/src/i18n/tr.ts`.
- Dil tonu: samimi, sıcak, olgun.
- API: JSON zarfı `{ok, data|error}`; her yerde snake_case; tarihler ISO-8601 UTC (Z).
- Tema sistem ayarına uyar (açık/koyu). Palet teal tabanlı (`docs/CONVENTIONS.md`).

## Güvenlik — sırlar asla git'e girmez
- `api/config.php`, `.env`, FTP/DB şifreleri, JWT/CRON/VAPID anahtarları **commit edilmez**.
- Yerel kimlik bilgileri `deploy/credentials.txt` içinde tutulur ve `.gitignore` ile dışlanır.
- Git'te yalnızca `*.example` şablonları bulunur.

## Dağıtım (deploy) — neyin nereye gittiği
Paketi üret: `bash deploy/build.sh` → çıktı `deploy/output/` (git'e girmez).

| Çıktı | Platform | İşlem |
|-------|----------|-------|
| `output/public_html/` | **FTP → `public_html`** | İçeriğin tamamı sunucudaki `public_html`'e |
| `output/database/schema.sql` | **phpMyAdmin → Import** | Önce bu (tablolar) |
| `output/database/seed.sql` | **phpMyAdmin → Import** | Sonra bu (rozetler) |

- FTP yükleme klasörü: **`public_html`**.
- Veritabanı kurulumu dosya çalıştırarak değil, **phpMyAdmin > Import** ile yapılır.
- `config.php` pakette yoktur; sunucuda `config.example.php`'den oluşturulur.
- Alan adı (FTP kullanıcı adından): `nafuplanner.mftyazilim.com`.
- Ayrıntı: `docs/SETUP.md` ve `deploy/README.md`.

## Durum (fazlar)
- **Faz 0 + Faz 1 bitti:** gruplar/davet, görevler (atama, alt görev, etiket, yorum, foto),
  alışveriş, kategoriler, Bugün ekranı, aktivite akışı. Gerçek MariaDB'ye karşı doğrulandı.
- **Bekliyor:** Faz 2 (tekrar serileri + hatırlatma/cron + Web Push — push için Hostinger'da
  `gmp` veya `bcmath` gerekir), Faz 3 (oyunlaştırma: puan/seri/lider tablosu/rozet),
  Faz 4 (çevrimdışı + cila).

## Geliştirme dalı
`claude/adoring-gates-IQ4wM` → PR #1. Yeni commit'ler PR'ı günceller.
