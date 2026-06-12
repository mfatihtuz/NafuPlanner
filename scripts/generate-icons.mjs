/**
 * Nafu Planlayıcı — ikon / splash / favicon üretici.
 *
 * Tüm marka görselleri tek kaynaktan (bu dosyadaki SVG sahneleri) üretilir:
 *   node scripts/generate-icons.mjs [çıkışKlasörü=assets]
 *
 * Maskot geometrisi src/ui/mascot/Nafu.tsx ile uyumlu tutulmalıdır.
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'assets';

// Marka paleti (src/ui/theme/colors.ts ile uyumlu)
const C = {
  bodyTop: '#41D4C4',
  bodyBot: '#129488',
  ear: '#1CA797',
  arm: '#11968A',
  belly: '#F4FBF9',
  eye: '#22302F',
  cheek: '#FFA694',
  contact: '#08443E',
  bgTop: '#2BB3A4',
  bgBot: '#076B60',
  card: '#FFFFFF',
  check: '#14A294',
  cardLine: '#D9F1EC',
  cardLine2: '#EDF6F3',
  ring: '#C2E6DF',
};

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBot}"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bodyTop}"/>
      <stop offset="1" stop-color="${C.bodyBot}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.55">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
  </defs>`;

/** Kart üzerinden bakan Nafu — ikonun ana sahnesi (1024 viewBox). */
function iconScene({ withBg }) {
  return `
  ${withBg ? `<rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>` : ''}

  <!-- Kulaklar -->
  <g>
    <ellipse cx="366" cy="226" rx="62" ry="68" fill="${C.ear}" transform="rotate(-14 366 226)"/>
    <ellipse cx="658" cy="226" rx="62" ry="68" fill="${C.ear}" transform="rotate(14 658 226)"/>
  </g>

  <!-- Kafa -->
  <ellipse cx="512" cy="544" rx="330" ry="324" fill="url(#body)"/>

  <!-- Yüz -->
  <ellipse cx="512" cy="566" rx="200" ry="172" fill="${C.belly}"/>
  <g>
    <circle cx="436" cy="482" r="44" fill="${C.eye}"/>
    <circle cx="588" cy="482" r="44" fill="${C.eye}"/>
    <circle cx="421" cy="466" r="15" fill="#FFFFFF"/>
    <circle cx="573" cy="466" r="15" fill="#FFFFFF"/>
    <circle cx="452" cy="495" r="6.5" fill="#FFFFFF" opacity="0.7"/>
    <circle cx="604" cy="495" r="6.5" fill="#FFFFFF" opacity="0.7"/>
  </g>
  <ellipse cx="388" cy="566" rx="36" ry="21" fill="${C.cheek}" opacity="0.55"/>
  <ellipse cx="636" cy="566" rx="36" ry="21" fill="${C.cheek}" opacity="0.55"/>
  <path d="M460 568 Q512 608 564 568" stroke="${C.eye}" stroke-width="18"
        stroke-linecap="round" fill="none"/>

  <!-- Görev kartı (gölge + kart + satırlar) -->
  <rect x="148" y="678" width="728" height="420" rx="64" fill="#053B34" opacity="0.2" filter="url(#soft)"/>
  <rect x="136" y="648" width="752" height="420" rx="64" fill="${C.card}"/>
  <g>
    <circle cx="262" cy="776" r="52" fill="${C.check}"/>
    <path d="M238 776 L256 795 L289 757" stroke="#FFFFFF" stroke-width="17"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="352" y="750" width="436" height="52" rx="26" fill="${C.cardLine}"/>
    <circle cx="262" cy="936" r="46" fill="#FFFFFF" stroke="${C.ring}" stroke-width="13"/>
    <rect x="352" y="910" width="380" height="52" rx="26" fill="${C.cardLine2}"/>
  </g>

  <!-- Kartı tutan patiler -->
  <g>
    <rect x="296" y="606" width="94" height="86" rx="42" fill="${C.arm}"/>
    <rect x="634" y="606" width="94" height="86" rx="42" fill="${C.arm}"/>
  </g>`;
}

/** iOS ikonu — tam sahne, opak. */
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}${iconScene({ withBg: true })}</svg>`;

/** Android adaptive ön katman — sahne güvenli bölgeye (%66) ölçekli, şeffaf. */
const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
  <g transform="translate(512 512) scale(0.68) translate(-512 -512)">${iconScene({ withBg: false })}</g>
</svg>`;

/** Android adaptive arka katman — yalnız degrade. */
const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
</svg>`;

/** Android monochrome — tek renk siluet (launcher boyar), delikler maskeyle. */
const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <mask id="cut">
    <rect width="1024" height="1024" fill="black"/>
    <g transform="translate(512 512) scale(0.58) translate(-512 -512)" fill="white">
      <ellipse cx="366" cy="226" rx="62" ry="68" transform="rotate(-14 366 226)"/>
      <ellipse cx="658" cy="226" rx="62" ry="68" transform="rotate(14 658 226)"/>
      <ellipse cx="512" cy="544" rx="330" ry="324"/>
    </g>
    <g transform="translate(512 512) scale(0.58) translate(-512 -512)" fill="black">
      <circle cx="436" cy="482" r="44"/>
      <circle cx="588" cy="482" r="44"/>
      <path d="M460 568 Q512 608 564 568" stroke="black" stroke-width="18" stroke-linecap="round" fill="none"/>
    </g>
  </mask>
  <rect width="1024" height="1024" fill="#FFFFFF" mask="url(#cut)"/>
</svg>`;

/**
 * Tam gövde maskot (splash) — Nafu.tsx'teki "happy" duruşunun statik kopyası.
 * viewBox 240, şeffaf zemin.
 */
const mascotSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${defs}
  <ellipse cx="120" cy="222" rx="64" ry="7" fill="${C.contact}" opacity="0.12"/>

  <ellipse cx="78" cy="52" rx="15" ry="17" fill="${C.ear}" transform="rotate(-14 78 52)"/>
  <ellipse cx="162" cy="52" rx="15" ry="17" fill="${C.ear}" transform="rotate(14 162 52)"/>

  <path d="M120 42 C72 42 38 82 38 136 C38 190 74 218 120 218 C166 218 202 190 202 136 C202 82 168 42 120 42 Z" fill="url(#body)"/>
  <path d="M66 84 C78 62 96 50 118 48" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="7" stroke-linecap="round" fill="none"/>

  <ellipse cx="120" cy="146" rx="57" ry="49" fill="${C.belly}"/>

  <circle cx="97" cy="128" r="11.5" fill="${C.eye}"/>
  <circle cx="143" cy="128" r="11.5" fill="${C.eye}"/>
  <circle cx="93.2" cy="123.6" r="4" fill="#FFFFFF"/>
  <circle cx="139.2" cy="123.6" r="4" fill="#FFFFFF"/>
  <circle cx="101.3" cy="131.2" r="1.8" fill="#FFFFFF" opacity="0.7"/>
  <circle cx="147.3" cy="131.2" r="1.8" fill="#FFFFFF" opacity="0.7"/>

  <ellipse cx="82" cy="153" rx="10" ry="6" fill="${C.cheek}" opacity="0.55"/>
  <ellipse cx="158" cy="153" rx="10" ry="6" fill="${C.cheek}" opacity="0.55"/>
  <path d="M107 154 Q120 168 133 154" stroke="${C.eye}" stroke-width="5" stroke-linecap="round" fill="none"/>

  <path d="M46 130 C34 142 36 166 50 178 C60 186 73 182 75 171 C77 158 66 141 46 130 Z" fill="${C.arm}"/>
  <path d="M194 130 C206 142 204 166 190 178 C180 186 167 182 165 171 C163 158 174 141 194 130 Z" fill="${C.arm}"/>
</svg>`;

/** Favicon — köşesi yumuşak teal kare + mini yüz. */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${defs}
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <ellipse cx="128" cy="196" rx="96" ry="84" fill="${C.belly}"/>
  <circle cx="93" cy="158" r="19" fill="${C.eye}"/>
  <circle cx="163" cy="158" r="19" fill="${C.eye}"/>
  <circle cx="86.6" cy="150.8" r="6.4" fill="#FFFFFF"/>
  <circle cx="156.6" cy="150.8" r="6.4" fill="#FFFFFF"/>
  <path d="M105 196 Q128 214 151 196" stroke="${C.eye}" stroke-width="9" stroke-linecap="round" fill="none"/>
</svg>`;

function render(svg, width, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(OUT, file), png);
  console.log(`✓ ${file} (${width}px, ${png.length} B)`);
}

mkdirSync(OUT, { recursive: true });
render(iconSvg, 1024, 'icon.png');
render(foregroundSvg, 1024, 'android-icon-foreground.png');
render(backgroundSvg, 1024, 'android-icon-background.png');
render(monochromeSvg, 1024, 'android-icon-monochrome.png');
render(mascotSvg, 512, 'splash-icon.png');
render(faviconSvg, 64, 'favicon.png');
