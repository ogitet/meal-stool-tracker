// PWA のアイコンを生成する。外部ライブラリを使わず、図形の距離関数で描いて PNG に書き出す。
// 絵柄：空色の地に、にっこり顔の日めくり1枚と小さな判子（docs/05-surface.md 8章）。
// 食事や便を連想させない抽象的な絵柄にする。
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex("#252a4a");
const PINK = hex("#f4a8c4");
const YELLOW = hex("#f2c14e");
const WHITE = [255, 255, 255];

// ---- 図形（100×100 の座標系）----
const rad = (d) => (d * Math.PI) / 180;
function toLocal(px, py, cx, cy, deg) {
  const a = rad(-deg), dx = px - cx, dy = py - cy;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}
const roundRect = (cx, cy, hw, hh, r, deg = 0) => (px, py) => {
  const [x, y] = toLocal(px, py, cx, cy, deg);
  const qx = Math.abs(x) - (hw - r), qy = Math.abs(y) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const circle = (cx, cy, r) => (px, py) => Math.hypot(px - cx, py - cy) - r;
// 弧（太さ w、端は丸）。a0〜a1 は度、0 度が右、時計回りが正（下向きが 90 度）。
const arc = (cx, cy, R, a0, a1, w) => (px, py) => {
  const dx = px - cx, dy = py - cy;
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a < 0) a += 360;
  const inside = a >= a0 && a <= a1;
  if (inside) return Math.abs(Math.hypot(dx, dy) - R) - w / 2;
  const e = (d) => Math.hypot(px - (cx + R * Math.cos(rad(d))), py - (cy + R * Math.sin(rad(d))));
  return Math.min(e(a0), e(a1)) - w / 2;
};

// 日めくり1枚（-6 度に傾ける）
const SLIP = { cx: 47.9, cy: 49.6, hw: 29, hh: 31, deg: -6 };
const inSlip = (u, v) => {
  const a = rad(SLIP.deg), c = Math.cos(a), s = Math.sin(a);
  return [SLIP.cx + u * c - v * s, SLIP.cy + u * s + v * c];
};
const slip = roundRect(SLIP.cx, SLIP.cy, SLIP.hw, SLIP.hh, 12, SLIP.deg);
// 上の帯（ピンク）は、紙片の内側だけに描く
const bandCenter = inSlip(0, -SLIP.hh + 7);
const band = (px, py) => {
  const [x, y] = toLocal(px, py, bandCenter[0], bandCenter[1], SLIP.deg);
  const d = Math.max(Math.abs(x) - SLIP.hw, Math.abs(y) - 7);
  return Math.max(d, slip(px, py));
};
const ring = (u) => { const [x, y] = inSlip(u, -SLIP.hh + 4); return circle(x, y, 2.3); };
const eye = (u) => { const [x, y] = inSlip(u, 7); return circle(x, y, 3.1); };
const cheek = (u) => { const [x, y] = inSlip(u, 14.5); return circle(x, y, 4.4); };
const [sx, sy] = inSlip(0, 6);
const smile = arc(sx, sy + 3.5, 7.5, 28, 152, 2.6);
// 判子（右下に少し重ねる）
const [tx, ty] = inSlip(24, 31);
const stamp = roundRect(tx, ty, 8.5, 8.5, 3, 10);
const stampDot = circle(tx, ty, 2.8);

// 背景：上から下へ、ごく淡い空色のグラデーション
const bg = (y) => {
  const t = y / 100, a = hex("#d9e5fa"), b = hex("#c3d5f3");
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
};

// 手前に重ねる順。shade は距離に応じて淡くぼかす影。
const layers = [
  { sdf: roundRect(SLIP.cx + 1.5, SLIP.cy + 3.5, SLIP.hw, SLIP.hh, 12, SLIP.deg), color: [60, 80, 140], alpha: 0.3, soft: 5 },
  { sdf: slip, color: WHITE },
  { sdf: band, color: PINK },
  { sdf: ring(-14), color: WHITE },
  { sdf: ring(14), color: WHITE },
  { sdf: cheek(-19), color: PINK, alpha: 0.8 },
  { sdf: cheek(19), color: PINK, alpha: 0.8 },
  { sdf: eye(-10.5), color: INK },
  { sdf: eye(10.5), color: INK },
  { sdf: smile, color: INK },
  { sdf: roundRect(tx + 0.8, ty + 1.6, 8.5, 8.5, 3, 10), color: [60, 80, 140], alpha: 0.28, soft: 2.2 },
  { sdf: stamp, color: YELLOW },
  { sdf: stampDot, color: WHITE, alpha: 0.95 },
];

function shade(px, py) {
  let [r, g, b] = bg(py);
  for (const l of layers) {
    const d = l.sdf(px, py);
    const cover = l.soft ? Math.min(1, Math.max(0, 0.5 - d / l.soft)) : d < 0 ? 1 : 0;
    if (cover <= 0) continue;
    const a = cover * (l.alpha ?? 1);
    r += (l.color[0] - r) * a; g += (l.color[1] - g) * a; b += (l.color[2] - b) * a;
  }
  return [r, g, b];
}

// ---- PNG 書き出し ----
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
function icon(size) {
  const SS = 4; // 4×4 のスーパーサンプリング
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
        const [pr, pg, pb] = shade(((x + (i + 0.5) / SS) / size) * 100, ((y + (j + 0.5) / SS) / size) * 100);
        r += pr; g += pg; b += pb;
      }
      const o = y * (size * 3 + 1) + 1 + x * 3, n = SS * SS;
      raw[o] = Math.round(r / n); raw[o + 1] = Math.round(g / n); raw[o + 2] = Math.round(b / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192));
writeFileSync("public/icons/icon-512.png", icon(512));
writeFileSync("public/icons/apple-touch-icon.png", icon(180));
console.log("icons written to public/icons/");
