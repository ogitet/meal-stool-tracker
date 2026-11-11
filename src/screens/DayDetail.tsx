import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { DateTitle } from "../components/DateTitle";
import { Header } from "../components/Header";
import { ErrorRetry } from "../components/Status";
import { StoolMark } from "../components/StoolMark";
import { TileRow } from "../components/Tile";
import { useMealsInRange } from "../data/meals";
import { useStoolsInRange } from "../data/stools";
import { useUserData } from "../data/UserDataContext";
import { useNav } from "../hooks/useNav";
import { AMOUNT_LABEL, displayName, FEELING_LABEL, FIXED_SLOTS, SHAPE_LABEL, SLOT_LABEL } from "../lib/constants";
import { sortCategories } from "../lib/categories";
import { formatTime, isDateKey, isFuture } from "../lib/date";
import type { Category, Meal, Stool } from "../lib/types";

/** S-03 日別詳細。並びは Structure 3章（朝・昼・夕・その他・便）。 */
export function DayDetail() {
  const { date } = useParams();
  if (!isDateKey(date) || isFuture(date)) return <Navigate to="/" replace />;
  return <DayDetailInner date={date} />;
}

function DayDetailInner({ date }: { date: string }) {
  const { uid, categories } = useUserData();
  const nav = useNav();
  const [retry, setRetry] = useState(0);
  const meals = useMealsInRange(uid, date, date);
  const stools = useStoolsInRange(uid, date, date);

  const others = useMemo(
    () =>
      meals.items
        .filter((m) => m.slot === "other")
        .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)),
    [meals.items],
  );

  function cats(m: Meal): Category[] {
    return sortCategories(m.categoryIds.map((id) => categories.byId.get(id)).filter((c): c is Category => !!c));
  }

  /** 印と正式名称を並べて示す。印の意味をここで覚えられる。 */
  function mealValue(m: Meal) {
    const list = cats(m);
    return (
      <span className="vl">
        <span className="vt"><TileRow categories={list} /></span>
        <span className="vn">{list.map(displayName).join("、")}</span>
      </span>
    );
  }

  function stoolText(s: Stool): string {
    return [SHAPE_LABEL[s.shape], s.amount && AMOUNT_LABEL[s.amount], s.feeling && FEELING_LABEL[s.feeling]].filter(Boolean).join("・");
  }

  const error = meals.error ?? stools.error ?? categories.error;

  return (
    <div className="screen">
      <Header left={<button type="button" className="lnk" onClick={() => nav.back("/")}>‹ 戻る</button>} title={<DateTitle date={date} />} />
      <div className="paper">
        <div className="main end" key={retry}>
          {error ? (
            <ErrorRetry message={error} onRetry={() => setRetry((n) => n + 1)} />
          ) : (
            <>
              <h2 className="sh">食事</h2>
              <div className="list" role="list">
                {FIXED_SLOTS.map((slot) => {
                  const m = meals.items.find((x) => x.slot === slot);
                  return (
                    <button key={slot} type="button" role="listitem" className="dr" onClick={() => nav.go(`/meal/${date}/${slot}`, "open")}>
                      <span className="lb">{SLOT_LABEL[slot]}</span>
                      {m ? mealValue(m) : <span className="vl muted">{meals.loading ? "" : "未記録"}</span>}
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                  );
                })}
                {others.map((m) => (
                  <button key={m.id} type="button" role="listitem" className="dr" onClick={() => nav.go(`/meal/${date}/other/${m.id}`, "open")}>
                    <span className="lb">{SLOT_LABEL.other}</span>
                    {mealValue(m)}
                    <span className="chev" aria-hidden="true">›</span>
                  </button>
                ))}
                <button type="button" className="add" onClick={() => nav.go(`/meal/${date}/other`, "open")}>その他の食事を追加</button>
              </div>

              <h2 className="sh">便</h2>
              <div className="list" role="list">
                {stools.items.map((s) => (
                  <button key={s.id} type="button" role="listitem" className="dr" onClick={() => nav.go(`/stool/${s.id}`, "open")}>
                    <span className="tm">{formatTime(s.occurredAt)}</span>
                    <span className="vl stv"><StoolMark shape={s.shape} size={20} />{stoolText(s)}</span>
                    <span className="chev" aria-hidden="true">›</span>
                  </button>
                ))}
                {!stools.loading && stools.items.length === 0 && (
                  <div className="dr" style={{ cursor: "default" }}><span className="lb" /><span className="vl muted">未記録</span><span /></div>
                )}
                <button type="button" className="add" onClick={() => nav.go(`/stool/new?date=${date}`, "open")}>便を追加</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
