import { describe, expect, test } from "vite-plus/test";
import {
  bestCleanStreak,
  bestDoneStreak,
  cleanStreak,
  countLastMonthSoFar,
  countThisMonth,
  doneStreak,
} from "./habits";

const set = (...days: string[]) => new Set(days);

describe("月の日数", () => {
  const days = set("2026-10-01", "2026-10-26", "2026-10-27", "2026-11-01", "2026-11-26", "2026-11-27");

  test("今月は1日から今日まで", () => {
    expect(countThisMonth(days, "2026-11-26")).toBe(2);
  });

  test("先月は同じ日まで", () => {
    expect(countLastMonthSoFar(days, "2026-11-26")).toBe(2);
  });

  test("先月に同じ日がなければ先月末まで", () => {
    expect(countLastMonthSoFar(set("2026-02-28", "2026-03-01"), "2026-03-31")).toBe(1);
  });

  test("1月は前年の12月と比べる", () => {
    expect(countLastMonthSoFar(set("2025-12-05", "2025-12-20"), "2027-01-10")).toBe(0);
    expect(countLastMonthSoFar(set("2026-12-05", "2026-12-20"), "2027-01-10")).toBe(1);
  });
});

describe("食べずに続いた日数", () => {
  const start = "2026-11-01";

  test("最後に食べた日の翌日から今日まで（今日を含む）", () => {
    expect(cleanStreak(set("2026-11-20"), start, "2026-11-26")).toBe(6);
  });

  test("今日食べたら0", () => {
    expect(cleanStreak(set("2026-11-26"), start, "2026-11-26")).toBe(0);
  });

  test("一度も食べていなければ起点日から数える", () => {
    expect(cleanStreak(set(), start, "2026-11-10")).toBe(10);
    expect(cleanStreak(set("2026-10-20"), start, "2026-11-10")).toBe(10);
  });

  test("自己ベストは今続いている分を含む", () => {
    expect(bestCleanStreak(set("2026-11-03", "2026-11-05"), start, "2026-11-12")).toBe(7);
    expect(bestCleanStreak(set("2026-11-12"), start, "2026-11-14")).toBe(11);
  });
});

describe("続けたいことの連続日数", () => {
  test("今日やっていれば今日まで", () => {
    expect(doneStreak(set("2026-11-24", "2026-11-25", "2026-11-26"), "2026-11-26")).toBe(3);
  });

  test("今日まだなら昨日までで数え、途切れとしない", () => {
    expect(doneStreak(set("2026-11-24", "2026-11-25"), "2026-11-26")).toBe(2);
  });

  test("昨日もやっていなければ0", () => {
    expect(doneStreak(set("2026-11-23"), "2026-11-26")).toBe(0);
  });

  test("自己ベスト", () => {
    expect(bestDoneStreak(set("2026-10-30", "2026-10-31", "2026-11-01", "2026-11-05"))).toBe(3);
    expect(bestDoneStreak(set())).toBe(0);
  });
});
