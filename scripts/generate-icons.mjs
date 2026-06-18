/**
 * Nafu Planlayıcı — ikon / splash / favicon üretici.
 *
 * Tüm marka görselleri tek kaynaktan (bu dosyadaki Nafu SVG'si) üretilir:
 *   node scripts/generate-icons.mjs [çıkışKlasörü=assets]
 *
 * Tasarım: daha tatlı, "3D" hisli Nafu (parlak teal degrade gövde, üst sheen,
 * alt jant gölgesi, iri parlak gözler, pembe yanaklar). İkon ARKA PLANI artık
 * AÇIK tema rengidir — böylece teal maskot zeminle karışmaz, net görünür.
 * Maskot geometrisi src/ui/mascot/Nafu.tsx ile uyumlu tutulmalıdır.
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'assets';

// Marka paleti (src/ui/theme/colors.ts ile uyumlu, biraz daha parlak/tatlı)
const C = {
  bodyTop: '#4FE0CF',
  bodyMid: '#1FB9AA',
  bodyBot: '#0C8A7E',
  ear: '#1AAE9D',
  arm: '#149B8E',
  foot: '#0A7B70',
  belly: '#F5FCFA',
  bellyShade: '#DCF2ED',
  eye: '#243230',
  cheek: '#FF9E8A',
  contact: '#08443E',
  bgTop: '#F2FCFA',
  bgBot: '#CDEFE9',
};

const defs = `
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBot}"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bodyTop}"/>
      <stop offset="0.55" stop-color="${C.bodyMid}"/>
      <stop offset="1" stop-color="${C.bodyBot}"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>`;

/**
 * Tatlı, 3D hisli Nafu (viewBox 0 0 240 240). `withShadow` ikon/splash için
 * yumuşak zemin gölgesi ekler. Tek kaynak — tüm sahneler bunu ölçekler.
 */
function nafu({ withShadow = false } = {}) {
  return `
  ${withShadow ? `<ellipse cx="120" cy="210" rx="74" ry="20" fill="${C.contact}" opacity="0.16" filter="url(#soft)"/>` : ''}
  <ellipse cx="120" cy="219" rx="58" ry="7" fill="${C.contact}" opacity="0.13"/>

  <!-- ayaklar -->
  <ellipse cx="101" cy="205" rx="16" ry="10" fill="${C.foot}"/>
  <ellipse cx="139" cy="205" rx="16" ry="10" fill="${C.foot}"/>

  <!-- kulaklar -->
  <ellipse cx="80" cy="50" rx="16" ry="19" fill="${C.ear}" transform="rotate(-16 80 50)"/>
  <ellipse cx="160" cy="50" rx="16" ry="19" fill="${C.ear}" transform="rotate(16 160 50)"/>
  <ellipse cx="82" cy="53" rx="6.5" ry="9" fill="${C.bodyTop}" opacity="0.65" transform="rotate(-16 82 53)"/>
  <ellipse cx="158" cy="53" rx="6.5" ry="9" fill="${C.bodyTop}" opacity="0.65" transform="rotate(16 158 53)"/>

  <!-- gövde -->
  <path d="M120 40 C69 40 36 80 36 134 C36 192 75 214 120 214 C165 214 204 192 204 134 C204 80 171 40 120 40 Z" fill="url(#body)"/>
  <!-- alt jant gölgesi (derinlik) -->
  <path d="M44 150 C58 196 96 214 120 214 C144 214 182 196 196 150 C190 190 158 207 120 207 C82 207 54 190 44 150 Z" fill="${C.bodyBot}" opacity="0.4"/>
  <!-- üst sheen (parlaklık) -->
  <ellipse cx="92" cy="78" rx="45" ry="30" fill="#FFFFFF" opacity="0.22" transform="rotate(-18 92 78)"/>

  <!-- yüz -->
  <ellipse cx="120" cy="150" rx="60" ry="52" fill="${C.bellyShade}"/>
  <ellipse cx="120" cy="146" rx="58" ry="49" fill="${C.belly}"/>

  <!-- gözler (iri, parlak, tatlı) -->
  <ellipse cx="98" cy="132" rx="13.5" ry="17" fill="${C.eye}"/>
  <ellipse cx="142" cy="132" rx="13.5" ry="17" fill="${C.eye}"/>
  <circle cx="103" cy="126" r="5.2" fill="#FFFFFF"/>
  <circle cx="147" cy="126" r="5.2" fill="#FFFFFF"/>
  <circle cx="94" cy="138" r="2.4" fill="#FFFFFF" opacity="0.85"/>
  <circle cx="138" cy="138" r="2.4" fill="#FFFFFF" opacity="0.85"/>

  <!-- yanaklar -->
  <ellipse cx="78" cy="157" rx="11.5" ry="7.5" fill="${C.cheek}" opacity="0.62"/>
  <ellipse cx="162" cy="157" rx="11.5" ry="7.5" fill="${C.cheek}" opacity="0.62"/>

  <!-- gülümseme -->
  <path d="M106 162 Q120 177 134 162" stroke="${C.eye}" stroke-width="5" stroke-linecap="round" fill="none"/>

  <!-- patiler -->
  <path d="M48 138 C34 148 34 170 48 180 C58 187 72 183 74 172 C76 159 66 146 48 138 Z" fill="${C.arm}"/>
  <path d="M192 138 C206 148 206 170 192 180 C182 187 168 183 166 172 C164 159 174 146 192 138 Z" fill="${C.arm}"/>`;
}

/** iOS ikonu (1024, opak): açık tema zemini + büyük tatlı Nafu. */
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(512 536) scale(3.25) translate(-120 -128)">${nafu({ withShadow: true })}</g>
</svg>`;

/** Android adaptive ön katman — Nafu güvenli bölgeye ölçekli, şeffaf. */
const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
  <g transform="translate(512 524) scale(2.6) translate(-120 -128)">${nafu()}</g>
</svg>`;

/** Android adaptive arka katman — açık tema degradesi (maskot belli olsun). */
const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

/** Android monochrome — tek renk siluet (launcher boyar). */
const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <mask id="cut">
    <rect width="1024" height="1024" fill="black"/>
    <g transform="translate(512 524) scale(2.6) translate(-120 -128)" fill="white">
      <ellipse cx="80" cy="50" rx="16" ry="19" transform="rotate(-16 80 50)"/>
      <ellipse cx="160" cy="50" rx="16" ry="19" transform="rotate(16 160 50)"/>
      <path d="M120 40 C69 40 36 80 36 134 C36 192 75 214 120 214 C165 214 204 192 204 134 C204 80 171 40 120 40 Z"/>
    </g>
    <g transform="translate(512 524) scale(2.6) translate(-120 -128)" fill="black">
      <ellipse cx="98" cy="132" rx="13.5" ry="17"/>
      <ellipse cx="142" cy="132" rx="13.5" ry="17"/>
      <path d="M106 162 Q120 177 134 162" stroke="black" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
  </mask>
  <rect width="1024" height="1024" fill="#FFFFFF" mask="url(#cut)"/>
</svg>`;

/** Splash maskotu — şeffaf zemin (splash arka planı app.config'te beyaz). */
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
  <g transform="translate(256 272) scale(1.95) translate(-120 -128)">${nafu({ withShadow: true })}</g>
</svg>`;

/** Favicon — yumuşak köşeli açık kare + Nafu. */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${defs}
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <g transform="translate(128 136) scale(0.82) translate(-120 -128)">${nafu()}</g>
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
render(splashSvg, 512, 'splash-icon.png');
render(faviconSvg, 64, 'favicon.png');
