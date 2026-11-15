import type { DateKey, Meal } from "./types";

/**
 * カテゴリごとに、そのカテゴリを含む食事を記録した日の数を数える（Strategy G3、06-tech 5章）。
 * 同じ日に何度食べても1日と数える。記録の抜けと「食べていない」は区別しない。
 */
export function countDaysByCategory(meals: Meal[]): Map<string, number> {
  const days = new Map<string, Set<DateKey>>();
  for (const m of meals) {
    for (const id of m.categoryIds) {
      const set = days.get(id);
      if (set) set.add(m.date);
      else days.set(id, new Set([m.date]));
    }
  }
  return new Map(Array.from(days, ([id, set]) => [id, set.size]));
}

/** 食事の記録がある日の数。 */
export function countRecordedDays(meals: Meal[]): number {
  return new Set(meals.map((m) => m.date)).size;
}
