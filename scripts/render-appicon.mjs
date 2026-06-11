// Uygulama ikonu/splash görsellerini Nafu'dan üretir (kaynak: render-nafu.mjs
// geometrisi). Çalıştır: node scripts/render-appicon.mjs
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const TEAL_BG_TOP = '#2DB9AB';
const TEAL_BG_BOT = '#0E8E82';
const SOFT_BG = '#ECFBF8';

// render-nafu.mjs ile aynı gövde (happy ifade, sade) — ikon için bağımsız kopya.
const NAFU = `
  <ellipse cx="104" cy="206" rx="15" ry="10" fill="#0C8074"/>
  <ellipse cx="136" cy="206" rx="15" ry="10" fill="#0C8074"/>
  <path d="M86 54 C80 28 106 24 110 48 C112 62 96 68 86 54 Z" fill="#15A091"/>
  <path d="M154 54 C160 28 134 24 130 48 C128 62 144 68 154 54 Z" fill="#15A091"/>
  <ellipse cx="120" cy="126" rx="92" ry="86" fill="url(#body)"/>
  <ellipse cx="94" cy="80" rx="40" ry="26" fill="#FFFFFF" opacity="0.13" transform="rotate(-16 94 80)"/>
  <ellipse cx="120" cy="146" rx="64" ry="58" fill="#D7F0EB"/>
  <ellipse cx="120" cy="142" rx="62" ry="55" fill="#F3FBF9"/>
  <ellipse cx="78" cy="156" rx="12" ry="7.5" fill="#FFAE9E" opacity="0.62"/>
  <ellipse cx="162" cy="156" rx="12" ry="7.5" fill="#FFAE9E" opacity="0.62"/>
  <ellipse cx="96" cy="128" rx="12" ry="15.5" fill="#222B2D"/>
  <circle cx="100" cy="123" r="4.6" fill="#FFFFFF"/>
  <circle cx="93" cy="132" r="2.1" fill="#FFFFFF" opacity="0.9"/>
  <ellipse cx="144" cy="128" rx="12" ry="15.5" fill="#222B2D"/>
  <circle cx="148" cy="123" r="4.6" fill="#FFFFFF"/>
  <circle cx="141" cy="132" r="2.1" fill="#FFFFFF" opacity="0.9"/>
  <path d="M104 160 Q120 176 136 160" stroke="#222B2D" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M74 150 C56 148 44 166 49 184 C53 197 70 200 80 189 C90 178 88 160 74 150 Z" fill="#13988B"/>
  <path d="M166 150 C184 148 196 166 191 184 C187 197 170 200 160 189 C150 178 152 160 166 150 Z" fill="#13988B"/>`;

const bodyGradient = `<linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${TEAL_BG_TOP}"/><stop offset="1" stop-color="${TEAL_BG_BOT}"/>
</linearGradient>`;

function png(svg, out, width) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  writeFileSync(out, r.render().asPng());
  console.log('yazıldı:', out, `${width}px`);
}

// iOS uygulama ikonu (1024, opak, tam kanama): yumuşak zemin + büyük Nafu.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bodyGradient}
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F2FCFA"/><stop offset="1" stop-color="#D9F3EE"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(146 128) scale(3.05)">${NAFU}</g>
</svg>`;
png(icon, 'assets/icon.png', 1024);

// Splash ikonu (şeffaf zemin, yalnız Nafu) — splash arka planı app.config'te beyaz.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>${bodyGradient}</defs>
  <g transform="translate(76 56) scale(1.5)">${NAFU}</g>
</svg>`;
png(splash, 'assets/splash-icon.png', 512);

// Android adaptive: ön yüz (şeffaf, güvenli alan ortada ~%66) + düz arka plan.
const androidFg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bodyGradient}</defs>
  <g transform="translate(262 232) scale(2.1)">${NAFU}</g>
</svg>`;
png(androidFg, 'assets/android-icon-foreground.png', 1024);

const androidBg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${SOFT_BG}"/>
</svg>`;
png(androidBg, 'assets/android-icon-background.png', 1024);

// Android monochrome (tek renk siluet).
const mono = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(262 232) scale(2.1)">
    <path d="M86 54 C80 28 106 24 110 48 C112 62 96 68 86 54 Z" fill="#FFFFFF"/>
    <path d="M154 54 C160 28 134 24 130 48 C128 62 144 68 154 54 Z" fill="#FFFFFF"/>
    <ellipse cx="120" cy="126" rx="92" ry="86" fill="#FFFFFF"/>
    <ellipse cx="104" cy="206" rx="15" ry="10" fill="#FFFFFF"/>
    <ellipse cx="136" cy="206" rx="15" ry="10" fill="#FFFFFF"/>
  </g>
</svg>`;
png(mono, 'assets/android-icon-monochrome.png', 1024);

// Favicon (web).
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>${bodyGradient}</defs>
  <rect width="64" height="64" rx="14" fill="${SOFT_BG}"/>
  <g transform="translate(5 3) scale(0.225)">${NAFU}</g>
</svg>`;
png(favicon, 'assets/favicon.png', 64);

console.log('Bitti.');
