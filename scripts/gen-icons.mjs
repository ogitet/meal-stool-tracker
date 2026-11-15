// PWA のアイコン、favicon（SVG）、共有用の画像（OGP）を生成する。絵柄は外部ライブラリを使わず、図形の距離関数で描いて PNG に書き出す。
// 共有用の画像の文字だけは、Playwright の Chromium でアプリと同じ書体（Google Fonts。通信が必要）を使って描く。
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
  const a = rad(-deg),
    dx = px - cx,
    dy = py - cy;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}
const roundRect =
  (cx, cy, hw, hh, r, deg = 0) =>
  (px, py) => {
    const [x, y] = toLocal(px, py, cx, cy, deg);
    const qx = Math.abs(x) - (hw - r),
      qy = Math.abs(y) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
const circle = (cx, cy, r) => (px, py) => Math.hypot(px - cx, py - cy) - r;
// 弧（太さ w、端は丸）。a0〜a1 は度、0 度が右、時計回りが正（下向きが 90 度）。
const arc = (cx, cy, R, a0, a1, w) => (px, py) => {
  const dx = px - cx,
    dy = py - cy;
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
  const a = rad(SLIP.deg),
    c = Math.cos(a),
    s = Math.sin(a);
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
const ring = (u) => {
  const [x, y] = inSlip(u, -SLIP.hh + 4);
  return circle(x, y, 2.3);
};
const eye = (u) => {
  const [x, y] = inSlip(u, 7);
  return circle(x, y, 3.1);
};
const cheek = (u) => {
  const [x, y] = inSlip(u, 14.5);
  return circle(x, y, 4.4);
};
const [sx, sy] = inSlip(0, 6);
const smile = arc(sx, sy + 3.5, 7.5, 28, 152, 2.6);
// 判子（右下に少し重ねる）
const [tx, ty] = inSlip(24, 31);
const stamp = roundRect(tx, ty, 8.5, 8.5, 3, 10);
const stampDot = circle(tx, ty, 2.8);

// 背景：上から下へ、ごく淡い空色のグラデーション
const bg = (y) => {
  const t = Math.min(1, Math.max(0, y / 100)),
    a = hex("#d9e5fa"),
    b = hex("#c3d5f3");
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
};

// 手前に重ねる順。shade は距離に応じて淡くぼかす影。
const layers = [
  {
    sdf: roundRect(SLIP.cx + 1.5, SLIP.cy + 3.5, SLIP.hw, SLIP.hh, 12, SLIP.deg),
    color: [60, 80, 140],
    alpha: 0.3,
    soft: 5,
  },
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
    r += (l.color[0] - r) * a;
    g += (l.color[1] - g) * a;
    b += (l.color[2] - b) * a;
  }
  return [r, g, b];
}

// ---- PNG 書き出し ----
function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// 幅 w・高さ h の画像に、一辺 art の絵柄を描く。左端は ox（既定は中央）、上下は中央。絵柄の外側は、端の色を延ばした地になる。
function image(w, h, art = Math.min(w, h), ox = (w - art) / 2) {
  const SS = 4; // 4×4 のスーパーサンプリング
  const oy = (h - art) / 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let j = 0; j < SS; j++)
        for (let i = 0; i < SS; i++) {
          const [pr, pg, pb] = shade(((x - ox + (i + 0.5) / SS) / art) * 100, ((y - oy + (j + 0.5) / SS) / art) * 100);
          r += pr;
          g += pg;
          b += pb;
        }
      const o = y * (w * 3 + 1) + 1 + x * 3,
        n = SS * SS;
      raw[o] = Math.round(r / n);
      raw[o + 1] = Math.round(g / n);
      raw[o + 2] = Math.round(b / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icon = (size) => image(size, size);

// ---- favicon（SVG）----
// 上の図形と同じ座標（100×100）で書く。影のぼかしは省く。
const f = (n) => Number(n.toFixed(2));
const rgb = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const dot = ([x, y], r, color, extra = "") =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${rgb(color)}"${extra}/>`;
function favicon() {
  const { cx, cy, hw, hh, deg } = SLIP;
  const [a0x, a0y] = [sx + 7.5 * Math.cos(rad(152)), sy + 3.5 + 7.5 * Math.sin(rad(152))];
  const [a1x, a1y] = [sx + 7.5 * Math.cos(rad(28)), sy + 3.5 + 7.5 * Math.sin(rad(28))];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e5fa"/><stop offset="1" stop-color="#c3d5f3"/></linearGradient>
    <clipPath id="slip"><rect x="${-hw}" y="${-hh}" width="${hw * 2}" height="${hh * 2}" rx="12"/></clipPath>
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <g transform="translate(${cx} ${cy}) rotate(${deg})">
    <rect x="${-hw}" y="${-hh}" width="${hw * 2}" height="${hh * 2}" rx="12" fill="#fff"/>
    <rect x="${-hw}" y="${-hh}" width="${hw * 2}" height="14" fill="${rgb(PINK)}" clip-path="url(#slip)"/>
  </g>
  ${[-14, 14].map((u) => dot(inSlip(u, -SLIP.hh + 4), 2.3, WHITE)).join("")}
  ${[-19, 19].map((u) => dot(inSlip(u, 14.5), 4.4, PINK, ' fill-opacity="0.8"')).join("")}
  ${[-10.5, 10.5].map((u) => dot(inSlip(u, 7), 3.1, INK)).join("")}
  <path d="M${f(a0x)} ${f(a0y)}A7.5 7.5 0 0 0 ${f(a1x)} ${f(a1y)}" fill="none" stroke="${rgb(INK)}" stroke-width="2.6" stroke-linecap="round"/>
  <g transform="translate(${f(tx)} ${f(ty)}) rotate(10)"><rect x="-8.5" y="-8.5" width="17" height="17" rx="3" fill="${rgb(YELLOW)}"/></g>
  ${dot([tx, ty], 2.8, WHITE, ' fill-opacity="0.95"')}
</svg>
`;
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192));
writeFileSync("public/icons/icon-512.png", icon(512));
writeFileSync("public/icons/apple-touch-icon.png", icon(180));
writeFileSync("public/favicon.svg", favicon());

// 共有用の画像（OGP、1200×630）。左に絵柄、右にアプリ名を置く。
// 絵柄は上と同じ描き方の PNG を背景に敷き、文字だけをブラウザーで重ねて撮る。
const OG_TEXT = "ひびログ";
const OG_FONT = "Zen Kaku Gothic Antique";
async function ogImage() {
  const { chromium } = await import("@playwright/test");
  const bgPng = image(1200, 630, 460, 80).toString("base64");
  const fontUrl = `https://fonts.googleapis.com/css2?family=${OG_FONT.replaceAll(" ", "+")}:wght@900&text=${encodeURIComponent(OG_TEXT)}`;
  const html = `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><link rel="stylesheet" href="${fontUrl}"><style>
    html, body { margin: 0; }
    body { width: 1200px; height: 630px; background: url(data:image/png;base64,${bgPng}); }
    p { position: absolute; left: 570px; top: 0; margin: 0; line-height: 630px; white-space: nowrap;
      font: 900 138px/630px "${OG_FONT}"; letter-spacing: 0.02em; color: ${rgb(INK)}; }
  </style></head><body><p>${OG_TEXT}</p></body></html>`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle" });
    // 書体を取得できなかったときは、代わりの書体で描かずに止める
    const loaded = await page.evaluate(
      async ([font, text]) => (await document.fonts.load(`900 138px "${font}"`, text)).length > 0,
      [OG_FONT, OG_TEXT],
    );
    if (!loaded) throw new Error(`書体「${OG_FONT}」を取得できませんでした（通信を確認してください）`);
    await page.screenshot({ path: "public/og-image.png" });
  } finally {
    await browser.close();
  }
}
await ogImage();
console.log("icons written to public/icons/, public/og-image.png, public/favicon.svg");
