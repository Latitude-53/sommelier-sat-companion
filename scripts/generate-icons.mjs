/**
 * Генератор PWA-иконок без внешних зависимостей:
 * минимальный PNG-энкодер (IHDR/IDAT/IEND + CRC32) и растеризация примитивов.
 * v20: рисует «Паспорт-чек» (готика) — вертикальная бумага с кельевым шпилем,
 * внутренней рамкой и окном-триколором, в палитре Sommelier Cellar Aesthetic.
 * Форма согласована с макетом download/Иконка-паспорт (вариант V3 «Готика»).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/* ── PNG-энкодер ───────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // scanlines с фильтром 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ── Растеризация ──────────────────────────────────────────────────────────── */

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

class Canvas {
  constructor(size) {
    this.size = size;
    this.buf = Buffer.alloc(size * size * 4);
  }
  blend(x, y, [r, g, b], a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const i = (y * this.size + x) * 4;
    const da = this.buf[i + 3] / 255;
    const sa = a;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) return;
    this.buf[i] = Math.round((r * sa + this.buf[i] * da * (1 - sa)) / outA);
    this.buf[i + 1] = Math.round((g * sa + this.buf[i + 1] * da * (1 - sa)) / outA);
    this.buf[i + 2] = Math.round((b * sa + this.buf[i + 2] * da * (1 - sa)) / outA);
    this.buf[i + 3] = Math.round(outA * 255);
  }
  fillRoundedRect(pad, radius, color) {
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const nx = Math.max(pad - x, x - (s - 1 - pad), 0);
        const ny = Math.max(pad - y, y - (s - 1 - pad), 0);
        const d = Math.hypot(nx, ny);
        if (d <= radius) this.blend(x, y, color, 1);
        else if (d <= radius + 1) this.blend(x, y, color, radius + 1 - d);
      }
    }
  }
  fillRect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) this.blend(x, y, color, 1);
    }
  }
  fillCircle(cx, cy, r, color) {
    for (let y = Math.floor(cy - r) - 1; y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) this.blend(x, y, color, 1);
        else if (d <= r + 1) this.blend(x, y, color, r + 1 - d);
      }
    }
  }
  /* Полигон с 2×2 суперсэмплингом (ray casting), сглаживает диагонали шпиля. */
  fillPolygon(pts, color) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.max(0, Math.floor(Math.min(...xs)) - 1);
    const maxX = Math.min(this.size - 1, Math.ceil(Math.max(...xs)) + 1);
    const minY = Math.max(0, Math.floor(Math.min(...ys)) - 1);
    const maxY = Math.min(this.size - 1, Math.ceil(Math.max(...ys)) + 1);
    const inside = (px, py) => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    const subs = [0.25, 0.75];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let cnt = 0;
        for (const dy of subs) for (const dx of subs) if (inside(x + dx, y + dy)) cnt++;
        const a = cnt / 4;
        if (a > 0) this.blend(x, y, color, a);
      }
    }
  }
  /* Толстый отрезок: расстояние до сегмента, с 1px перьевой кромкой. */
  strokeSeg(x1, y1, x2, y2, w, color) {
    const half = w / 2;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - half - 1));
    const maxX = Math.min(this.size - 1, Math.ceil(Math.max(x1, x2) + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - half - 1));
    const maxY = Math.min(this.size - 1, Math.ceil(Math.max(y1, y2) + half + 1));
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
        const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
        if (d <= half) this.blend(x, y, color, 1);
        else if (d <= half + 1) this.blend(x, y, color, half + 1 - d);
      }
    }
  }
  /* Пунктирный отрезок в стиле .pw-ch-in / печатных правил. */
  dashedSeg(x1, y1, x2, y2, dash, gap, w, color) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    let d = 0;
    while (d < len) {
      const e = Math.min(d + dash, len);
      this.strokeSeg(x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e, w, color);
      d = e + gap;
    }
  }
}

/* ── «Паспорт-чек» (готика) — координаты макета V3, viewBox 512 ────────────── */

const BG = hex('#121915');
const PAPER = hex('#f2e8d2');
const CAP = hex('#c9b98e');
const INK = hex('#6e6248');
const INK_MUT = hex('#a8987a');
const GOLD = hex('#c59b4e');
const GOLD_SOFT = hex('#e5c179');
const W1 = hex('#7a2e35');
const W2 = hex('#a8575c');
const W3 = hex('#c59b4e');

function drawGothic(size, { maskable = false } = {}) {
  const c = new Canvas(size);
  const u = size / 512;
  const S = (v) => v * u;

  // фон: маскируемый — полный квадрат; обычный — скругление 112/512
  if (maskable) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) c.blend(x, y, BG, 1);
  } else {
    c.fillRoundedRect(0, Math.round(S(112)), BG);
  }

  // бумага-келья: шпиль (256,66) → плечи (318/194,132) → корпус → скруглённый низ
  c.fillPolygon(
    [
      [S(256), S(66)], [S(318), S(132)], [S(318), S(384)], [S(308), S(394)],
      [S(204), S(394)], [S(194), S(384)], [S(194), S(132)],
    ],
    PAPER,
  );

  // внутренняя рамка (сегменты path M256 88 L302 138 V376 H210 V138 Z)
  const fr = S(2.2);
  c.strokeSeg(S(256), S(88), S(302), S(138), fr, CAP);
  c.strokeSeg(S(302), S(138), S(302), S(376), fr, CAP);
  c.strokeSeg(S(302), S(376), S(210), S(376), fr, CAP);
  c.strokeSeg(S(210), S(376), S(210), S(138), fr, CAP);
  c.strokeSeg(S(210), S(138), S(256), S(88), fr, CAP);

  // золотые кромки шпиля
  const ge = S(3);
  c.strokeSeg(S(256), S(78), S(310), S(136), ge, GOLD_SOFT);
  c.strokeSeg(S(256), S(78), S(202), S(136), ge, GOLD_SOFT);

  // окно-триколор (витраж)
  c.fillRect(Math.round(S(226)), Math.round(S(176)), Math.round(S(60)), Math.round(S(46)), W1);
  c.fillRect(Math.round(S(226)), Math.round(S(176)), Math.round(S(20)), Math.round(S(46)), W2);
  c.fillRect(Math.round(S(266)), Math.round(S(176)), Math.round(S(20)), Math.round(S(46)), W3);

  // капс-метка: линии — плашка — линии (cap(258, 256, 60, 12))
  c.strokeSeg(S(214), S(258), S(226), S(258), Math.max(1, S(1.6)), CAP);
  c.strokeSeg(S(286), S(258), S(298), S(258), Math.max(1, S(1.6)), CAP);
  c.fillRect(Math.round(S(226)), Math.round(S(255.4)), Math.round(S(60)), Math.max(1, Math.round(S(5.2))), CAP);

  // строки «паспорта»
  c.fillRect(Math.round(S(224)), Math.round(S(276)), Math.round(S(64)), Math.round(S(11)), INK);
  c.fillRect(Math.round(S(236)), Math.round(S(298)), Math.round(S(40)), Math.max(1, Math.round(S(7))), INK_MUT);

  // пунктирное правило
  c.dashedSeg(S(222), S(330), S(290), S(330), S(6), S(6), Math.max(1, S(2.4)), GOLD);

  // точка-навершие на шпиле
  c.fillCircle(S(256), S(106), S(4), GOLD_SOFT);

  return encodePng(size, size, c.buf);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawGothic(192));
writeFileSync(join(OUT, 'icon-512.png'), drawGothic(512));
writeFileSync(join(OUT, 'maskable-512.png'), drawGothic(512, { maskable: true }));
/* apple-touch: iOS сам скругляет — фон до краёв */
writeFileSync(join(dirname(OUT), '..', 'apple-touch-icon.png'), drawGothic(180, { maskable: true }));
console.log('Icons generated (Готика):', OUT);
