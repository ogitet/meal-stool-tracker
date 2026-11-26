import { useEffect, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { format, isValid, parse } from "date-fns";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { DateTitle } from "@/components/DateTitle";
import { Header } from "@/components/Header";
import { Segment } from "@/components/Segment";
import { ErrorRetry, Loading } from "@/components/Status";
import { StoolMark } from "@/components/StoolMark";
import { useToast } from "@/components/Toast";
import { createStool, deleteStool, getStool, updateStool } from "@/data/stools";
import { useUserData } from "@/data/UserDataContext";
import { writeErrorMessage } from "@/data/write";
import { useNav } from "@/hooks/useNav";
import { useToday } from "@/hooks/useToday";
import { AMOUNT_LABEL, AMOUNTS, FEELING_LABEL, FEELINGS, SHAPE_LABEL, SHAPES } from "@/lib/constants";
import { initialOccurredAt, isDateKey, isFuture, todayKey, toKey } from "@/lib/date";
import type { Amount, Feeling, Shape } from "@/lib/types";

/**
 * S-06 便記録。
 * /stool/new?date=YYYY-MM-DD   新規（時刻は自動）
 * /stool/:id                   編集（日時を修正できる）
 */
export function StoolForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  if (id === "new" || !id) {
    const date = params.get("date") ?? todayKey();
    if (!isDateKey(date) || isFuture(date)) return <Navigate to="/" replace />;
    return <StoolFormInner key={`new-${date}`} newDate={date} />;
  }
  return <StoolFormInner key={id} editId={id} />;
}

function StoolFormInner({ newDate, editId }: { newDate?: string; editId?: string }) {
  const { uid } = useUserData();
  const nav = useNav();
  const toast = useToast();

  const [loaded, setLoaded] = useState(!editId);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shape, setShape] = useState<Shape | null>(null);
  const [amount, setAmount] = useState<Amount | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [dateStr, setDateStr] = useState(newDate ?? todayKey());
  // 最後に入力された正しい日付。入力欄を空にしている間も、ヘッダーと戻り先にはこれを使う
  const [validDate, setValidDate] = useState(newDate ?? todayKey());
  const [timeStr, setTimeStr] = useState(format(new Date(), "HH:mm"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  // 今日の記録として開いたか。開いたまま日付が変わっても、保存した時点の日付と時刻で記録する
  const [forToday] = useState(() => newDate === todayKey());
  const today = useToday();

  const back = () => nav.back(`/?d=${validDate}`);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    getStool(uid, editId)
      .then((s) => {
        if (!alive) return;
        if (!s) {
          setNotFound(true);
          return;
        }
        setShape(s.shape);
        setAmount(s.amount ?? null);
        setFeeling(s.feeling ?? null);
        setDateStr(toKey(s.occurredAt));
        setValidDate(toKey(s.occurredAt));
        setTimeStr(format(s.occurredAt, "HH:mm"));
        setLoaded(true);
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [uid, editId, attempt]);

  if (notFound) return <Navigate to="/" replace />;

  function occurredAt(): Date | null {
    if (!editId) return initialOccurredAt(forToday || !newDate ? todayKey() : newDate);
    const d = parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
    return isValid(d) ? d : null;
  }

  async function save() {
    if (busy || !shape) return;
    const at = occurredAt();
    if (!at) {
      setError("日時の形式が正しくありません");
      return;
    }
    if (isFuture(toKey(at))) {
      setError("未来の日付は記録できません");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = { occurredAt: at, shape, amount: amount ?? undefined, feeling: feeling ?? undefined };
      if (editId) await updateStool(uid, editId, input);
      else await createStool(uid, input);
      toast("記録しました");
      back();
    } catch (e) {
      setError(writeErrorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    if (!editId || busy) return;
    setBusy(true);
    try {
      await deleteStool(uid, editId);
      toast("削除しました");
      back();
    } catch (e) {
      setConfirm(false);
      setError(writeErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <Header
        left={
          <button type="button" className="lnk" onClick={back}>
            キャンセル
          </button>
        }
        title={<DateTitle date={newDate ? (forToday ? today : newDate) : validDate} />}
        right={
          editId ? (
            <button type="button" className="lnk" onClick={() => setConfirm(true)}>
              削除
            </button>
          ) : null
        }
      />
      <div className="paper">
        <div className="main pad">
          {!loaded ? (
            loadError ? (
              <ErrorRetry
                message="読み込めませんでした"
                onRetry={() => {
                  setLoadError(false);
                  setAttempt((n) => n + 1);
                }}
              />
            ) : (
              <Loading />
            )
          ) : (
            <>
              <div className="fl" id="lbl-shape">
                形状
              </div>
              <div className="chips" role="group" aria-labelledby="lbl-shape">
                {SHAPES.map((s) => {
                  const on = shape === s;
                  return (
                    <button key={s} type="button" className="chip shape" aria-pressed={on} onClick={() => setShape(s)}>
                      <StoolMark shape={s} size={26} />
                      {SHAPE_LABEL[s]}
                    </button>
                  );
                })}
              </div>

              <div className="fl">
                量 <small>（任意）</small>
              </div>
              <Segment
                options={AMOUNTS.map((a) => ({ value: a, label: AMOUNT_LABEL[a] }))}
                value={amount}
                onChange={setAmount}
                optional
                label="量"
              />

              <div className="fl">
                排便感 <small>（任意）</small>
              </div>
              <Segment
                options={FEELINGS.map((f) => ({ value: f, label: FEELING_LABEL[f] }))}
                value={feeling}
                onChange={setFeeling}
                optional
                label="排便感"
              />

              {editId && (
                <>
                  <div className="fl">日時</div>
                  <div className="dtrow">
                    <input
                      id="stool-date"
                      className="inp num"
                      type="date"
                      value={dateStr}
                      max={todayKey()}
                      onChange={(e) => {
                        setDateStr(e.target.value);
                        if (isDateKey(e.target.value)) setValidDate(e.target.value);
                      }}
                      aria-label="日付"
                    />
                    <input
                      id="stool-time"
                      className="inp num"
                      type="time"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      aria-label="時刻"
                    />
                  </div>
                </>
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
          <button type="button" className="btn pri" disabled={busy || !shape || !loaded} onClick={save}>
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
