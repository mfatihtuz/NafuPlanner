// Nafu maskotunu ve giriş ekranı taslağını PNG olarak üretir.
// Kaynak koordinatlar src/ui/mascot/Nafu.tsx ile birebir aynıdır (önizleme amaçlı).
//   node scripts/render-nafu.mjs
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const C = {
  teal50: '#ECFBF8',
  teal400: '#3FBEAE',
  teal500: '#1AA597',
  teal600: '#0E8A7F',
  teal700: '#0B6F66',
  ink: '#14211E',
  cheek: '#FFB3A0',
  coral500: '#FF7A59',
  gold300: '#F6D679',
  gold500: '#F4B740',
  bg: '#F7FAF9',
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

const happyArcEye = (cx, cy) =>
  `<path d="M${cx - 12} ${cy + 3} Q${cx} ${cy - 11} ${cx + 12} ${cy + 3}" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;

const closedEye = (cx, cy) =>
  `<path d="M${cx - 11} ${cy - 2} Q${cx} ${cy + 8} ${cx + 11} ${cy - 2}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>`;

const star = (x, y, s, color) =>
  `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${color}"/>`;

function face(expression) {
  switch (expression) {
    case 'celebrate':
      return `${happyArcEye(86, 116)}${happyArcEye(134, 116)}
        <path d="M90 150 Q110 156 130 150 Q122 174 110 174 Q98 174 90 150 Z" fill="${C.ink}"/>
        <ellipse cx="110" cy="170" rx="9" ry="5" fill="${C.cheek}"/>`;
    case 'sleep':
      return `${closedEye(86, 118)}${closedEye(134, 118)}
        <path d="M100 152 Q110 158 120 152" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    case 'remind':
      return `<path d="M74 96 Q86 88 98 96" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M122 96 Q134 88 146 96" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/>
        ${openEye(86, 118)}${openEye(134, 118)}
        <circle cx="110" cy="156" r="7" fill="${C.ink}"/>`;
    default: // happy, wave
      return `${openEye(86, 116)}${openEye(134, 116)}
        <path d="M92 150 Q110 166 128 150" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;
  }
}

function arms(expression) {
  const raised = expression === 'wave' || expression === 'celebrate';
  const pointing = expression === 'remind';
  const leftCy = expression === 'celebrate' ? 92 : 150;
  const leftRot = expression === 'celebrate' ? 'rotate(28 34 92)' : 'rotate(12 34 150)';
  const rightCy = raised || pointing ? 92 : 150;
  const rightRot = raised || pointing ? 'rotate(-28 186 92)' : 'rotate(-12 186 150)';
  return `<ellipse cx="34" cy="${leftCy}" rx="13" ry="20" fill="${C.teal600}" transform="${leftRot}"/>
    <ellipse cx="186" cy="${rightCy}" rx="13" ry="20" fill="${C.teal600}" transform="${rightRot}"/>`;
}

// Tek bir Nafu'yu (defs + şekiller) verir. id çakışmasını önlemek için suffix.
function nafu(expression, sfx) {
  return `
  <defs>
    <linearGradient id="body${sfx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.teal400}"/><stop offset="1" stop-color="${C.teal600}"/>
    </linearGradient>
    <radialGradient id="shine${sfx}" cx="0.35" cy="0.3" r="0.7">
      <stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tuft${sfx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.teal500}"/><stop offset="1" stop-color="${C.teal700}"/>
    </linearGradient>
  </defs>
  <ellipse cx="90" cy="198" rx="15" ry="9" fill="${C.teal700}"/>
  <ellipse cx="130" cy="198" rx="15" ry="9" fill="${C.teal700}"/>
  ${arms(expression)}
  <path d="M70 58 C58 28 86 22 90 50 C92 64 78 70 70 58 Z" fill="url(#tuft${sfx})"/>
  <path d="M150 58 C162 28 134 22 130 50 C128 64 142 70 150 58 Z" fill="url(#tuft${sfx})"/>
  <path d="M104 34 C104 18 116 18 116 32 C122 26 128 34 120 42 C114 48 106 46 104 34 Z" fill="url(#tuft${sfx})"/>
  <ellipse cx="110" cy="122" rx="86" ry="80" fill="url(#body${sfx})"/>
  <ellipse cx="110" cy="122" rx="86" ry="80" fill="url(#shine${sfx})"/>
  <ellipse cx="110" cy="134" rx="60" ry="55" fill="${C.teal50}"/>
  <ellipse cx="66" cy="146" rx="12" ry="8" fill="${C.cheek}" opacity="0.75"/>
  <ellipse cx="154" cy="146" rx="12" ry="8" fill="${C.cheek}" opacity="0.75"/>
  ${face(expression)}
  ${expression === 'celebrate' ? star(40, 60, 9, C.gold500) + star(182, 78, 7, C.gold300) + star(58, 38, 6, C.coral500) + star(166, 44, 8, C.gold500) : ''}
  ${expression === 'sleep' ? `<text x="168" y="70" fill="${C.teal600}" font-size="20" font-weight="bold" font-family="${FONT}">z</text><text x="182" y="54" fill="${C.teal500}" font-size="26" font-weight="bold" font-family="${FONT}">Z</text>` : ''}`;
}

function renderToPng(svg, outPath, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: FONT },
  });
  writeFileSync(outPath, r.render().asPng());
  console.log('yazıldı:', outPath);
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
      return `<g transform="translate(${i * cell + 26}, 84) scale(0.85)">${nafu(exp, i)}</g>
        <text x="${cx}" y="312" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="bold" fill="${C.teal700}">${label}</text>`;
    })
    .join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="340" viewBox="0 0 1200 340">
    <rect width="1200" height="340" rx="28" fill="${C.bg}"/>
    <text x="600" y="46" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="${C.textPrimary}">Nafu — Nafu Planlayıcı maskotu</text>
    ${cells}
  </svg>`;
  renderToPng(svg, 'docs/preview/nafu-showcase.png', 2000);
}

// --- 2) Giriş ekranı taslağı --------------------------------------------------
function loginMockup() {
  const W = 430, H = 880, px = 20, py = 20, iw = 390, ih = 840;
  const innerCx = px + iw / 2; // 215
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
    <g transform="translate(${innerCx - 110}, 190) scale(1.0)">${nafu('wave', 'L')}</g>
    <text x="${innerCx}" y="486" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="bold" fill="${C.textPrimary}">Merhaba, ben Nafu!</text>
    <text x="${innerCx}" y="524" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.textSecondary}">Ev işlerini, alışverişi ve hatırlatmaları</text>
    <text x="${innerCx}" y="548" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${C.textSecondary}">birlikte yönetelim. Hiçbir şey unutulmasın.</text>
    <rect x="${px + 24}" y="726" width="${iw - 48}" height="54" rx="22" fill="${C.primarySoft}"/>
    ${googleG}
    <text x="${innerCx + 14}" y="759" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="${C.primaryDark}">Google ile devam et</text>
    <text x="${innerCx}" y="812" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${C.textMuted}">Nafu Planlayıcı · Evi birlikte, tıkır tıkır yönetin</text>
  </svg>`;
  renderToPng(svg, 'docs/preview/nafu-login-mockup.png', 860);
}

mkdirSync('docs/preview', { recursive: true });
showcase();
loginMockup();
console.log('Bitti.');
