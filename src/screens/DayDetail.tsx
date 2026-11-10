import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/Header";
import { ErrorRetry } from "../components/Status";
import { StoolMark } from "../components/StoolMark";
import { useMealsInRange } from "../data/meals";
import { useStoolsInRange } from "../data/stools";
import { useUserData } from "../data/UserDataContext";
import { useBack } from "../hooks/useBack";
import { AMOUNT_LABEL, displayName, FEELING_LABEL, FIXED_SLOTS, SHAPE_LABEL, SLOT_LABEL } from "../lib/constants";
import { sortCategories } from "../lib/categories";
import { formatDayJa, formatTime, isDateKey, isFuture } from "../lib/date";
import type { Meal, Stool } from "../lib/types";

/** S-03 日別詳細。並びは Structure 3章（朝・昼・夕・その他・便）。 */
export function DayDetail() {
  const { date } = useParams();
  if (!isDateKey(date) || isFuture(date)) return <Navigate to="/" replace />;
  return <DayDetailInner date={date} />;
}

function DayDetailInner({ date }: { date: string }) {
  const { uid, categories } = useUserData();
  const navigate = useNavigate();
  const back = useBack("/");
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

  function names(m: Meal): string {
    const cats = sortCategories(m.categoryIds.map((id) => categories.byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c));
    return cats.map(displayName).join("、");
  }

  function stoolText(s: Stool): string {
    return [SHAPE_LABEL[s.shape], s.amount && AMOUNT_LABEL[s.amount], s.feeling && FEELING_LABEL[s.feeling]].filter(Boolean).join("・");
  }

  const error = meals.error ?? stools.error ?? categories.error;

  return (
    <div className="screen">
      <Header left={<button type="button" className="lnk" onClick={back}>‹ 戻る</button>} title={formatDayJa(date)} />
      <div className="main" key={retry}>
        {error ? (
          <ErrorRetry message={error} onRetry={() => setRetry((n) => n + 1)} />
        ) : (
          <>
            <h2 className="sh" style={{ margin: 0 }}>食事</h2>
            <div className="list" role="list">
              {FIXED_SLOTS.map((slot) => {
                const m = meals.items.find((x) => x.slot === slot);
                return (
                  <button key={slot} type="button" role="listitem" className="dr" onClick={() => navigate(`/meal/${date}/${slot}`)}>
                    <span className="lb">{SLOT_LABEL[slot]}</span>
                    <span className={`vl${m ? "" : " muted"}`}>{m ? names(m) : meals.loading ? "" : "未記録"}</span>
                    <span className="chev" aria-hidden="true">›</span>
                  </button>
                );
              })}
              {others.map((m) => (
                <button key={m.id} type="button" role="listitem" className="dr" onClick={() => navigate(`/meal/${date}/other/${m.id}`)}>
                  <span className="lb">{SLOT_LABEL.other}</span>
                  <span className="vl">{names(m)}</span>
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              ))}
              <button type="button" className="add" onClick={() => navigate(`/meal/${date}/other`)}>＋ その他の食事を追加</button>
            </div>

            <h2 className="sh" style={{ margin: 0 }}>便</h2>
            <div className="list" role="list">
              {stools.items.map((s) => (
                <button key={s.id} type="button" role="listitem" className="dr" onClick={() => navigate(`/stool/${s.id}`)}>
                  <span className="tm num">{formatTime(s.occurredAt)}</span>
                  <span className="vl stv"><StoolMark shape={s.shape} size={18} />{stoolText(s)}</span>
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              ))}
              {!stools.loading && stools.items.length === 0 && (
                <div className="dr" style={{ cursor: "default" }}><span className="lb" /><span className="vl muted">未記録</span><span /></div>
              )}
              <button type="button" className="add" onClick={() => navigate(`/stool/new?date=${date}`)}>＋ 便を追加</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
