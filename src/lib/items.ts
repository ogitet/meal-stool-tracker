import type { DateKey, HabitItem, HabitKind, Mark } from "./types";

/** 項目の名称の上限（Scope F-15）。 */
export const ITEM_NAME_MAX = 10;
/** 「使う」項目は、種類ごとに4つまで（Scope Q57）。 */
export const ITEM_ACTIVE_MAX = 4;

export const KIND_LABEL: Record<HabitKind, string> = { reduce: "減らしたいもの", keep: "続けたいこと" };
export const KINDS: HabitKind[] = ["reduce", "keep"];

/** 初期の項目（Scope 5章）。id は固定し、再投入しても重複しないようにする。 */
export const DEFAULT_ITEMS: HabitItem[] = [
  { id: "bread", kind: "reduce", name: "パン", abbr: "パ", active: true, order: 0 },
  { id: "sweets", kind: "reduce", name: "お菓子", abbr: "菓", active: true, order: 1 },
  { id: "exercise", kind: "keep", name: "運動", abbr: "運", active: true, order: 0 },
];

/** 減らしたいもの → 続けたいこと、種類の中は order 順（Structure 3章）。 */
export function sortItems(list: HabitItem[]): HabitItem[] {
  return [...list].sort(
    (a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.order - b.order || a.name.localeCompare(b.name, "ja"),
  );
}

/** 種類の末尾に置くための order。 */
export function nextItemOrder(existing: HabitItem[], kind: HabitKind): number {
  return existing.filter((i) => i.kind === kind).reduce((m, i) => Math.max(m, i.order), -1) + 1;
}

/** その種類に、まだ「使う」項目を足せるか（Scope Q57）。 */
export function canAddItem(existing: HabitItem[], kind: HabitKind): boolean {
  return existing.filter((i) => i.kind === kind && i.active).length < ITEM_ACTIVE_MAX;
}

/** 同じ種類の中での名称の重複は保存できない（Structure 7章）。 */
export function isDuplicateItemName(name: string, kind: HabitKind, existing: HabitItem[], selfId?: string): boolean {
  const n = name.trim();
  return existing.some((i) => i.id !== selfId && i.kind === kind && i.name === n);
}

/** 印のインク色（Surface 10章）。global.css の .g-* と .chip.c-* に対応する。 */
export type Ink = "staple" | "sweets" | "protein" | "other" | "vegetable";
const REDUCE_INKS: Ink[] = ["staple", "sweets", "protein", "other"];

/** 減らしたいものは並び順に 山吹 → 桃 → 朱 → 墨、続けたいことは緑。 */
export function inkOf(item: HabitItem, all: HabitItem[]): Ink {
  if (item.kind === "keep") return "vegetable";
  const reduce = sortItems(all.filter((i) => i.kind === "reduce"));
  const i = Math.max(
    0,
    reduce.findIndex((x) => x.id === item.id),
  );
  return REDUCE_INKS[i % REDUCE_INKS.length]!;
}

/** 追加する項目の略称は先頭1文字。サロゲートペアも1文字として扱う。 */
export function defaultAbbr(name: string): string {
  return Array.from(name.trim())[0] ?? "";
}

export function abbrIsOneChar(abbr: string): boolean {
  return Array.from(abbr).length === 1;
}

/** 記録の文書ID。日付と項目から決め、同じ日の同じ項目を1件にする（06-tech Q72）。 */
export function markId(date: DateKey, itemId: string): string {
  return `${date}_${itemId}`;
}

/**
 * 初版の食事記録の引き継ぎ（Scope F-16、06-tech 10章）。
 * パンのカテゴリを含む日を「パン」、お菓子グループのカテゴリを含む日を「お菓子」の記録にする。
 * 起点日は食事記録の最も古い日。食事記録がなければ null。
 */
export function marksFromMeals(
  meals: { date: DateKey; categoryIds: string[] }[],
  breadIds: ReadonlySet<string>,
  sweetsIds: ReadonlySet<string>,
): { marks: Mark[]; startDate: DateKey | null } {
  const ids = new Map<string, Mark>();
  let startDate: DateKey | null = null;
  for (const m of meals) {
    if (startDate === null || m.date < startDate) startDate = m.date;
    for (const c of m.categoryIds) {
      const itemId = breadIds.has(c) ? "bread" : sweetsIds.has(c) ? "sweets" : null;
      if (itemId) ids.set(markId(m.date, itemId), { date: m.date, itemId });
    }
  }
  return { marks: [...ids.values()].sort((a, b) => (a.date < b.date ? -1 : 1)), startDate };
}
