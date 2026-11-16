import { GROUP_INDEX } from "./constants";
import type { Category, GroupId } from "./types";

/** グループ順 → グループ内の order 順に並べる。 */
export function sortCategories(list: Category[]): Category[] {
  return [...list].sort(
    (a, b) => GROUP_INDEX[a.group] - GROUP_INDEX[b.group] || a.order - b.order || a.name.localeCompare(b.name, "ja"),
  );
}

/** グループの末尾に置くための order（そのグループで最も大きい値の次）。 */
export function nextOrder(existing: Category[], group: GroupId): number {
  return existing.filter((c) => c.group === group).reduce((m, c) => Math.max(m, c.order), -1) + 1;
}

/**
 * カレンダーの1日分のカテゴリ印：その日の全食事のカテゴリを重複なく、グループ順に（Structure Q22）。
 * 「使わない」カテゴリも、過去の記録にあれば表示する（Scope Q7）。
 */
export function dayTiles(categoryIds: string[][], byId: Map<string, Category>): Category[] {
  const seen = new Set<string>();
  const out: Category[] = [];
  for (const ids of categoryIds) {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const c = byId.get(id);
      if (c) out.push(c);
    }
  }
  return sortCategories(out);
}

/** 追加カテゴリの略称は先頭1文字（Skeleton Q24）。サロゲートペアも1文字として扱う。 */
export function defaultAbbr(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ?? "";
}

export function abbrIsOneChar(abbr: string): boolean {
  return Array.from(abbr).length === 1;
}
