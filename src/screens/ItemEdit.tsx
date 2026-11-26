import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Loading } from "@/components/Status";
import { useToast } from "@/components/Toast";
import { addItem, updateItem } from "@/data/habits";
import { useUserData } from "@/data/UserDataContext";
import { writeErrorMessage } from "@/data/write";
import { useNav } from "@/hooks/useNav";
import {
  abbrIsOneChar,
  canAddItem,
  defaultAbbr,
  inkOf,
  isDuplicateItemName,
  ITEM_ACTIVE_MAX,
  ITEM_NAME_MAX,
  KIND_LABEL,
} from "@/lib/items";
import type { HabitKind } from "@/lib/types";

/** S-12 項目編集。/items/new?kind=reduce で追加、/items/:id で編集。種類は変えられない（Structure Q70）。 */
export function ItemEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { uid, habits } = useUserData();
  const nav = useNav();
  const toast = useToast();
  const isNew = id === "new";
  const newKind: HabitKind = params.get("kind") === "keep" ? "keep" : "reduce";
  const target = useMemo(() => (isNew ? null : (habits.byId.get(id ?? "") ?? null)), [isNew, id, habits.byId]);
  const kind = target?.kind ?? newKind;

  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [abbrTouched, setAbbrTouched] = useState(false);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(isNew);

  useEffect(() => {
    if (isNew || !target || initialized) return;
    setName(target.name);
    setAbbr(target.abbr);
    setAbbrTouched(true);
    setActive(target.active);
    setInitialized(true);
  }, [isNew, target, initialized]);

  if (!isNew && !habits.loading && !target) return <Navigate to="/items" replace />;

  const back = () => nav.back("/items");

  function onNameChange(v: string) {
    setName(v);
    if (!abbrTouched) setAbbr(defaultAbbr(v));
  }

  const trimmed = name.trim();
  // 「使わない」から「使う」に戻すときも、4つまで（Scope Q57）
  const overLimit = active && !(target?.active ?? false) && !canAddItem(habits.all, kind);
  const validation = (() => {
    if (!trimmed) return "名称を入力してください";
    if (Array.from(trimmed).length > ITEM_NAME_MAX) return `名称は${ITEM_NAME_MAX}文字以内にしてください`;
    if (!abbrIsOneChar(abbr)) return "略称は1文字にしてください";
    if (isDuplicateItemName(trimmed, kind, habits.all, target?.id)) return "同じ種類に同じ名称があります";
    if (overLimit) return `${KIND_LABEL[kind]}で使う項目は${ITEM_ACTIVE_MAX}つまでです`;
    return null;
  })();

  async function save() {
    if (busy || validation) return;
    setBusy(true);
    setError(null);
    try {
      if (isNew) await addItem(uid, { kind, name: trimmed, abbr }, habits.all);
      else if (target) await updateItem(uid, target.id, { name: trimmed, abbr, active });
      toast(isNew ? "追加しました" : "保存しました");
      back();
    } catch (e) {
      setError(writeErrorMessage(e));
      setBusy(false);
    }
  }

  const ink = target ? inkOf(target, habits.all) : kind === "keep" ? "vegetable" : "other";

  return (
    <div className="screen">
      <Header
        left={
          <button type="button" className="lnk" onClick={back}>
            キャンセル
          </button>
        }
        title={isNew ? `${KIND_LABEL[kind]}を追加` : "項目の編集"}
      />
      <div className="paper">
        <div className="main pad" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {!initialized ? (
            <Loading />
          ) : (
            <>
              <div className="frow">
                <span>種類</span>
                <span>{KIND_LABEL[kind]}</span>
              </div>
              <div className="frow">
                <label htmlFor="item-name">名称</label>
                <input
                  id="item-name"
                  className="inp"
                  type="text"
                  value={name}
                  maxLength={ITEM_NAME_MAX}
                  autoComplete="off"
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </div>
              <div className="frow">
                <label htmlFor="item-abbr">略称（1文字）</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    id="item-abbr"
                    className="inp abbr"
                    type="text"
                    value={abbr}
                    maxLength={2}
                    autoComplete="off"
                    onChange={(e) => {
                      setAbbrTouched(true);
                      setAbbr(e.target.value);
                    }}
                  />
                  {abbrIsOneChar(abbr) && (
                    <span className={`t g-${ink}`} aria-hidden="true">
                      {abbr}
                    </span>
                  )}
                </div>
              </div>
              {!isNew && (
                <div className="frow">
                  <span id="lbl-active">使う</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-labelledby="lbl-active"
                    className="tgl"
                    onClick={() => setActive((a) => !a)}
                  />
                </div>
              )}
              {!isNew && <p className="note">名称の変更は過去の記録にも反映されます</p>}
              {name && validation && validation !== "名称を入力してください" && (
                <div className="msg" role="alert">
                  {validation}
                </div>
              )}
              {error && (
                <div className="msg" role="alert">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
        <div className="bar">
          <button type="button" className="btn pri" disabled={busy || !!validation || !initialized} onClick={save}>
            {busy ? "保存しています…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
