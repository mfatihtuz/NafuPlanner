// Nafu maskotunu (statik PNG) ve hareket animasyonunu (GIF) üretir.
// Koordinatlar src/ui/mascot/Nafu.tsx ile birebir aynıdır (önizleme amaçlı).
//   node scripts/render-nafu.mjs
import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';
import { writeFileSync, mkdirSync } from 'node:fs';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const C = {
  bodyTop: '#2DB9AB',
  bodyBot: '#0E8E82',
  ear: '#15A091',
  arm: '#13988B',
  armHi: '#3CC6B7',
  belly: '#F3FBF9',
  bellyShade: '#D7F0EB',
  eye: '#222B2D',
  cheek: '#FFAE9E',
  foot: '#0C8074',
  contact: '#08443E',
  teal700: '#0B6F66',
  gold500: '#F4B740',
  gold300: '#F6D679',
  coral500: '#FF7A59',
  bg: '#F7FAF9',
  card: '#EAF7F4',
  border: '#E3ECEA',
  primarySoft: '#CFF3EC',
  primaryDark: '#0E8A7F',
  textPrimary: '#14211E',
  textSecondary: '#566B67',
  textMuted: '#9DAFAB',
};
const FONT = 'DejaVu Sans';

// --- yüz parçaları ---
const openEye = (cx, cy) => `
  <ellipse cx="${cx}" cy="${cy}" rx="12" ry="15.5" fill="${C.eye}"/>
  <circle cx="${cx + 4}" cy="${cy - 5}" r="4.6" fill="#fff"/>
  <circle cx="${cx - 3}" cy="${cy + 4}" r="2.1" fill="#fff" opacity="0.9"/>`;
const blinkEye = (cx, cy) =>
  `<path d="M${cx - 10} ${cy} Q${cx} ${cy + 5} ${cx + 10} ${cy}" stroke="${C.eye}" stroke-width="4.2" stroke-linecap="round" fill="none"/>`;
const arcEye = (cx, cy) =>
  `<path d="M${cx - 13} ${cy + 3} Q${cx} ${cy - 12} ${cx + 13} ${cy + 3}" stroke="${C.eye}" stroke-width="4.6" stroke-linecap="round" fill="none"/>`;
const sleepEye = (cx, cy) =>
  `<path d="M${cx - 12} ${cy - 2} Q${cx} ${cy + 9} ${cx + 12} ${cy - 2}" stroke="${C.eye}" stroke-width="4.2" stroke-linecap="round" fill="none"/>`;
const star = (x, y, s, color) =>
  `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${color}"/>`;

function face(expression, blink) {
  const L = 96, R = 144, EY = 128;
  switch (expression) {
    case 'celebrate':
      return `${arcEye(L, EY)}${arcEye(R, EY)}
        <path d="M104 160 Q120 166 136 160 Q128 184 120 184 Q112 184 104 160 Z" fill="${C.eye}"/>
        <ellipse cx="120" cy="180" rx="9" ry="5" fill="${C.cheek}"/>`;
    case 'sleep':
      return `${sleepEye(L, EY + 2)}${sleepEye(R, EY + 2)}
        <path d="M110 162 Q120 168 130 162" stroke="${C.eye}" stroke-width="4.2" stroke-linecap="round" fill="none"/>`;
    case 'remind':
      return `<path d="M84 106 Q96 98 108 106" stroke="${C.eye}" stroke-width="4.2" stroke-linecap="round" fill="none"/>
        <path d="M132 106 Q144 98 156 106" stroke="${C.eye}" stroke-width="4.2" stroke-linecap="round" fill="none"/>
        ${blink ? blinkEye(L, EY + 2) + blinkEye(R, EY + 2) : openEye(L, EY + 2) + openEye(R, EY + 2)}
        <circle cx="120" cy="166" r="7" fill="${C.eye}"/>`;
    default: // happy, wave
      return `${blink ? blinkEye(L, EY) + blinkEye(R, EY) : openEye(L, EY) + openEye(R, EY)}
        <path d="M104 160 Q120 176 136 160" stroke="${C.eye}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  }
}

// Dinlenen kol/pati: tek sürekli akıcı şekil.
const restLeft = `<path d="M74 150 C56 148 44 166 49 184 C53 197 70 200 80 189 C90 178 88 160 74 150 Z" fill="${C.arm}"/>
  <ellipse cx="62" cy="170" rx="6" ry="8" fill="${C.armHi}" opacity="0.55" transform="rotate(-20 62 170)"/>`;
const restRight = `<path d="M166 150 C184 148 196 166 191 184 C187 197 170 200 160 189 C150 178 152 160 166 150 Z" fill="${C.arm}"/>
  <ellipse cx="178" cy="170" rx="6" ry="8" fill="${C.armHi}" opacity="0.55" transform="rotate(20 178 170)"/>`;

// Selam veren kalkık kol: tek sürekli akıcı şekil, açık pati + parmak çentikleri.
const waveArmShapes = `<path d="M150 132 C146 108 156 82 176 64 C181 59 188 58 193 63 C197 56 205 57 208 65 C214 61 221 68 216 78 C208 98 190 118 174 130 C165 137 151 139 150 132 Z" fill="${C.arm}"/>
  <path d="M193 64 q4 5 2 12" stroke="${C.bodyBot}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M205 67 q3 5 0 12" stroke="${C.bodyBot}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.45"/>
  <ellipse cx="196" cy="76" rx="7" ry="9" fill="${C.armHi}" opacity="0.5" transform="rotate(28 196 76)"/>`;

function nafu(expression, sfx, opts = {}) {
  const { blink = false, armAngle = 0 } = opts;
  const waveArm = `<g transform="rotate(${armAngle} 150 132)">${waveArmShapes}</g>`;
  const arms = expression === 'wave' ? restLeft + waveArm : restLeft + restRight;
  return `
  <defs>
    <linearGradient id="body${sfx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bodyTop}"/><stop offset="1" stop-color="${C.bodyBot}"/>
    </linearGradient>
  </defs>
  <ellipse cx="120" cy="226" rx="62" ry="8" fill="${C.contact}" opacity="0.14"/>
  <ellipse cx="104" cy="206" rx="15" ry="10" fill="${C.foot}"/>
  <ellipse cx="136" cy="206" rx="15" ry="10" fill="${C.foot}"/>
  <path d="M86 54 C80 28 106 24 110 48 C112 62 96 68 86 54 Z" fill="${C.ear}"/>
  <path d="M154 54 C160 28 134 24 130 48 C128 62 144 68 154 54 Z" fill="${C.ear}"/>
  <ellipse cx="120" cy="126" rx="92" ry="86" fill="url(#body${sfx})"/>
  <ellipse cx="94" cy="80" rx="40" ry="26" fill="#FFFFFF" opacity="0.13" transform="rotate(-16 94 80)"/>
  <ellipse cx="120" cy="146" rx="64" ry="58" fill="${C.bellyShade}"/>
  <ellipse cx="120" cy="142" rx="62" ry="55" fill="${C.belly}"/>
  <ellipse cx="78" cy="156" rx="12" ry="7.5" fill="${C.cheek}" opacity="0.62"/>
  <ellipse cx="162" cy="156" rx="12" ry="7.5" fill="${C.cheek}" opacity="0.62"/>
  ${face(expression, blink)}
  ${arms}
  ${expression === 'celebrate' ? star(40, 58, 9, C.gold500) + star(196, 78, 7, C.gold300) + star(60, 34, 6, C.coral500) + star(176, 40, 8, C.gold500) : ''}
  ${expression === 'sleep' ? `<text x="184" y="74" fill="${C.teal700}" font-size="20" font-weight="bold" font-family="${FONT}">z</text><text x="198" y="56" fill="${C.ear}" font-size="26" font-weight="bold" font-family="${FONT}">Z</text>` : ''}`;
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

// --- 1) İfade vitrini (viewBox 240) ---
function showcase() {
  const items = [
    ['happy', 'Mutlu'],
    ['wave', 'Selam'],
    ['celebrate', 'Kutlama'],
    ['remind', 'Hatırlatma'],
    ['sleep', 'Uyku'],
  ];
  const cell = 250;
  const cells = items
    .map(([exp, label], i) => {
      const cx = i * cell + 125;
      return `<g transform="translate(${i * cell + 25}, 64) scale(0.82)">${nafu(exp, i)}</g>
        <text x="${cx}" y="330" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="bold" fill="${C.primaryDark}">${label}</text>`;
    })
    .join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1250" height="356" viewBox="0 0 1250 356">
    <rect width="1250" height="356" rx="28" fill="${C.bg}"/>
    <text x="625" y="42" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="${C.textPrimary}">Nafu — Nafu Planlayıcı maskotu</text>
    ${cells}
  </svg>`;
  renderPng(svg, 'docs/preview/nafu-showcase.png', 2100);
}

// --- 2) Giriş ekranı taslağı ---
function loginMockup() {
  const W = 430, H = 880, px = 20, py = 20, iw = 390, ih = 840;
  const cx = px + iw / 2;
  const googleG = `
    <g transform="translate(${cx - 96}, 742) scale(0.46)">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${C.card}"/>
    <rect x="${px}" y="${py}" width="${iw}" height="${ih}" rx="46" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
    <g transform="translate(${cx - 120}, 168) scale(1.0)">${nafu('wave', 'L', { armAngle: 6 })}</g>
    <text x="${cx}" y="500" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="bold" fill="${C.textPrimary}">Merhaba, ben Nafu!</text>
    <text x="${cx}" y="538" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.textSecondary}">Ev işlerini, alışverişi ve hatırlatmaları</text>
    <text x="${cx}" y="562" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.textSecondary}">birlikte yönetelim. Hiçbir şey unutulmasın.</text>
    <rect x="${px + 24}" y="726" width="${iw - 48}" height="54" rx="22" fill="${C.primarySoft}"/>
    ${googleG}
    <text x="${cx + 14}" y="759" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="${C.primaryDark}">Google ile devam et</text>
    <text x="${cx}" y="812" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${C.textMuted}">Nafu Planlayıcı · Evi birlikte, tıkır tıkır yönetin</text>
  </svg>`;
  renderPng(svg, 'docs/preview/nafu-login-mockup.png', 860);
}

// --- 3) Hareket animasyonu (GIF): kol-only selam + nefes + göz kırpma ---
function animationGif() {
  const W = 500, H = 280, FRAMES = 36, DELAY = 45;
  const gif = GIFEncoder();
  const TAU = Math.PI * 2;
  const easeInOut = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const breath = easeInOut((Math.sin(TAU * t) + 1) / 2); // 0..1..0 yumuşak
    const bobY = -3 * breath;
    const sc = (1 + 0.02 * breath).toFixed(4);
    // kol salınımı (yumuşak): -8°..+16°
    const armAngle = (4 + 12 * Math.sin(TAU * t * 2)).toFixed(2);
    const blink = f === 9 || f === 10 || f === 27;
    // kutlama: yumuşak zıplama
    const hop = Math.abs(Math.sin(Math.PI * t * 2));
    const hopY = (-14 * hop).toFixed(2);
    const hopSc = (1 + 0.04 * hop).toFixed(4);

    const left = `<g transform="translate(60 70) scale(${sc}) translate(0 ${bobY.toFixed(2)})">${nafu('wave', 'A', { blink, armAngle: Number(armAngle) })}</g>`;
    const right = `<g transform="translate(300 70) scale(${hopSc}) translate(0 ${hopY})">${nafu('celebrate', 'B')}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" rx="24" fill="${C.card}"/>
      <text x="143" y="262" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="${C.primaryDark}">Selam</text>
      <text x="383" y="262" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="${C.primaryDark}">Kutlama</text>
      ${left}${right}</svg>`;

    const { data, width, height } = renderPixels(svg, W);
    const palette = quantize(data, 256, { format: 'rgb565' });
    const index = applyPalette(data, palette, 'rgb565');
    gif.writeFrame(index, width, height, { palette, delay: DELAY });
  }
  gif.finish();
  writeFileSync('docs/preview/nafu-animation.gif', gif.bytes());
  console.log('yazıldı: docs/preview/nafu-animation.gif');
}

mkdirSync('docs/preview', { recursive: true });
showcase();
loginMockup();
animationGif();
console.log('Bitti.');
