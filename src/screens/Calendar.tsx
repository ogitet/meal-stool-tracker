import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Segment } from "../components/Segment";
import { ErrorRetry } from "../components/Status";
import { StoolMark } from "../components/StoolMark";
import { TileRow } from "../components/Tile";
import { useMealsInRange } from "../data/meals";
import { useStoolsInRange } from "../data/stools";
import { useUserData } from "../data/UserDataContext";
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

/** S-02 カレンダー。表示（週／月）と基準日は URL に持ち、戻ったときに同じ期間を示す。 */
export function Calendar() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view: View = params.get("view") === "month" ? "month" : "week";
  const anchorKey = isDateKey(params.get("d") ?? undefined) ? (params.get("d") as DateKey) : todayKey();
  const anchor = useMemo(() => fromKey(anchorKey), [anchorKey]);
  const [retry, setRetry] = useState(0);

  function update(next: { view?: View; d?: DateKey }) {
    const p = new URLSearchParams(params);
    p.set("view", next.view ?? view);
    p.set("d", next.d ?? anchorKey);
    setParams(p, { replace: true });
  }

  const today = todayKey();
  const WEEK_MONTH = [
    { value: "week" as const, label: "週" },
    { value: "month" as const, label: "月" },
  ];

  return (
    <div className="screen">
      <header className="hd cal-hd">
        <Segment options={WEEK_MONTH} value={view} onChange={(v) => v && update({ view: v })} className="sm" label="表示の切替" />
        <div className="nav">
          <button type="button" className="arw" aria-label={view === "week" ? "前の週" : "前の月"}
            onClick={() => update({ d: toKey(view === "week" ? shiftWeek(anchor, -1) : shiftMonth(anchor, -1)) })}>‹</button>
          <h1 className="rng num" style={{ margin: 0 }}>{view === "week" ? formatWeekRange(anchor) : formatMonthJa(anchor)}</h1>
          <button type="button" className="arw" aria-label={view === "week" ? "次の週" : "次の月"}
            onClick={() => update({ d: toKey(view === "week" ? shiftWeek(anchor, 1) : shiftMonth(anchor, 1)) })}>›</button>
        </div>
        <button type="button" className="lnk" style={{ fontSize: 14 }} onClick={() => update({ d: today })}>今日</button>
        <button type="button" className="ico" aria-label="カテゴリ管理" onClick={() => navigate("/categories")}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      <div className="main">
        {view === "week" ? (
          <WeekView key={`w${retry}`} anchor={anchor} today={today} onRetry={() => setRetry((n) => n + 1)} />
        ) : (
          <MonthView key={`m${retry}`} anchor={anchor} today={today} onRetry={() => setRetry((n) => n + 1)} />
        )}
      </div>

      <nav className="bar" aria-label="記録">
        <button type="button" className="btn pri" onClick={() => navigate(`/meal/${today}/${inferSlot()}`)}>食事</button>
        <button type="button" className="btn pri" onClick={() => navigate(`/stool/new?date=${today}`)}>便</button>
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
  const navigate = useNavigate();
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
        const tiles: Category[] = dayTiles(dayMeals.map((m) => m.categoryIds), categories.byId);
        const empty = !loading && dayMeals.length === 0 && dayStools.length === 0;
        return (
          <button
            key={key}
            type="button"
            role="listitem"
            className={`row${isToday ? " today" : ""}${future ? " future" : ""}`}
            disabled={future}
            aria-label={`${d.getMonth() + 1}月${d.getDate()}日 ${weekdayJa(d)}曜日`}
            onClick={() => navigate(`/day/${key}`)}
          >
            <span className="dt"><span className="wd">{weekdayJa(d)}</span><span className="dn num">{d.getDate()}</span></span>
            <span className="stl">{dayStools.map((s) => <StoolMark key={s.id} shape={s.shape} size={18} />)}</span>
            <span className="fd">
              {tiles.length > 0 ? <TileRow categories={tiles} /> : empty && !future ? <span className="none">未記録</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, today, onRetry }: { anchor: Date; today: DateKey; onRetry: () => void }) {
  const { uid } = useUserData();
  const navigate = useNavigate();
  const { start, end } = monthRange(anchor);
  const stools = useStoolsInRange(uid, start, end);
  const stoolsBy = useMemo(() => groupByDate(stools.items), [stools.items]);

  if (stools.error) return <ErrorRetry message={stools.error} onRetry={onRetry} />;

  return (
    <>
      <div className="mwd" aria-hidden="true">
        {["月", "火", "水", "木", "金", "土", "日"].map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="mgrid" role="list" aria-busy={stools.loading}>
        {monthGrid(anchor).map((d) => {
          const key = toKey(d);
          const future = isFuture(key);
          const marks = stoolsBy.get(key) ?? [];
          const shown = marks.slice(0, 6);
          const cls = ["mc", key === today ? "today" : "", isSameMonth(d, anchor) ? "" : "om", future ? "future" : ""].filter(Boolean).join(" ");
          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className={cls}
              disabled={future}
              aria-label={`${d.getMonth() + 1}月${d.getDate()}日${marks.length ? ` 便${marks.length}回` : ""}`}
              onClick={() => navigate(`/day/${key}`)}
            >
              <span className="md num">{d.getDate()}</span>
              <span className="mm">
                {shown.map((s) => <StoolMark key={s.id} shape={s.shape} size={14} />)}
                {marks.length > 6 && <span className="more">+{marks.length - 6}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
