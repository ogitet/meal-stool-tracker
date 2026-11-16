import { describe, expect, it } from "vite-plus/test";
import { countDaysByCategory, countRecordedDays } from "./stats";
import type { DateKey, Meal, Slot } from "./types";

let seq = 0;
const meal = (date: DateKey, slot: Slot, categoryIds: string[]): Meal => ({
  id: `m${seq++}`,
  date,
  slot,
  categoryIds,
  createdAt: null,
  updatedAt: null,
});

describe("カテゴリを食べた日の数", () => {
  it("同じ日に複数の食事で食べても1日と数える", () => {
    const counts = countDaysByCategory([
      meal("2026-11-01", "breakfast", ["staple_rice"]),
      meal("2026-11-01", "dinner", ["staple_rice", "other_fried"]),
    ]);
    expect(counts.get("staple_rice")).toBe(1);
    expect(counts.get("other_fried")).toBe(1);
  });
  it("日付の種類を数える", () => {
    const counts = countDaysByCategory([
      meal("2026-11-01", "lunch", ["other_fried"]),
      meal("2026-11-03", "lunch", ["other_fried", "staple_rice"]),
      meal("2026-11-03", "other", ["other_fried"]),
      meal("2026-11-10", "dinner", ["other_fried"]),
    ]);
    expect(counts.get("other_fried")).toBe(3);
    expect(counts.get("staple_rice")).toBe(1);
  });
  it("記録のないカテゴリは含めない", () => {
    const counts = countDaysByCategory([meal("2026-11-01", "lunch", ["staple_rice"])]);
    expect(counts.has("other_fried")).toBe(false);
    expect(countDaysByCategory([]).size).toBe(0);
  });
});

describe("食事の記録がある日の数", () => {
  it("日付の種類を数える。カテゴリのない食事も記録に含める", () => {
    expect(
      countRecordedDays([
        meal("2026-11-01", "breakfast", ["staple_rice"]),
        meal("2026-11-01", "lunch", ["staple_bread"]),
        meal("2026-11-02", "lunch", []),
      ]),
    ).toBe(2);
  });
  it("食事がなければ0", () => {
    expect(countRecordedDays([])).toBe(0);
  });
});
