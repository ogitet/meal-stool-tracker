import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { DateTitle } from "../components/DateTitle";
import { Header } from "../components/Header";
import { Segment } from "../components/Segment";
import { Loading } from "../components/Status";
import { useToast } from "../components/Toast";
import { createMeal, deleteMeal, findPreviousMeal, fixedMealId, getMeal, updateMealCategories } from "../data/meals";
import { useUserData } from "../data/UserDataContext";
import { writeErrorMessage } from "../data/write";
import { useNav } from "../hooks/useNav";
import { GROUPS, SLOT_LABEL, SLOTS } from "../lib/constants";
import { isDateKey, isFuture } from "../lib/date";
import type { Category, Meal, Slot } from "../lib/types";

interface CarriedState {
  selected?: string[];
}

function isSlot(s: string | undefined): s is Slot {
  return !!s && (SLOTS as string[]).includes(s);
}

/**
 * S-04 食事記録。
 * /meal/:date/:slot            朝食・昼食・夕食（記録があれば編集、なければ新規）
 * /meal/:date/other            その他の食事の新規
 * /meal/:date/other/:id        その他の食事の編集
 */
export function MealForm() {
  const { date, slot, id } = useParams();
  if (!isDateKey(date) || isFuture(date) || !isSlot(slot)) return <Navigate to="/" replace />;
  if (slot !== "other" && id) return <Navigate to={`/meal/${date}/${slot}`} replace />;
  const key = `${date}/${slot}/${id ?? ""}`;
  return <MealFormInner key={key} date={date} slot={slot} otherId={id} />;
}

function MealFormInner({ date, slot, otherId }: { date: string; slot: Slot; otherId?: string }) {
  const { uid, categories } = useUserData();
  const nav = useNav();
  const location = useLocation();
  const toast = useToast();
  const back = () => nav.back(`/day/${date}`);

  const [existing, setExisting] = useState<Meal | null | undefined>(undefined); // undefined = 読み込み中
  const [selected, setSelected] = useState<string[]>(() => (location.state as CarriedState | null)?.selected ?? []);
  const [previous, setPrevious] = useState<Meal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  // 既存の記録を読み込む
  useEffect(() => {
    let alive = true;
    const targetId = slot === "other" ? otherId : fixedMealId(date, slot);
    if (!targetId) {
      setExisting(null);
      return;
    }
    getMeal(uid, targetId)
      .then((m) => {
        if (!alive) return;
        setExisting(m);
        if (m) setSelected(m.categoryIds);
      })
      .catch(() => alive && setError("読み込めませんでした"));
    return () => { alive = false; };
  }, [uid, date, slot, otherId]);

  const isEdit = existing != null;
  const isNewFixed = existing === null && slot !== "other";

  // 前回のコピー（固定枠の新規作成時のみ）
  useEffect(() => {
    const fixedSlot = slot === "other" ? null : slot;
    if (!isNewFixed || !fixedSlot) return;
    let alive = true;
    findPreviousMeal(uid, fixedSlot, date)
      .then((m) => alive && setPrevious(m))
      .catch(() => {});
    return () => { alive = false; };
  }, [uid, date, slot, isNewFixed]);

  // 表示するカテゴリ：使用中 ＋ 既存の記録に含まれる「使わない」カテゴリ（Structure 7章）
  const visible = useMemo(() => {
    const initial = new Set(existing?.categoryIds ?? []);
    return categories.all.filter((c) => c.active || initial.has(c.id));
  }, [categories.all, existing]);

  // 「使わない」カテゴリは外せるが、一度外すと選び直せない（Structure 7章）
  const canSelect = (c: Category) => c.active || selected.includes(c.id);

  function toggle(c: Category) {
    if (!canSelect(c)) return;
    setSelected((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]));
  }

  function switchSlot(next: Slot) {
    if (next === slot) return;
    nav.go(`/meal/${date}/${next}`, "none", { replace: true, state: { selected } satisfies CarriedState });
  }

  function copyPrevious() {
    if (!previous) return;
    const activeIds = new Set(categories.active.map((c) => c.id));
    setSelected(previous.categoryIds.filter((id) => activeIds.has(id)));
  }

  async function save() {
    if (busy || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      if (existing) await updateMealCategories(uid, existing.id, selected);
      else await createMeal(uid, date, slot, selected);
      toast("記録しました");
      back();
    } catch (e) {
      setError(writeErrorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing || busy) return;
    setBusy(true);
    try {
      await deleteMeal(uid, existing.id);
      toast("削除しました");
      back();
    } catch (e) {
      setConfirm(false);
      setError(writeErrorMessage(e));
      setBusy(false);
    }
  }

  const slotOptions = SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }));

  return (
    <div className="screen">
      <Header
        left={<button type="button" className="lnk" onClick={back}>キャンセル</button>}
        title={<DateTitle date={date} />}
        right={isEdit ? <button type="button" className="lnk" onClick={() => setConfirm(true)}>削除</button> : null}
      />

      <div className="paper">
        {existing === undefined ? (
          <div className="slot" style={{ minHeight: 54 }} />
        ) : isEdit ? (
          <div className="slot fixed">{SLOT_LABEL[slot]}<small>枠は変更できません</small></div>
        ) : (
          <div className="slot">
            <Segment options={slotOptions} value={slot} onChange={(v) => v && switchSlot(v)} className="slot" label="食事枠" />
          </div>
        )}

        <div className="main pad">
          {existing === undefined || categories.loading ? (
            <Loading />
          ) : (
            GROUPS.map((g) => {
              const items = visible.filter((c) => c.group === g.id);
              if (items.length === 0) return null;
              return (
                <section key={g.id} aria-labelledby={`g-${g.id}`}>
                  <h2 id={`g-${g.id}`} className="gh">
                    <i className={`sw g-${g.id}`} aria-hidden="true" />{g.label}
                  </h2>
                  <div className="chips">
                    {items.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`chip c-${c.group}${Array.from(c.name).length > 5 ? " long" : ""}`}
                        aria-pressed={selected.includes(c.id)}
                        disabled={!canSelect(c)}
                        title={c.active ? undefined : "使わないカテゴリ"}
                        onClick={() => toggle(c)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })
          )}
          {error && <div className="msg" role="alert">{error}</div>}
        </div>

        <div className="bar">
          {isNewFixed && previous && (
            <button type="button" className="btn out" onClick={copyPrevious}>前回をコピー</button>
          )}
          <button
            type="button"
            className={`btn pri${isNewFixed && previous ? " grow2" : ""}`}
            disabled={busy || selected.length === 0 || existing === undefined}
            onClick={save}
          >
            {busy ? "保存しています…" : "保存"}
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmSheet
          message="この記録を削除しますか？"
          confirmLabel="削除する"
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
