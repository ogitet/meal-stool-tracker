import { describe, expect, test } from "vite-plus/test";
import {
  canAddItem,
  DEFAULT_ITEMS,
  defaultAbbr,
  inkOf,
  isDuplicateItemName,
  marksFromMeals,
  nextItemOrder,
  sortItems,
} from "./items";
import type { HabitItem } from "./types";

const item = (id: string, kind: HabitItem["kind"], order: number, active = true): HabitItem => ({
  id,
  kind,
  name: id,
  abbr: id[0]!,
  active,
  order,
});

describe("項目", () => {
  test("減らしたいもの → 続けたいことの順、種類の中は order 順", () => {
    const list = [item("a", "keep", 0), item("b", "reduce", 1), item("c", "reduce", 0)];
    expect(sortItems(list).map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  test("追加は種類の末尾", () => {
    expect(nextItemOrder(DEFAULT_ITEMS, "reduce")).toBe(2);
    expect(nextItemOrder(DEFAULT_ITEMS, "keep")).toBe(1);
    expect(nextItemOrder([], "keep")).toBe(0);
  });

  test("「使う」項目は種類ごとに4つまで。「使わない」は数えない", () => {
    const four = [0, 1, 2, 3].map((n) => item(`r${n}`, "reduce", n));
    expect(canAddItem(four, "reduce")).toBe(false);
    expect(canAddItem(four, "keep")).toBe(true);
    expect(canAddItem([...four.slice(0, 3), item("x", "reduce", 4, false)], "reduce")).toBe(true);
  });

  test("同じ種類の中での名称の重複", () => {
    expect(isDuplicateItemName(" パン ", "reduce", DEFAULT_ITEMS)).toBe(true);
    expect(isDuplicateItemName("パン", "keep", DEFAULT_ITEMS)).toBe(false);
    expect(isDuplicateItemName("パン", "reduce", DEFAULT_ITEMS, "bread")).toBe(false);
  });

  test("インク色：減らしたいものは並び順、続けたいことは緑", () => {
    const list = [...DEFAULT_ITEMS, item("x", "reduce", 2), item("y", "keep", 1)];
    expect(list.map((i) => inkOf(i, list))).toEqual(["staple", "sweets", "vegetable", "protein", "vegetable"]);
  });

  test("略称の初期値は先頭1文字", () => {
    expect(defaultAbbr(" 🍞パン")).toBe("🍞");
    expect(defaultAbbr("")).toBe("");
  });
});

describe("初版の食事記録の引き継ぎ", () => {
  const bread = new Set(["staple_bread"]);
  const sweets = new Set(["sweets_choco", "sweets_sweetbread"]);

  test("パンとお菓子グループを含む日を、1日1件ずつ記録にする", () => {
    const r = marksFromMeals(
      [
        { date: "2026-11-12", categoryIds: ["staple_bread", "protein_egg"] },
        { date: "2026-11-12", categoryIds: ["staple_bread", "sweets_choco"] },
        { date: "2026-11-10", categoryIds: ["staple_rice"] },
        { date: "2026-11-11", categoryIds: ["sweets_sweetbread", "sweets_choco"] },
      ],
      bread,
      sweets,
    );
    expect(r.startDate).toBe("2026-11-10");
    expect(r.marks).toEqual([
      { date: "2026-11-11", itemId: "sweets" },
      { date: "2026-11-12", itemId: "bread" },
      { date: "2026-11-12", itemId: "sweets" },
    ]);
  });

  test("食事記録がなければ起点日はない", () => {
    expect(marksFromMeals([], bread, sweets)).toEqual({ marks: [], startDate: null });
  });
});
