import type { Amount, Category, Feeling, GroupId, Shape, Slot } from "./types";

/** グループは固定（Scope Q15）。並びは Structure 3章の順。 */
export const GROUPS: { id: GroupId; label: string }[] = [
  { id: "staple", label: "主食" },
  { id: "protein", label: "肉・魚・卵" },
  { id: "vegetable", label: "野菜・果物" },
  { id: "other", label: "その他" },
  { id: "sweets", label: "お菓子" },
];

export const GROUP_LABEL: Record<GroupId, string> = Object.fromEntries(GROUPS.map((g) => [g.id, g.label])) as Record<
  GroupId,
  string
>;

export const GROUP_INDEX: Record<GroupId, number> = Object.fromEntries(GROUPS.map((g, i) => [g.id, i])) as Record<
  GroupId,
  number
>;

/** 初期カテゴリ 26種（Scope 5章 Q38）。id は固定し、再投入しても重複しないようにする。 */
export const DEFAULT_CATEGORIES: Omit<Category, "active">[] = [
  { id: "staple_rice", name: "米", abbr: "米", group: "staple", order: 0 },
  { id: "staple_bread", name: "パン", abbr: "パ", group: "staple", order: 1 },
  { id: "staple_noodle", name: "麺", abbr: "麺", group: "staple", order: 2 },

  { id: "protein_pork", name: "豚肉", abbr: "豚", group: "protein", order: 0 },
  { id: "protein_chicken", name: "鶏肉", abbr: "鶏", group: "protein", order: 1 },
  { id: "protein_beef", name: "牛肉", abbr: "牛", group: "protein", order: 2 },
  { id: "protein_fish", name: "魚", abbr: "魚", group: "protein", order: 3 },
  { id: "protein_egg", name: "卵", abbr: "卵", group: "protein", order: 4 },
  { id: "protein_soy", name: "大豆製品", abbr: "豆", group: "protein", order: 5 },

  { id: "vegetable_veg", name: "野菜", abbr: "野", group: "vegetable", order: 0 },
  { id: "vegetable_seaweed", name: "海藻", abbr: "海", group: "vegetable", order: 1 },
  { id: "vegetable_mushroom", name: "きのこ", abbr: "茸", group: "vegetable", order: 2 },
  { id: "vegetable_fruit", name: "果物", abbr: "果", group: "vegetable", order: 3 },

  { id: "other_fried", name: "揚げ物", abbr: "揚", group: "other", order: 0 },
  { id: "other_dairy", name: "乳製品", abbr: "乳", group: "other", order: 1 },
  { id: "other_spicy", name: "辛いもの", abbr: "辛", group: "other", order: 2 },
  { id: "other_alcohol", name: "お酒", abbr: "酒", group: "other", order: 3 },
  { id: "other_coffee", name: "コーヒー", abbr: "コ", group: "other", order: 4 },

  { id: "sweets_chips", name: "ポテチ", abbr: "ポ", group: "sweets", order: 0 },
  { id: "sweets_gummy", name: "グミ", abbr: "グ", group: "sweets", order: 1 },
  { id: "sweets_choco", name: "チョコ", abbr: "チ", group: "sweets", order: 2 },
  { id: "sweets_senbei", name: "せんべい", abbr: "せ", group: "sweets", order: 3 },
  { id: "sweets_ice", name: "アイス", abbr: "ア", group: "sweets", order: 4 },
  { id: "sweets_sweetbread", name: "菓子パン", abbr: "菓", group: "sweets", order: 5 },
  { id: "sweets_cookie", name: "クッキー", abbr: "ク", group: "sweets", order: 6 },
  { id: "sweets_other", name: "その他", abbr: "他", group: "sweets", order: 7 },
];

export const FIXED_SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];
export const SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "other"];
export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  other: "その他の食事",
};

export const SHAPES: Shape[] = ["hard", "normal", "soft", "diarrhea"];
export const SHAPE_LABEL: Record<Shape, string> = {
  hard: "硬い",
  normal: "普通",
  soft: "柔らかい",
  diarrhea: "下痢",
};

export const AMOUNTS: Amount[] = ["small", "normal", "large"];
export const AMOUNT_LABEL: Record<Amount, string> = { small: "少", normal: "普通", large: "多" };

export const FEELINGS: Feeling[] = ["clear", "residual"];
export const FEELING_LABEL: Record<Feeling, string> = { clear: "すっきり", residual: "残便感あり" };

export const CATEGORY_NAME_MAX = 10;

/** 日別詳細などで、お菓子の「その他」をグループ名の「その他」と区別する（Structure 8章）。 */
export function displayName(c: Category): string {
  return c.group === "sweets" && c.name === "その他" ? "お菓子：その他" : c.name;
}
