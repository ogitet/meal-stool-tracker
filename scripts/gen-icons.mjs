// PWA のアイコンを生成する。外部ライブラリを使わず、最小の PNG を自前で書き出す。
// 主色の背景に、週カレンダーの行を抽象化した白い横線3本（docs/05-surface.md 8章）。
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = [0x1f, 0x6f, 0x6b];
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 丸端の横線（カプセル形）に入っているか
function inBar(x, y, x0, x1, cy, r) {
  if (y < cy - r || y > cy + r) return false;
  if (x >= x0 && x <= x1) return true;
  const dx = x < x0 ? x0 - x : x - x1;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function icon(size) {
  const s = size / 100;
  const bars = [
    { x0: 26, x1: 74, cy: 36 },
    { x0: 26, x1: 60, cy: 50 },
    { x0: 26, x1: 48, cy: 64 },
  ];
  const r = 3.2 * s;
  return png(size, (x, y) => {
    for (const b of bars) {
      if (inBar(x + 0.5, y + 0.5, b.x0 * s, b.x1 * s, b.cy * s, r)) return FG;
    }
    return BG;
  });
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192));
writeFileSync("public/icons/icon-512.png", icon(512));
writeFileSync("public/icons/apple-touch-icon.png", icon(180));
console.log("icons written to public/icons/");
