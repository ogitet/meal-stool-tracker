import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { fromKey, toKey } from "./date";
import type { DateKey } from "./types";

/**
 * 減らしたいもの・続けたいことの数字（Scope 第2版 F-14）。
 * 引数の days は、食べた日（減らしたいもの）またはやった日（続けたいこと）の集合。
 */

function prevKey(key: DateKey): DateKey {
  return toKey(addDays(fromKey(key), -1));
}

/** start から end まで（両端を含む）の日付。start が end より後なら空。 */
function eachKey(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let d = fromKey(start); toKey(d) <= end; d = addDays(d, 1)) out.push(toKey(d));
  return out;
}

/** 期間内（両端を含む）に入る日の数。 */
export function countBetween(days: ReadonlySet<DateKey>, start: DateKey, end: DateKey): number {
  let n = 0;
  for (const d of days) if (d >= start && d <= end) n += 1;
  return n;
}

/** 今月1日から今日までの日数（今月の食べた日数・やった日数）。 */
export function countThisMonth(days: ReadonlySet<DateKey>, today: DateKey): number {
  return countBetween(days, toKey(startOfMonth(fromKey(today))), today);
}

/**
 * 先月1日から、先月の同じ日までの日数（Scope 第2版 Q54）。先月に同じ日がなければ先月末まで。
 */
export function countLastMonthSoFar(days: ReadonlySet<DateKey>, today: DateKey): number {
  const t = fromKey(today);
  const last = subMonths(t, 1);
  const end = Math.min(t.getDate(), endOfMonth(last).getDate());
  const endKey = toKey(new Date(last.getFullYear(), last.getMonth(), end));
  return countBetween(days, toKey(startOfMonth(last)), endKey);
}

/**
 * 食べずに続いた日数（Scope 第2版 F-14、Q55）。最後に食べた日の翌日から今日まで（今日を含む）。
 * 今日食べていれば0。起点日以降に一度も食べていなければ、起点日から数える。
 */
export function cleanStreak(eaten: ReadonlySet<DateKey>, start: DateKey, today: DateKey): number {
  let n = 0;
  for (let d = today; d >= start && !eaten.has(d); d = prevKey(d)) n += 1;
  return n;
}

/** 起点日から今日までで、最も長かった、食べずに続いた日数（今続いている分を含む）。 */
export function bestCleanStreak(eaten: ReadonlySet<DateKey>, start: DateKey, today: DateKey): number {
  let best = 0;
  let run = 0;
  for (const d of eachKey(start, today)) {
    run = eaten.has(d) ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * 続けたいことの連続日数（Scope 第2版 F-14、Q55）。今日まだやっていなければ、昨日までで数える。
 */
export function doneStreak(done: ReadonlySet<DateKey>, today: DateKey): number {
  let d = done.has(today) ? today : prevKey(today);
  let n = 0;
  while (done.has(d)) {
    n += 1;
    d = prevKey(d);
  }
  return n;
}

/** 最も長かった、やった日の連続日数。 */
export function bestDoneStreak(done: ReadonlySet<DateKey>): number {
  let best = 0;
  for (const d of done) {
    // 連続の始まりの日からだけ数える
    if (done.has(prevKey(d))) continue;
    let n = 0;
    for (let x = d; done.has(x); x = toKey(addDays(fromKey(x), 1))) n += 1;
    best = Math.max(best, n);
  }
  return best;
}

/** 先月との比較の見出し（Scope Q61）。「先月26日まで」、先月に同じ日がなければ「先月末まで」。 */
export function lastMonthLabel(today: DateKey): string {
  const t = fromKey(today);
  const lastEnd = endOfMonth(subMonths(t, 1)).getDate();
  return t.getDate() >= lastEnd ? "先月末まで" : `先月${t.getDate()}日まで`;
}
