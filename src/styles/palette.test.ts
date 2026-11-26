import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";

/**
 * 配色のコントラスト比（Surface 2章）。global.css の :root から色を読み、明るい配色と暗い配色の両方で確かめる。
 * 色を変えて落ちたら、色を直すか、docs/05-surface.md の表と一緒に見直す。
 */
type Theme = "light" | "dark";

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8");
const root = /:root \{([^}]*)\}/.exec(css)?.[1] ?? "";

/** --name: #hex; と --name: light-dark(#hex, #hex); を読む（半透明の色は対象外）。 */
const tokens = new Map<string, Record<Theme, string>>();
for (const m of root.matchAll(
  /--(?<name>[\w-]+):\s*(?:light-dark\((?<light>#[0-9a-f]{3,6}), (?<dark>#[0-9a-f]{3,6})\)|(?<both>#[0-9a-f]{3,6}));/g,
)) {
  const { name = "", both = "", light = both, dark = both } = m.groups ?? {};
  tokens.set(name, { light, dark });
}

function luminance(hex: string): number {
  const h = hex.length === 4 ? hex.replace(/[0-9a-f]/g, "$&$&") : hex;
  const channel = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function tone(theme: Theme, name: string): number {
  const t = tokens.get(name);
  if (!t) throw new Error(`--${name} が :root にない`);
  return luminance(t[theme]);
}

function contrast(theme: Theme, a: string, b: string): number {
  const [x, y] = [tone(theme, a), tone(theme, b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** 文字と、その下の色。WCAG AA（4.5 以上）。 */
const TEXT: [string, string][] = [
  ["on-ground", "ground"],
  ["ink", "paper"],
  ["ink", "paper-2"],
  ["muted", "ground"],
  ["muted", "paper"],
  ["muted", "paper-2"],
  ["muted", "line"],
  ["on-accent", "accent"],
  ["accent-deep", "paper"],
  ["accent-deep", "ground"],
  ["on-ink", "ink"],
  ["on-danger", "danger"],
  ["danger", "paper"],
  ["g-staple-fg", "g-staple-bg"],
  ["g-protein-fg", "g-protein-bg"],
  ["g-vegetable-fg", "g-vegetable-bg"],
  ["g-other-fg", "g-other-bg"],
  ["g-sweets-fg", "g-sweets-bg"],
  // 食べなかった日のマスの日付（Surface 10章）
  ["ink", "clean"],
];

/** 暗い配色で、紙の上に置く印と便マーク。形が見分けられること（3 以上）。 */
const MARKS = [
  "g-staple-bg",
  "g-protein-bg",
  "g-vegetable-bg",
  "g-other-bg",
  "g-sweets-bg",
  "s-hard",
  "s-normal",
  "s-soft",
  "s-diarrhea",
  "accent",
];

describe.each<Theme>(["light", "dark"])("配色（%s）", (theme) => {
  test.each(TEXT)("--%s／--%s は 4.5 以上", (fg, bg) => {
    expect(contrast(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("食べなかった日の塗り", () => {
  // マスに載るのは続けたいことの印（緑）と便マーク。食べたものの印は載らない
  test.each<Theme>(["light", "dark"])("便マーク（硬い・普通）は塗りの上で 3 以上（%s）", (theme) => {
    expect(contrast(theme, "s-hard", "clean")).toBeGreaterThanOrEqual(3);
    expect(contrast(theme, "s-normal", "clean")).toBeGreaterThanOrEqual(3);
  });

  test("緑の印は、明るい配色では塗りの上で 3 以上", () => {
    expect(contrast("light", "g-vegetable-bg", "clean")).toBeGreaterThanOrEqual(3);
  });

  // 暗い配色では緑の印と塗りが近いため、印に --mark-ring の縁を付ける。縁は --on-ground と同じ色
  test("暗い配色では、印の縁（--on-ground と同じ色）が塗りの上で 3 以上", () => {
    expect(contrast("dark", "on-ground", "clean")).toBeGreaterThanOrEqual(3);
    expect(contrast("dark", "on-ground", "g-vegetable-bg")).toBeGreaterThanOrEqual(3);
  });
});

describe("配色（dark）", () => {
  // 明るい配色では 4.36 で、4.5 に届いていない（ログイン画面のエラーの文言）。暗い配色では満たす
  test("--danger／--ground は 4.5 以上", () => {
    expect(contrast("dark", "danger", "ground")).toBeGreaterThanOrEqual(4.5);
  });

  test.each(MARKS)("--%s は紙の上で 3 以上", (mark) => {
    expect(contrast("dark", mark, "paper")).toBeGreaterThanOrEqual(3);
    expect(contrast("dark", mark, "paper-2")).toBeGreaterThanOrEqual(3);
  });

  test("地、紙（淡）、紙の順に明るい", () => {
    expect(tone("dark", "ground")).toBeLessThan(tone("dark", "paper-2"));
    expect(tone("dark", "paper-2")).toBeLessThan(tone("dark", "paper"));
  });
});
