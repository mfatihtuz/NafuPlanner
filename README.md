# NafuPlanner

Es, ev arkadasi veya aile gibi kucuk gruplarin ortak yasamini ve yapilacaklar listelerini
tek yerde toplayan, **Bugun odakli**, oyunlastirilmis ve hicbir isi unutturmayan bir PWA.

WhatsApp grubunun yerini alir: gorev ekler, atar, hatirlatir, biten isi kutlar.

## Teknoloji

- **Arayuz:** React + TypeScript + Vite + Tailwind, PWA (iPhone ana ekrana kurulabilir)
- **Sunucu:** PHP 8.x REST API + MySQL (Hostinger)
- **Giris:** yalnizca Google (Gmail)
- **Bildirim:** Web Push (cron tetikli hatirlatma motoru)

## Dizinler

| Dizin | Icerik |
|-------|--------|
| `web/`  | React PWA arayuzu |
| `api/`  | PHP REST API |
| `db/`   | MySQL semasi (`schema.sql`) ve baslangic verisi (`seed.sql`) |
| `docs/` | `PLAN.md` (proje plani), `CONVENTIONS.md` (teknik sozlesme) |

## Gelistirme

```bash
# Arayuz
cd web && npm install && npm run dev

# Sunucu (yerel)
cd api && php -S localhost:8000
```

Ayrintilar: [docs/PLAN.md](docs/PLAN.md) ve [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

## Kurallar

- Arayuz tamamen Turkce, samimi ve sicak ton.
- Emoji kullanilmaz; tum ikonlar SVG (Lucide).
- Sirlar (`api/config.php`, anahtarlar) git'e konmaz.
