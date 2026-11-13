import { describe, expect, it } from "vite-plus/test";
import { abbrIsOneChar, dayTiles, defaultAbbr, sortCategories } from "./categories";
import { DEFAULT_CATEGORIES } from "./constants";
import type { Category } from "./types";

const all: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, active: true }));
const byId = new Map(all.map((c) => [c.id, c]));

describe("カテゴリの並び", () => {
  it("グループ順、グループ内は order 順", () => {
    const shuffled = [...all].reverse();
    const sorted = sortCategories(shuffled);
    expect(sorted.map((c) => c.id)).toEqual(all.map((c) => c.id));
  });
});

describe("1日分のカテゴリ印", () => {
  it("複数の食事をまとめ、重複を除き、グループ順にする", () => {
    const tiles = dayTiles(
      [
        ["other_dairy", "staple_bread", "protein_egg"],
        ["staple_rice", "protein_pork", "vegetable_veg", "other_fried", "staple_bread"],
        ["sweets_choco"],
      ],
      byId,
    );
    expect(tiles.map((c) => c.abbr)).toEqual(["米", "パ", "豚", "卵", "野", "揚", "乳", "チ"]);
  });
  it("存在しないIDは無視する", () => {
    expect(dayTiles([["nope"]], byId)).toEqual([]);
  });
});

describe("略称", () => {
  it("先頭1文字を既定にする", () => {
    expect(defaultAbbr("そば")).toBe("そ");
    expect(defaultAbbr("  納豆")).toBe("納");
    expect(defaultAbbr("")).toBe("");
  });
  it("1文字判定", () => {
    expect(abbrIsOneChar("揚")).toBe(true);
    expect(abbrIsOneChar("揚げ")).toBe(false);
    expect(abbrIsOneChar("")).toBe(false);
  });
});
