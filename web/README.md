# NafuPlanner — Web (PWA)

Birlikte yaşayanlar için sıcak, "Bugün" odaklı ortak görev ve alışveriş planlayıcısı.
React 18 + TypeScript + Vite + Tailwind CSS + react-router-dom v6 + @tanstack/react-query v5
+ framer-motion + lucide-react + idb + vite-plugin-pwa.

## Geliştirme

```bash
cd web
npm install          # bağımlılıkları kur
cp .env.example .env  # ortam değişkenlerini ayarla (aşağıya bak)
npm run dev          # geliştirme sunucusu (varsayılan: http://localhost:5173)
```

Diğer komutlar:

```bash
npm run build     # tip kontrolü (tsc -b) + üretim derlemesi (web/dist)
npm run preview   # derlenmiş çıktıyı yerelde sun
npm run typecheck # yalnızca tür kontrolü
```

## Ortam değişkenleri

`.env` dosyasında (örnek için `.env.example`):

| Değişken | Açıklama |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth istemci kimliği. Boşsa giriş ekranında uyarı notu görünür; giriş yapılamaz. |
| `VITE_API_BASE` | API taban yolu. Varsayılan `/api`. Ayrı sunucu için tam URL verilebilir. |

## Dağıtım (Hostinger)

`npm run build` çıktısı `web/dist/*` klasörüdür; bu içerik `public_html/` köküne kopyalanır.
API (`/api`) aynı alan adından sunulduğunda `VITE_API_BASE=/api` yeterlidir.

## Mimari

```
src/
  i18n/tr.ts          tüm Türkçe metinler (tek kaynak)
  lib/                api (fetch sarmalayıcı), queryClient, tarih/sınıf yardımcıları
  types/api.ts        schema.sql'i yansıtan snake_case tipler
  providers/          ThemeProvider, AuthProvider
  components/ui/      yeniden kullanılabilir arayüz bileşenleri
  components/layout/  AppShell, GroupSwitcher
  features/           görev ve alışveriş için veri kancaları + parçalar
  routes/             sayfalar ve yönlendirme/oturum koruması
  sw.ts               servis worker (precache + push + bildirim tıklama)
  styles/index.css    Tailwind katmanları + semantik CSS değişkenleri
public/               uygulama ikonları (SVG + PNG)
```

## İkonlar

`public/` içinde teal paletli SVG ve türetilmiş PNG'ler hazır:
`icon.svg`, `icon-maskable.svg`, `favicon.svg`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`.

PNG'ler SVG'lerden üretilmiştir. Marka için özel bir görsel hazırlanırsa
aynı dosya adlarıyla değiştirilebilir; `vite.config.ts` ve `index.html` referansları korunur.

## Notlar (kalan işler)

- Google girişi için `VITE_GOOGLE_CLIENT_ID` ayarlanmalı ve `/api` çalışan bir backend'e bağlanmalı.
- Çevrimdışı yazma kuyruğu (outbox) `src/sw.ts` içinde Faz 4 için stub olarak bırakıldı.
- Görev oluşturma/düzenleme formu ve davet bağlantısı üretimi ilerleyen fazlarda eklenecek
  (iskelet bileşenler ve uç noktalar hazır).
