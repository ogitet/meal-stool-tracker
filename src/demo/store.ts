/**
 * デモモード（`npm run demo`）専用のメモリ内データ。
 * Firebase に接続せずに全画面を描画し、デザインの確認やスクリーンショットに使う。
 * vite.config.ts が src/data/* の読み込みを src/demo/* に差し替える。本番ビルドには含まれない。
 */
import { useEffect, useState } from "react";
import { addDays } from "date-fns";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { toKey } from "@/lib/date";
import type { Category, Meal, Shape, Slot, Stool } from "@/lib/types";

const listeners = new Set<() => void>();

export const store: { categories: Category[]; meals: Meal[]; stools: Stool[] } = {
  categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, active: true })),
  meals: [],
  stools: [],
};

export function emit(): void {
  listeners.forEach((l) => l());
}

/** ストアの変更で再描画する。 */
export function useStoreVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const l = () => setV((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return v;
}

let seq = 0;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

// ---- 表示確認用の例データ（今日から過去13日分） ----
const DAYS: { b?: string[]; l?: string[]; d?: string[]; o?: string[][]; s?: Shape[] }[] = [
  // 0 = 今日
  { b: ["staple_bread", "protein_egg", "other_dairy", "other_coffee"], s: ["normal"] },
  {
    b: ["staple_bread", "protein_egg", "other_dairy", "other_coffee"],
    l: ["staple_rice", "protein_pork", "vegetable_veg", "vegetable_mushroom"],
    d: ["staple_rice", "protein_pork", "vegetable_veg", "other_fried"],
    o: [["sweets_choco", "sweets_ice"]],
    s: ["normal"],
  },
  { b: ["staple_noodle", "protein_pork", "vegetable_veg", "other_spicy"], s: ["diarrhea", "soft", "normal"] },
  {
    b: ["staple_bread", "protein_egg", "vegetable_fruit", "other_coffee"],
    l: ["staple_rice", "protein_chicken", "vegetable_veg", "vegetable_seaweed", "other_fried"],
    d: ["staple_rice", "other_dairy"],
    o: [["sweets_cookie", "sweets_choco"]],
    s: ["normal"],
  },
  {
    b: ["staple_rice", "protein_soy"],
    l: ["staple_noodle", "protein_beef", "vegetable_veg", "other_fried", "other_spicy"],
    d: ["other_alcohol", "other_dairy"],
    o: [["sweets_senbei", "sweets_gummy"], ["sweets_sweetbread"]],
    s: ["soft"],
  },
  {},
  {
    b: ["staple_bread", "protein_egg", "other_coffee"],
    l: ["staple_rice", "protein_pork", "vegetable_veg", "vegetable_mushroom", "vegetable_fruit"],
    s: ["normal", "normal"],
  },
  {
    b: ["staple_rice", "protein_fish", "vegetable_seaweed"],
    l: ["staple_noodle", "protein_chicken", "vegetable_veg"],
    d: ["other_fried", "other_alcohol"],
    o: [["sweets_chips", "sweets_ice"]],
    s: ["hard"],
  },
  {
    b: ["staple_bread", "protein_egg", "other_dairy", "other_coffee"],
    l: ["staple_rice", "protein_pork", "vegetable_veg"],
    o: [["sweets_choco"]],
    s: ["normal"],
  },
  { l: ["staple_noodle", "protein_egg"], s: ["normal", "soft"] },
  { b: ["staple_rice", "protein_fish"], d: ["staple_rice", "protein_beef", "vegetable_veg"], s: ["normal"] },
  { b: ["staple_bread", "other_coffee"], s: ["soft"] },
  { l: ["staple_rice", "protein_chicken", "other_fried", "demo_soba"], s: ["normal"] },
  { b: ["staple_bread", "protein_egg"], s: ["hard"] },
];

function seed(): void {
  const now = new Date();
  DAYS.forEach((day, i) => {
    const d = addDays(now, -i);
    const date = toKey(d);
    const add = (slot: Slot, ids: string[] | undefined, order: number) => {
      if (!ids) return;
      const createdAt = new Date(d);
      createdAt.setHours(7 + order * 4, 30, 0, 0);
      store.meals.push({
        id: slot === "other" ? newId("m") : `${date}_${slot}`,
        date,
        slot,
        categoryIds: ids,
        createdAt,
        updatedAt: createdAt,
      });
    };
    add("breakfast", day.b, 0);
    add("lunch", day.l, 1);
    add("dinner", day.d, 3);
    (day.o ?? []).forEach((ids, k) => add("other", ids, 2 + k * 0.2));
    (day.s ?? []).forEach((shape, k) => {
      const occurredAt = new Date(d);
      occurredAt.setHours(8 + k * 5, 10, 0, 0);
      store.stools.push({
        id: newId("s"),
        date,
        occurredAt,
        shape,
        ...(k === 0 ? { amount: "large" as const, feeling: "clear" as const } : {}),
      });
    });
  });
  // 「使わない」カテゴリの表示例
  store.categories.push({ id: "demo_soba", name: "そば", abbr: "そ", group: "staple", active: false, order: 3 });
}
seed();
