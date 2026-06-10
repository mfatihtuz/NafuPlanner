// Nafu maskotunu (statik PNG) ve hareket animasyonunu (GIF) üretir.
// Koordinatlar src/ui/mascot/Nafu.tsx ile birebir aynıdır (önizleme amaçlı).
//   node scripts/render-nafu.mjs
import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';
import { writeFileSync, mkdirSync } from 'node:fs';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const C = {
  teal50: '#ECFBF8',
  teal500: '#1AA597',
  teal600: '#0E8A7F',
  teal700: '#0B6F66',
  ink: '#14211E',
  cheek: '#FFB3A0',
  coral500: '#FF7A59',
  gold300: '#F6D679',
  gold500: '#F4B740',
  bg: '#F7FAF9',
  card: '#F2FCFA',
  surface: '#FFFFFF',
  border: '#E3ECEA',
  primarySoft: '#CFF3EC',
  primaryDark: '#0E8A7F',
  textPrimary: '#14211E',
  textSecondary: '#566B67',
  textMuted: '#9DAFAB',
};
const FONT = 'DejaVu Sans';

const openEye = (cx, cy) => `
  <ellipse cx="${cx}" cy="${cy}" rx="11" ry="14" fill="${C.ink}"/>
  <circle cx="${cx + 3.5}" cy="${cy - 4.5}" r="4.2" fill="#fff"/>
  <circle cx="${cx - 2.5}" cy="${cy + 3.5}" r="2" fill="#fff" opacity="0.85"/>`;
const blinkEye = (cx, cy) =>
  `<path d="M${cx - 9} ${cy} Q${cx} ${cy + 4} ${cx + 9} ${cy}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
const happyArcEye = (cx, cy) =>
  `<path d="M${cx - 12} ${cy + 3} Q${cx} ${cy - 11} ${cx + 12} ${cy + 3}" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;
const closedEye = (cx, cy) =>
  `<path d="M${cx - 11} ${cy - 2} Q${cx} ${cy + 8} ${cx + 11} ${cy - 2}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
const star = (x, y, s, color) =>
  `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${color}"/>`;

function face(expression, blink) {
  switch (expression) {
    case 'celebrate':
      return `${happyArcEye(86, 118)}${happyArcEye(134, 118)}
        <path d="M90 152 Q110 158 130 152 Q122 176 110 176 Q98 176 90 152 Z" fill="${C.ink}"/>
        <ellipse cx="110" cy="172" rx="9" ry="5" fill="${C.cheek}"/>`;
    case 'sleep':
      return `${closedEye(86, 120)}${closedEye(134, 120)}
        <path d="M100 154 Q110 160 120 154" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    case 'remind':
      return `<path d="M74 98 Q86 90 98 98" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M122 98 Q134 90 146 98" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>
        ${blink ? blinkEye(86, 120) + blinkEye(134, 120) : openEye(86, 120) + openEye(134, 120)}
        <circle cx="110" cy="158" r="7" fill="${C.ink}"/>`;
    default: // happy, wave
      return `${blink ? blinkEye(86, 118) + blinkEye(134, 118) : openEye(86, 118) + openEye(134, 118)}
        <path d="M92 152 Q110 168 128 152" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;
  }
}

const restPaw = (sfx, cx, cy, tilt) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="18" fill="url(#arm${sfx})" transform="rotate(${tilt} ${cx} ${cy})"/>
   <ellipse cx="${cx - 4}" cy="${cy - 6}" rx="5" ry="7" fill="#fff" opacity="0.22"/>`;
const waveArm = (sfx) =>
  `<ellipse cx="176" cy="96" rx="14" ry="23" fill="url(#arm${sfx})" transform="rotate(-33 176 96)"/>
   <circle cx="193" cy="66" r="15" fill="url(#arm${sfx})"/>
   <circle cx="184" cy="54" r="4.5" fill="url(#arm${sfx})"/>
   <circle cx="193" cy="51" r="5" fill="url(#arm${sfx})"/>
   <circle cx="202" cy="55" r="4.5" fill="url(#arm${sfx})"/>
   <ellipse cx="189" cy="61" rx="5" ry="6" fill="#fff" opacity="0.28"/>`;

// Tek Nafu (defs + şekiller). id çakışmasını önlemek için sfx.
function nafu(expression, sfx, blink = false) {
  const arms =
    expression === 'wave'
      ? restPaw(sfx, 54, 173, -16) + waveArm(sfx)
      : restPaw(sfx, 54, 173, -16) + restPaw(sfx, 166, 173, 16);
  return `
  <defs>
    <radialGradient id="body${sfx}" cx="0.4" cy="0.34" r="0.78">
      <stop offset="0" stop-color="#54CFC1"/><stop offset="0.55" stop-color="${C.teal500}"/><stop offset="1" stop-color="#0A6A60"/>
    </radialGradient>
    <linearGradient id="arm${sfx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3CC3B4"/><stop offset="1" stop-color="#0E8A7F"/>
    </linearGradient>
    <linearGradient id="tuft${sfx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.teal500}"/><stop offset="1" stop-color="${C.teal700}"/>
    </linearGradient>
    <linearGradient id="foot${sfx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.teal600}"/><stop offset="1" stop-color="#0A625A"/>
    </linearGradient>
    <radialGradient id="gloss${sfx}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="110" cy="218" rx="66" ry="9" fill="#0A3A35" opacity="0.18"/>
  <ellipse cx="92" cy="200" rx="16" ry="10" fill="url(#foot${sfx})"/>
  <ellipse cx="128" cy="200" rx="16" ry="10" fill="url(#foot${sfx})"/>
  <path d="M66 56 C52 24 84 18 90 48 C93 64 76 70 66 56 Z" fill="url(#tuft${sfx})"/>
  <path d="M154 56 C168 24 136 18 130 48 C127 64 144 70 154 56 Z" fill="url(#tuft${sfx})"/>
  <path d="M103 32 C103 15 117 15 117 30 C123 23 131 32 122 41 C115 47 105 46 103 32 Z" fill="url(#tuft${sfx})"/>
  <ellipse cx="110" cy="120" rx="88" ry="82" fill="url(#body${sfx})"/>
  <ellipse cx="110" cy="166" rx="72" ry="42" fill="#074F49" opacity="0.16"/>
  <ellipse cx="84" cy="74" rx="30" ry="20" fill="url(#gloss${sfx})" transform="rotate(-18 84 74)"/>
  <ellipse cx="72" cy="66" rx="7" ry="5" fill="#fff" opacity="0.5"/>
  <ellipse cx="110" cy="132" rx="60" ry="55" fill="#0C7A70" opacity="0.28"/>
  <ellipse cx="110" cy="136" rx="58" ry="53" fill="#F1FCFA"/>
  <ellipse cx="68" cy="150" rx="12" ry="8" fill="${C.cheek}" opacity="0.8"/>
  <ellipse cx="152" cy="150" rx="12" ry="8" fill="${C.cheek}" opacity="0.8"/>
  ${face(expression, blink)}
  ${arms}
  ${expression === 'celebrate' ? star(38, 58, 9, C.gold500) + star(184, 76, 7, C.gold300) + star(56, 36, 6, C.coral500) + star(166, 42, 8, C.gold500) : ''}
  ${expression === 'sleep' ? `<text x="170" y="72" fill="${C.teal600}" font-size="20" font-weight="bold" font-family="${FONT}">z</text><text x="184" y="54" fill="${C.teal500}" font-size="26" font-weight="bold" font-family="${FONT}">Z</text>` : ''}`;
}

function renderPng(svg, outPath, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: FONT },
  });
  writeFileSync(outPath, r.render().asPng());
  console.log('yazıldı:', outPath);
}

function renderPixels(svg, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: C.card,
    font: { loadSystemFonts: true, defaultFontFamily: FONT },
  });
  const img = r.render();
  return { data: Uint8Array.from(img.pixels), width: img.width, height: img.height };
}

// --- 1) İfade vitrini ---------------------------------------------------------
function showcase() {
  const items = [
    ['happy', 'Mutlu'],
    ['wave', 'Selam'],
    ['celebrate', 'Kutlama'],
    ['remind', 'Hatırlatma'],
    ['sleep', 'Uyku'],
  ];
  const cell = 240;
  const cells = items
    .map(([exp, label], i) => {
      const cx = i * cell + 120;
      return `<g transform="translate(${i * cell + 24}, 70) scale(0.84)">${nafu(exp, i)}</g>
        <text x="${cx}" y="322" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="bold" fill="${C.teal700}">${label}</text>`;
    })
    .join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
    <rect width="1200" height="350" rx="28" fill="${C.bg}"/>
    <text x="600" y="44" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="${C.textPrimary}">Nafu — Nafu Planlayıcı maskotu</text>
    ${cells}
  </svg>`;
  renderPng(svg, 'docs/preview/nafu-showcase.png', 2000);
}

// --- 2) Giriş ekranı taslağı --------------------------------------------------
function loginMockup() {
  const W = 430, H = 880, px = 20, py = 20, iw = 390, ih = 840;
  const innerCx = px + iw / 2;
  const googleG = `
    <g transform="translate(${innerCx - 96}, 742) scale(0.46)">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${C.teal50}"/>
    <rect x="${px}" y="${py}" width="${iw}" height="${ih}" rx="46" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
    <g transform="translate(${innerCx - 110}, 178) scale(1.0)">${nafu('wave', 'L')}</g>
    <text x="${innerCx}" y="486" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="bold" fill="${C.textPrimary}">Merhaba, ben Nafu!</text>
    <text x="${innerCx}" y="524" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.textSecondary}">Ev işlerini, alışverişi ve hatırlatmaları</text>
    <text x="${innerCx}" y="548" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.textSecondary}">birlikte yönetelim. Hiçbir şey unutulmasın.</text>
    <rect x="${px + 24}" y="726" width="${iw - 48}" height="54" rx="22" fill="${C.primarySoft}"/>
    ${googleG}
    <text x="${innerCx + 14}" y="759" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="${C.primaryDark}">Google ile devam et</text>
    <text x="${innerCx}" y="812" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${C.textMuted}">Nafu Planlayıcı · Evi birlikte, tıkır tıkır yönetin</text>
  </svg>`;
  renderPng(svg, 'docs/preview/nafu-login-mockup.png', 860);
}

// --- 3) Hareket animasyonu (GIF) ---------------------------------------------
// Sol: Selam (sallanma + nefes + göz kırpma). Sağ: Kutlama (zıplama).
function animationGif() {
  const W = 480, H = 270, FRAMES = 28, DELAY = 55;
  const gif = GIFEncoder();
  const TAU = Math.PI * 2;

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const bobY = -5 * (0.5 - 0.5 * Math.cos(TAU * t * 2)); // nefes (2 döngü)
    const swayDeg = 7 * Math.sin(TAU * t * 4); // selam sallanması
    const blink = f === 7 || f === 8 || f === 21;
    const hop = Math.abs(Math.sin(Math.PI * t * 2)); // zıplama (2 kez)
    const hopY = -16 * hop;
    const hopS = 1 + 0.05 * hop;

    const left = `<g transform="translate(70 78) scale(0.6) rotate(${swayDeg.toFixed(2)} 110 120) translate(0 ${bobY.toFixed(2)})">${nafu('wave', 'A', blink)}</g>`;
    const right = `<g transform="translate(284 78) scale(${(0.6 * hopS).toFixed(3)}) translate(0 ${hopY.toFixed(2)})">${nafu('celebrate', 'B')}</g>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" rx="24" fill="${C.card}"/>
      <text x="130" y="252" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="${C.teal700}">Selam</text>
      <text x="350" y="252" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="${C.teal700}">Kutlama</text>
      ${left}${right}</svg>`;

    const { data, width, height } = renderPixels(svg, W);
    const palette = quantize(data, 256, { format: 'rgb565' });
    const index = applyPalette(data, palette, 'rgb565');
    gif.writeFrame(index, width, height, { palette, delay: DELAY });
  }

  gif.finish();
  writeFileSync('docs/preview/nafu-animation.gif', Buffer.from(gif.bytes()));
  console.log('yazıldı: docs/preview/nafu-animation.gif');
}

mkdirSync('docs/preview', { recursive: true });
showcase();
loginMockup();
animationGif();
console.log('Bitti.');
