import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ErrorRetry, Loading } from "@/components/Status";
import { Tile } from "@/components/Tile";
import { useMealsInRange } from "@/data/meals";
import { useUserData } from "@/data/UserDataContext";
import { useNav } from "@/hooks/useNav";
import { GROUPS } from "@/lib/constants";
import {
  calendarMonthRange,
  formatMonthJa,
  fromKey,
  isDateKey,
  isFuture,
  shiftMonth,
  todayKey,
  toKey,
} from "@/lib/date";
import { countDaysByCategory, countRecordedDays } from "@/lib/stats";
import type { DateKey } from "@/lib/types";

/**
 * S-09 集計。カテゴリを食べた日の数を月ごとに示す（Strategy G3）。
 * 月は URL に持つ（d はその月のいずれかの日）。
 */
export function Stats() {
  const [params, setParams] = useSearchParams();
  const nav = useNav();
  const anchorKey = isDateKey(params.get("d") ?? undefined) ? (params.get("d") as DateKey) : todayKey();
  const anchor = useMemo(() => fromKey(anchorKey), [anchorKey]);
  const [retry, setRetry] = useState(0);
  const nextIsFuture = isFuture(calendarMonthRange(shiftMonth(anchor, 1)).start);

  function go(n: 1 | -1) {
    const p = new URLSearchParams(params);
    p.set("d", toKey(shiftMonth(anchor, n)));
    setParams(p, { replace: true });
  }

  return (
    <div className="screen">
      <Header
        left={
          <button type="button" className="lnk" onClick={() => nav.back("/?view=month")}>
            ‹ 戻る
          </button>
        }
        title="集計"
      />
      <div className="paper">
        <div className="main end">
          <div className="st-nav">
            <button type="button" className="arw" aria-label="前の月" onClick={() => go(-1)}>
              ‹
            </button>
            <h2 className="rng" aria-label={formatMonthJa(anchor)}>
              {anchor.getFullYear()}
              <span className="u">年</span>
              {anchor.getMonth() + 1}
              <span className="u">月</span>
            </h2>
            <button type="button" className="arw" aria-label="次の月" disabled={nextIsFuture} onClick={() => go(1)}>
              ›
            </button>
          </div>
          <MonthStats key={`${anchorKey}${retry}`} anchor={anchor} onRetry={() => setRetry((n) => n + 1)} />
        </div>
      </div>
    </div>
  );
}

function MonthStats({ anchor, onRetry }: { anchor: Date; onRetry: () => void }) {
  const { uid, categories } = useUserData();
  const { start, end } = calendarMonthRange(anchor);
  const meals = useMealsInRange(uid, start, end);
  const counts = useMemo(() => countDaysByCategory(meals.items), [meals.items]);
  const recorded = useMemo(() => countRecordedDays(meals.items), [meals.items]);
  const error = meals.error ?? categories.error;

  if (error) return <ErrorRetry message={error} onRetry={onRetry} />;
  if (meals.loading || categories.loading) return <Loading />;
  if (recorded === 0) return <p className="status">この月の食事の記録はありません</p>;

  // 「使わない」カテゴリも、この月の記録にあれば示す（Scope Q7）
  const shown = categories.all.filter((c) => c.active || counts.has(c.id));

  return (
    <>
      <p className="st-sum">
        食事の記録がある日<b>{recorded}</b>日
      </p>
      {GROUPS.map((g) => {
        const items = shown.filter((c) => c.group === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id}>
            <h2 className="sh">{g.label}</h2>
            <div className="list">
              {items.map((c) => {
                const n = counts.get(c.id) ?? 0;
                return (
                  <div key={c.id} className={`st-row${n === 0 ? " zero" : ""}`}>
                    <Tile category={c} />
                    <span className="nm">{c.name}</span>
                    <span className="st-bar" aria-hidden="true">
                      <i className={`g-${c.group}`} style={{ width: `${(n / recorded) * 100}%` }} />
                    </span>
                    <span className="st-n">
                      {n}
                      <span className="u">日</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="st-note">
        記録された範囲の傾向です。記録のない日は数えていないため、実際に食べた日の数より少ないことがあります。
      </p>
    </>
  );
}
