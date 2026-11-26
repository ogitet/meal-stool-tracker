import { addDays, addMonths, format, isValid, parse, startOfMonth, startOfWeek } from "date-fns";
import type { DateKey } from "./types";

/** 週の開始は月曜（Scope Q13）。 */
const WEEK = { weekStartsOn: 1 as const };

export function toKey(d: Date): DateKey {
  return format(d, "yyyy-MM-dd");
}

export function fromKey(key: DateKey): Date {
  return parse(key, "yyyy-MM-dd", new Date());
}

export function isDateKey(s: string | undefined): s is DateKey {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(fromKey(s));
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

/** 未来の日は記録できない（Structure Q19）。 */
export function isFuture(key: DateKey, now: Date = new Date()): boolean {
  return key > todayKey(now);
}

/** 月表示の格子。月曜開始で、常に6週分（42日）を返す。 */
export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), WEEK);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function monthRange(anchor: Date): { start: DateKey; end: DateKey } {
  const grid = monthGrid(anchor);
  return { start: toKey(grid[0]!), end: toKey(grid[41]!) };
}

export function shiftMonth(anchor: Date, n: number): Date {
  return addMonths(anchor, n);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

export function weekdayJa(d: Date): string {
  return WEEKDAY_JA[d.getDay()]!;
}

/** "11月10日（火）" */
export function formatDayJa(key: DateKey): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdayJa(d)}）`;
}

export function formatMonthJa(anchor: Date): string {
  return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`;
}

export function formatTime(d: Date): string {
  return format(d, "HH:mm");
}

/**
 * 過去の日に便を追加するときの初期日時：日付はその日、時刻は操作時の時分（Scope F-03）。
 * 今日なら現在時刻そのまま。
 */
export function initialOccurredAt(dateKey: DateKey, now: Date = new Date()): Date {
  const d = fromKey(dateKey);
  d.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return d;
}
