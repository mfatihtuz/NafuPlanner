# NafuPlanner — Proje Plani

Es, ev arkadasi veya aile gibi kucuk gruplarin ortak yasamini tek yerde toplayan,
**Bugun odakli**, oyunlastirilmis ve **hicbir isi unutturmayan** bir PWA.
WhatsApp grubunun yerini alir: ekler, atar, hatirlatir, biten isi kutlar.

## Karara baglanan secimler

| Konu | Karar |
|------|-------|
| Platform | PWA (iPhone ana ekrana kurulabilir, App Store gerektirmez) |
| Arayuz | React + TypeScript + Vite + Tailwind + vite-plugin-pwa |
| Sunucu | Hostinger uzerinde PHP 8.x REST API + MySQL (PDO) |
| Giris | Yalnizca Google (Gmail). Sifre yok |
| Yapi | Cok kullanicili. Kullanicilar "gruplar" icinde toplanir; grup 1, 2 veya cok kisi olabilir; davet linki ile uye eklenir |
| Bir kullanici | Ayni anda birden cok gruba ait olabilir, arayuzde gecis yapar |
| Icerik | Ev isleri (tekrarlayan), yapilacaklar, ortak alisveris, son tarihli hatirlatmalar; genisletilebilir |
| Atama | Bir veya birden cok kisiye; atamasiz da olabilir |
| Tekrar | Esnek: gunluk/haftalik/aylik/belirli gunler/ozel aralik |
| Gorev detayi | Oncelik, alt gorev/kontrol listesi, fotograf, not/yorum, etiket, son tarih+saat |
| Ana gorunum | "Bugun" odakli ekran; ayrica grup ici Tumu listesi ve Alisveris sekmesi |
| Bildirim | Yalnizca PWA push; goreve ozel zamanli + gunluk sabah ozeti |
| Anti-spam | Sessiz saatler, kademeli geri cekilme, gunluk ust sinir, tek seferlik durtme |
| Oyunlastirma | Puan/seviye, seri (streak), N kisilik katki tablosu, rozetler, kutlama animasyonu |
| Tema | Sistem ayarina uyumlu acik/koyu; verilen teal paleti |
| Dil/ton | Turkce, samimi ve sicak; **emoji yok**, ikon tabanli |
| Cevrimdisi | Cevrimdisi ekleme/isaretleme; baglanti gelince otomatik senkron |

## Mimari

```
Tarayici (iPhone PWA)                Hostinger
┌───────────────────────┐           ┌──────────────────────────┐
│ React SPA  (/)         │  HTTPS    │ PHP REST API (/api)       │
│ Service Worker (push,  │ <───────> │ PDO  ──>  MySQL           │
│   cevrimdisi kuyruk)   │  JSON     │ Web Push (VAPID)          │
└───────────────────────┘           │ Cron: hatirlatma motoru   │
                                     └──────────────────────────┘
        Google Identity Services (ID token) ──> PHP dogrulama
```

- SPA kokte, API `/api` altinda → ayni origin, cerez ve guvenlik sade.
- Hatirlatma gonderimini cron tetikler. Hostinger cron yoksa cron-job.org ile
  `/api/cron/run?key=GIZLI` adresi 5-15 dakikada bir cagrilir.

## Hatirlatma ve anti-spam motoru

- **Goreve ozel:** son tarihten once (or. 1 gun / 1 saat) ve tam zamaninda.
- **Gunluk ozet:** her sabah belirlenen saatte tek bildirimde o gunun + geciken islerin ozeti.
- **Kademeli (spam degil):** gecikince geri cekilmeli aralik; ilk gunden sonra gunde en fazla bir;
  kullanici basina gunluk toplam push ust siniri (`max_push_per_day`); tekrarlar birlestirilir.
- **Sessiz saatler:** varsayilan 22:00-08:00; bu aralikta bildirim yok, sabah ozetine duser.
- **Partnere durtme:** is ciddi gecikince (or. 24 saat) tek sefer, nazik.
- **Snooze:** bildirim uzerinden erteleme.

## Oyunlastirma (zarif, emoji yok)

Puan/seviye (zorluk-agirlikli, adil), seri/streak, N kisilik haftalik katki tablosu,
rozetler (katalog `db/seed.sql`), gorev bitince kisa konfeti/animasyon. Amac motivasyon, baski degil.

## Gelistirme planı (fazlar)

- **Faz 0 — Temel:** repo iskeleti, DB semasi, PHP API iskeleti (auth, router, PDO),
  React/Tailwind/PWA iskeleti, tema, i18n, tasarim sistemi.
- **Faz 1 — Cekirdek:** gruplar/davet, kategoriler, gorevler (atama, alt gorev, not, etiket),
  alisveris listesi, Bugun ekrani, aktivite akisi.
- **Faz 2 — Hatirlatma:** tekrar serileri + jenerator, hatirlatma motoru, cron, Web Push, ayarlar.
- **Faz 3 — Oyunlastirma:** puan defteri, seri, katki tablosu, rozetler, kutlama animasyonlari.
- **Faz 4 — Cila:** cevrimdisi (servis worker + kuyruk), erisilebilirlik, Turkce metin gecisi, son rotuslar.

## Kurulum (kullanici tarafinda gereken girdiler)

1. **Google OAuth Client ID** — Google Cloud Console > APIs & Services > Credentials >
   OAuth client ID (Web). Authorized JavaScript origins'e alan adini ekle.
2. **Hostinger** — phpMyAdmin'de MySQL veritabani + kullanici; PHP 8.1+; (alt)alan adi + ucretsiz SSL.
   Cron varsa `php /home/.../api/cron.php` ; yoksa cron-job.org.
3. Bu degerler `api/config.php` dosyasina (sunucuda) girilir. **Sirlar git'e veya sohbete yazilmaz.**

Ayrintili kurulum adimlari: `docs/SETUP.md` (Faz sonunda).
