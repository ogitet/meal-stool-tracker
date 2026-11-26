import { describe, expect, it } from "vite-plus/test";
import { initialOccurredAt, isDateKey, isFuture, monthGrid, toKey } from "./date";

describe("月の格子", () => {
  it("2026年11月は 10/26 から始まる42日", () => {
    const grid = monthGrid(new Date(2026, 10, 1));
    expect(grid).toHaveLength(42);
    expect(toKey(grid[0]!)).toBe("2026-10-26");
    expect(toKey(grid[41]!)).toBe("2026-12-06");
  });
});

describe("日付の検証と未来判定", () => {
  it("形式と実在をみる", () => {
    expect(isDateKey("2026-11-10")).toBe(true);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("20261110")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });
  it("今日は未来ではない", () => {
    const now = new Date(2026, 10, 10, 23, 59);
    expect(isFuture("2026-11-10", now)).toBe(false);
    expect(isFuture("2026-11-11", now)).toBe(true);
    expect(isFuture("2026-11-09", now)).toBe(false);
  });
});

describe("過去日の便の初期日時", () => {
  it("日付はその日、時刻は操作時", () => {
    const d = initialOccurredAt("2026-11-05", new Date(2026, 10, 10, 8, 10));
    expect(toKey(d)).toBe("2026-11-05");
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(10);
  });
});
