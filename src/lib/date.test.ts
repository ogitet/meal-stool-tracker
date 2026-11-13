import { describe, expect, it } from "vite-plus/test";
import {
  formatWeekRange,
  inferSlot,
  initialOccurredAt,
  isDateKey,
  isFuture,
  monthGrid,
  toKey,
  weekDays,
  weekRange,
} from "./date";

describe("週の計算（月曜開始）", () => {
  it("火曜を含む週は前の月曜から始まる", () => {
    const days = weekDays(new Date(2026, 10, 10)); // 2026-11-10 (火)
    expect(days.map(toKey)).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15",
    ]);
  });
  it("日曜はその週の末尾になる", () => {
    expect(weekRange(new Date(2026, 10, 8))).toEqual({ start: "2026-11-02", end: "2026-11-08" });
  });
  it("月をまたぐ週の表示", () => {
    expect(formatWeekRange(new Date(2026, 10, 1))).toBe("10/26〜11/1");
    expect(formatWeekRange(new Date(2026, 10, 10))).toBe("11/9〜15");
  });
});

describe("月の格子", () => {
  it("2026年11月は 10/26 から始まる42日", () => {
    const grid = monthGrid(new Date(2026, 10, 1));
    expect(grid).toHaveLength(42);
    expect(toKey(grid[0]!)).toBe("2026-10-26");
    expect(toKey(grid[41]!)).toBe("2026-12-06");
  });
});

describe("食事枠の推定", () => {
  it("0:00〜10:59 は朝食", () => {
    expect(inferSlot(new Date(2026, 10, 10, 0, 0))).toBe("breakfast");
    expect(inferSlot(new Date(2026, 10, 10, 10, 59))).toBe("breakfast");
  });
  it("11:00〜15:59 は昼食", () => {
    expect(inferSlot(new Date(2026, 10, 10, 11, 0))).toBe("lunch");
    expect(inferSlot(new Date(2026, 10, 10, 15, 59))).toBe("lunch");
  });
  it("16:00〜23:59 は夕食", () => {
    expect(inferSlot(new Date(2026, 10, 10, 16, 0))).toBe("dinner");
    expect(inferSlot(new Date(2026, 10, 10, 23, 59))).toBe("dinner");
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
