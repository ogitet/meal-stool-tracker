/**
 * 習慣カレンダーの試作（Scope 第2版）で使う、メモリ内の項目と記録。デモモード専用。
 * 便は既存のデモのデータ（src/demo/store.ts）をそのまま使う。
 */
import { useEffect, useState } from "react";
import { addDays } from "date-fns";
import { toKey } from "@/lib/date";
import type { DateKey, HabitItem, HabitKind, Mark } from "@/lib/types";

export const ITEMS: HabitItem[] = [
  { id: "bread", kind: "reduce", name: "パン", abbr: "パ", active: true, order: 0 },
  { id: "sweets", kind: "reduce", name: "お菓子", abbr: "菓", active: true, order: 1 },
  { id: "exercise", kind: "keep", name: "運動", abbr: "運", active: true, order: 0 },
];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemsOf(kind: HabitKind): HabitItem[] {
  return ITEMS.filter((i) => i.kind === kind && i.active).sort((a, b) => a.order - b.order);
}

/** 例データ：今日から何日前に何を押したか。先月は多く食べ、今月は減ってきた様子。 */
const EATEN: Record<number, string[]> = {
  2: ["bread", "sweets"],
  6: ["sweets"],
  17: ["bread"],
  23: ["bread", "sweets"],
  27: ["sweets"],
  29: ["bread"],
  31: ["bread", "sweets"],
  33: ["sweets"],
  34: ["bread"],
  37: ["bread"],
  38: ["sweets"],
  41: ["bread", "sweets"],
  43: ["sweets"],
  44: ["bread"],
  47: ["bread"],
  50: ["sweets"],
  52: ["bread", "sweets"],
  55: ["bread"],
};
const EXERCISED = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 25, 26, 28, 30, 33, 34, 36, 40, 45, 48, 51,
];
/** 起点日（Scope 第2版 Q52）：今日の56日前 */
const START_OFFSET = 56;

const listeners = new Set<() => void>();
const state: { marks: Mark[]; start: DateKey } = { marks: [], start: "" };

function seed(): void {
  const now = new Date();
  const key = (n: number) => toKey(addDays(now, -n));
  state.start = key(START_OFFSET);
  for (const [n, ids] of Object.entries(EATEN)) for (const id of ids) state.marks.push({ date: key(+n), itemId: id });
  for (const n of EXERCISED) state.marks.push({ date: key(n), itemId: "exercise" });
}
seed();

export function startDate(): DateKey {
  return state.start;
}

export function hasMark(date: DateKey, itemId: string): boolean {
  return state.marks.some((m) => m.date === date && m.itemId === itemId);
}

/** 押す・取り消す。同じ日の同じ項目は1件（Scope 第2版 Q51）。押したら true。 */
export function toggleMark(date: DateKey, itemId: string): boolean {
  const on = !hasMark(date, itemId);
  state.marks = on
    ? [...state.marks, { date, itemId }]
    : state.marks.filter((m) => !(m.date === date && m.itemId === itemId));
  listeners.forEach((l) => l());
  return on;
}

/** 記録の一覧。押すたびに新しい配列を返し、再描画する。 */
export function useMarks(): Mark[] {
  const [marks, setMarks] = useState(state.marks);
  useEffect(() => {
    const l = () => setMarks(state.marks);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return marks;
}
