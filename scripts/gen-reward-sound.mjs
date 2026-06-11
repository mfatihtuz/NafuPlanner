// Nafu haftalık ödül bildirimi için özel ses üretir (yükselen neşeli çan
// arpeji). iOS custom notification sound kuralları: Linear PCM WAV, <30 sn.
// Çalıştır: node scripts/gen-reward-sound.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
// C5 – E5 – G5 – C6 (yukarı doğru parlak arpej)
const NOTES = [523.25, 659.25, 783.99, 1046.5];
const STEP = 0.16; // notalar arası başlama aralığı (sn)
const TAIL = 0.6; // son notanın sönümlenme kuyruğu
const total = STEP * NOTES.length + TAIL;
const n = Math.floor(SR * total);
const mix = new Float32Array(n);

NOTES.forEach((freq, i) => {
  const start = Math.floor(i * STEP * SR);
  const dur = (i === NOTES.length - 1 ? STEP + TAIL : STEP * 2.2);
  const len = Math.floor(dur * SR);
  for (let s = 0; s < len; s++) {
    const idx = start + s;
    if (idx >= n) break;
    const ti = s / SR;
    // Hızlı atak + üstel sönüm → çan/ksilofon hissi.
    const env = Math.exp(-ti * 5.5) * (1 - Math.exp(-ti * 500));
    const wave =
      Math.sin(2 * Math.PI * freq * ti) +
      0.5 * Math.sin(2 * Math.PI * freq * 2 * ti) +
      0.22 * Math.sin(2 * Math.PI * freq * 3 * ti);
    mix[idx] += env * wave * 0.24;
  }
});

const bytesPerSample = 2;
const dataSize = n * bytesPerSample;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(1, 22); // mono
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * bytesPerSample, 28);
buf.writeUInt16LE(bytesPerSample, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);

let off = 44;
for (let i = 0; i < n; i++) {
  let v = mix[i];
  if (v > 1) v = 1;
  else if (v < -1) v = -1;
  buf.writeInt16LE(Math.round(v * 32767), off);
  off += 2;
}

mkdirSync('assets/sounds', { recursive: true });
writeFileSync('assets/sounds/nafu-reward.wav', buf);
console.log('yazıldı: assets/sounds/nafu-reward.wav', total.toFixed(2) + 's', n, 'örnek');
