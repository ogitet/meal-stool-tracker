import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Segment } from "../components/Segment";
import { ErrorRetry } from "../components/Status";
import { StoolMark } from "../components/StoolMark";
import { TileRow } from "../components/Tile";
import { useMealsInRange } from "../data/meals";
import { useStoolsInRange } from "../data/stools";
import { useUserData } from "../data/UserDataContext";
import { useNav } from "../hooks/useNav";
import { useSwipe, type SwipeDir } from "../hooks/useSwipe";
import { dayTiles } from "../lib/categories";
import {
  formatMonthJa,
  formatWeekRange,
  fromKey,
  inferSlot,
  isDateKey,
  isFuture,
  isSameMonth,
  monthGrid,
  monthRange,
  shiftMonth,
  shiftWeek,
  todayKey,
  toKey,
  weekDays,
  weekdayJa,
  weekRange,
} from "../lib/date";
import type { Category, DateKey, Meal, Stool } from "../lib/types";

type View = "week" | "month";

const WEEK_MONTH = [
  { value: "week" as const, label: "週" },
  { value: "month" as const, label: "月" },
];

/** S-02 カレンダー。表示（週／月）と基準日は URL に持ち、戻ったときに同じ期間を示す。 */
export function Calendar() {
  const [params, setParams] = useSearchParams();
  const nav = useNav();
  const view: View = params.get("view") === "month" ? "month" : "week";
  const anchorKey = isDateKey(params.get("d") ?? undefined) ? (params.get("d") as DateKey) : todayKey();
  const anchor = useMemo(() => fromKey(anchorKey), [anchorKey]);
  const [retry, setRetry] = useState(0);
  // 期間を送った向き。新しい期間をその向きから入れる（0 は動きなし）
  const [dir, setDir] = useState<SwipeDir | 0>(0);

  /**
   * いまの URL から表示と基準日を読む。描画時の値（view、anchorKey）は、続けて操作すると
   * 再描画の前で古いことがあるため、期間を送る計算には使わない。
   */
  function current(): { view: View; d: DateKey } {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("d") ?? undefined;
    return { view: p.get("view") === "month" ? "month" : "week", d: isDateKey(d) ? d : todayKey() };
  }

  function update(next: { view?: View; d?: DateKey }) {
    const cur = current();
    const p = new URLSearchParams(window.location.search);
    p.set("view", next.view ?? cur.view);
    p.set("d", next.d ?? cur.d);
    setParams(p, { replace: true });
  }

  const today = todayKey();
  function go(n: SwipeDir) {
    const cur = current();
    const from = fromKey(cur.d);
    setDir(n);
    update({ d: toKey(cur.view === "week" ? shiftWeek(from, n) : shiftMonth(from, n)) });
  }
  function goToday() {
    const cur = current();
    setDir(today === cur.d ? 0 : today > cur.d ? 1 : -1);
    update({ d: today });
  }
  const swipe = useSwipe(go);

  return (
    <div className="screen">
      <header className="hd cal-hd">
        <Segment
          options={WEEK_MONTH}
          value={view}
          onChange={(v) => {
            if (v) {
              setDir(0);
              update({ view: v });
            }
          }}
          className="sm"
          label="表示の切替"
        />
        <div className="nav">
          <button
            type="button"
            className="arw"
            aria-label={view === "week" ? "前の週" : "前の月"}
            onClick={() => go(-1)}
          >
            ‹
          </button>
          <h1 className="rng" aria-label={view === "week" ? formatWeekRange(anchor) : formatMonthJa(anchor)}>
            {view === "week" ? (
              formatWeekRange(anchor).replace("〜", "–")
            ) : (
              <>
                {anchor.getFullYear()}
                <span className="u">年</span>
                {anchor.getMonth() + 1}
                <span className="u">月</span>
              </>
            )}
          </h1>
          <button
            type="button"
            className="arw"
            aria-label={view === "week" ? "次の週" : "次の月"}
            onClick={() => go(1)}
          >
            ›
          </button>
        </div>
        <button type="button" className="pill" onClick={goToday}>
          今日
        </button>
        <button type="button" className="ico" aria-label="カテゴリ管理" onClick={() => nav.go("/categories", "push")}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 7h10M18 7h2M4 17h4M12 17h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <div className="main cal swipe" {...swipe.handlers}>
        <div
          className={`track${swipe.dx ? " dragging" : ""}`}
          style={swipe.dx ? { transform: `translateX(${swipe.dx * 0.35}px)` } : undefined}
        >
          <div
            key={`${view}${anchorKey}${retry}`}
            className={`pager${dir === 1 ? " from-r" : dir === -1 ? " from-l" : ""}`}
          >
            {view === "week" ? (
              <WeekView anchor={anchor} today={today} onRetry={() => setRetry((n) => n + 1)} />
            ) : (
              <MonthView anchor={anchor} today={today} onRetry={() => setRetry((n) => n + 1)} />
            )}
          </div>
        </div>
      </div>

      <nav className="bar cal" aria-label="記録">
        <button type="button" className="btn rec" onClick={() => nav.go(`/meal/${today}/${inferSlot()}`, "open")}>
          食事
        </button>
        <button type="button" className="btn rec" onClick={() => nav.go(`/stool/new?date=${today}`, "open")}>
          便
        </button>
      </nav>
    </div>
  );
}

function groupByDate<T extends { date: DateKey }>(items: T[]): Map<DateKey, T[]> {
  const m = new Map<DateKey, T[]>();
  for (const it of items) {
    const arr = m.get(it.date);
    if (arr) arr.push(it);
    else m.set(it.date, [it]);
  }
  return m;
}

function WeekView({ anchor, today, onRetry }: { anchor: Date; today: DateKey; onRetry: () => void }) {
  const { uid, categories } = useUserData();
  const nav = useNav();
  const { start, end } = weekRange(anchor);
  const meals = useMealsInRange(uid, start, end);
  const stools = useStoolsInRange(uid, start, end);
  const mealsBy = useMemo(() => groupByDate(meals.items), [meals.items]);
  const stoolsBy = useMemo(() => groupByDate(stools.items), [stools.items]);
  const error = meals.error ?? stools.error ?? categories.error;
  const loading = meals.loading || stools.loading || categories.loading;

  if (error) return <ErrorRetry message={error} onRetry={onRetry} />;

  return (
    <div role="list" aria-busy={loading}>
      {weekDays(anchor).map((d) => {
        const key = toKey(d);
        const future = isFuture(key);
        const isToday = key === today;
        const dayMeals: Meal[] = mealsBy.get(key) ?? [];
        const dayStools: Stool[] = stoolsBy.get(key) ?? [];
        const tiles: Category[] = dayTiles(
          dayMeals.map((m) => m.categoryIds),
          categories.byId,
        );
        const empty = !loading && dayMeals.length === 0 && dayStools.length === 0;
        return (
          <button
            key={key}
            type="button"
            role="listitem"
            className={`slip${isToday ? " today" : ""}${future ? " future" : ""}`}
            disabled={future}
            aria-current={isToday ? "date" : undefined}
            aria-label={`${d.getMonth() + 1}月${d.getDate()}日 ${weekdayJa(d)}曜日${isToday ? " 今日" : ""}`}
            onClick={() => nav.go(`/day/${key}`, "push")}
          >
            <span className="dt">
              <span className="dn">{d.getDate()}</span>
              <span className="wd">{weekdayJa(d)}</span>
            </span>
            <span className="stl">
              {dayStools.map((s) => (
                <StoolMark key={s.id} shape={s.shape} size={18} />
              ))}
            </span>
            <span className="fd">
              {tiles.length > 0 ? (
                <TileRow categories={tiles} />
              ) : empty && !future ? (
                <span className="none">未記録</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, today, onRetry }: { anchor: Date; today: DateKey; onRetry: () => void }) {
  const { uid } = useUserData();
  const nav = useNav();
  const { start, end } = monthRange(anchor);
  const stools = useStoolsInRange(uid, start, end);
  const stoolsBy = useMemo(() => groupByDate(stools.items), [stools.items]);

  if (stools.error) return <ErrorRetry message={stools.error} onRetry={onRetry} />;

  return (
    <>
      <div className="mwd" aria-hidden="true">
        {["月", "火", "水", "木", "金", "土", "日"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mgrid" role="list" aria-busy={stools.loading}>
        {monthGrid(anchor).map((d) => {
          const key = toKey(d);
          const future = isFuture(key);
          const marks = stoolsBy.get(key) ?? [];
          const shown = marks.slice(0, 6);
          const cls = ["mc", key === today ? "today" : "", isSameMonth(d, anchor) ? "" : "om", future ? "future" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className={cls}
              disabled={future}
              aria-current={key === today ? "date" : undefined}
              aria-label={`${d.getMonth() + 1}月${d.getDate()}日${marks.length ? ` 便${marks.length}回` : ""}`}
              onClick={() => nav.go(`/day/${key}`, "push")}
            >
              <span className="md">{d.getDate()}</span>
              <span className="mm">
                {shown.map((s) => (
                  <StoolMark key={s.id} shape={s.shape} size={14} />
                ))}
                {marks.length > 6 && <span className="more">+{marks.length - 6}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
