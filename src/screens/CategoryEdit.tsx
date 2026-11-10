import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/Header";
import { Loading } from "../components/Status";
import { useToast } from "../components/Toast";
import { addCategory, isDuplicateName, updateCategory } from "../data/categories";
import { useUserData } from "../data/UserDataContext";
import { writeErrorMessage } from "../data/write";
import { abbrIsOneChar, defaultAbbr } from "../lib/categories";
import { CATEGORY_NAME_MAX, GROUPS } from "../lib/constants";
import type { GroupId } from "../lib/types";

/** S-08 カテゴリ編集。/categories/new で追加、/categories/:id で編集。 */
export function CategoryEdit() {
  const { id } = useParams();
  const { uid, categories } = useUserData();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = id === "new";
  const target = useMemo(() => (isNew ? null : categories.byId.get(id ?? "") ?? null), [isNew, id, categories.byId]);

  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [abbrTouched, setAbbrTouched] = useState(false);
  const [group, setGroup] = useState<GroupId>("other");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(isNew);

  useEffect(() => {
    if (isNew || !target || initialized) return;
    setName(target.name);
    setAbbr(target.abbr);
    setAbbrTouched(true);
    setGroup(target.group);
    setActive(target.active);
    setInitialized(true);
  }, [isNew, target, initialized]);

  if (!isNew && !categories.loading && !target) return <Navigate to="/categories" replace />;

  function onNameChange(v: string) {
    setName(v);
    if (!abbrTouched) setAbbr(defaultAbbr(v));
  }

  const trimmed = name.trim();
  const validation = (() => {
    if (!trimmed) return "名称を入力してください";
    if (Array.from(trimmed).length > CATEGORY_NAME_MAX) return `名称は${CATEGORY_NAME_MAX}文字以内にしてください`;
    if (!abbrIsOneChar(abbr)) return "略称は1文字にしてください";
    if (isDuplicateName(trimmed, group, categories.all, target?.id)) return "同じグループに同じ名称があります";
    return null;
  })();

  async function save() {
    if (busy || validation) return;
    setBusy(true);
    setError(null);
    try {
      if (isNew) await addCategory(uid, { name: trimmed, abbr, group }, categories.all);
      else if (target) await updateCategory(uid, target.id, { name: trimmed, abbr, group, active });
      toast(isNew ? "追加しました" : "保存しました");
      navigate("/categories", { replace: true });
    } catch (e) {
      setError(writeErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <Header
        left={<button type="button" className="lnk" onClick={() => navigate("/categories", { replace: true })}>キャンセル</button>}
        title={isNew ? "カテゴリを追加" : "カテゴリ編集"}
      />
      <div className="main pad">
        {!initialized ? (
          <Loading />
        ) : (
          <>
            <div className="frow">
              <label htmlFor="cat-name">名称</label>
              <input id="cat-name" className="inp" type="text" value={name} maxLength={CATEGORY_NAME_MAX} autoComplete="off" onChange={(e) => onNameChange(e.target.value)} />
            </div>
            <div className="frow">
              <label htmlFor="cat-abbr">略称（1文字）</label>
              <input id="cat-abbr" className="inp abbr" type="text" value={abbr} maxLength={2} autoComplete="off"
                onChange={(e) => { setAbbrTouched(true); setAbbr(e.target.value); }} />
            </div>
            <div className="frow">
              <label htmlFor="cat-group">グループ</label>
              <select id="cat-group" className="inp" value={group} onChange={(e) => setGroup(e.target.value as GroupId)}>
                {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            {!isNew && (
              <div className="frow">
                <span id="lbl-active">使う</span>
                <button type="button" role="switch" aria-checked={active} aria-labelledby="lbl-active" className="tgl" onClick={() => setActive((a) => !a)} />
              </div>
            )}
            {!isNew && <p className="note" style={{ margin: 0 }}>名称の変更は過去の記録にも反映されます</p>}
            {name && validation && validation !== "名称を入力してください" && (
              <div className="msg" role="alert" style={{ padding: "8px 0 0" }}>{validation}</div>
            )}
            {error && <div className="msg" role="alert" style={{ padding: "8px 0 0" }}>{error}</div>}
          </>
        )}
      </div>
      <div className="bar">
        <button type="button" className="btn pri" disabled={busy || !!validation || !initialized} onClick={save}>
          {busy ? "保存しています…" : "保存"}
        </button>
      </div>
    </div>
  );
}
