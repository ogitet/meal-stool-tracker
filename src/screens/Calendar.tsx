import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorRetry } from "@/components/Status";
import { StoolMark } from "@/components/StoolMark";
import { useToast } from "@/components/Toast";
import { setMark } from "@/data/habits";
import { useStoolsInRange } from "@/data/stools";
import { useUserData } from "@/data/UserDataContext";
import { useNav } from "@/hooks/useNav";
import { useSwipe, type SwipeDir } from "@/hooks/useSwipe";
import { useToday } from "@/hooks/useToday";
import { AMOUNT_LABEL, FEELING_LABEL, SHAPE_LABEL } from "@/lib/constants";
import {
  formatDayJa,
  formatMonthJa,
  formatTime,
  fromKey,
  isDateKey,
  isFuture,
  isSameMonth,
  monthGrid,
  monthRange,
  shiftMonth,
  todayKey,
  toKey,
} from "@/lib/date";
import {
  bestCleanStreak,
  bestDoneStreak,
  cleanStreak,
  countLastMonthSoFar,
  countThisMonth,
  doneStreak,
  lastMonthLabel,
} from "@/lib/habits";
import { inkOf } from "@/lib/items";
import type { DateKey, HabitItem, Mark, Stool } from "@/lib/types";

type Sheet = { kind: "reduce" | "keep" } | { date: DateKey } | null;

/**
 * S-02 カレンダー（Structure 第2版）。月の表示、上部の数字、記録の開始。
 * 表示する月は URL（?d= その月のいずれかの日）に持ち、便の記録から戻ったときに同じ月を示す。
 */
export function Calendar() {
  const [params, setParams] = useSearchParams();
  const nav = useNav();
  const toast = useToast();
  const { uid, habits } = useUserData();
  const anchorKey = isDateKey(params.get("d") ?? undefined) ? (params.get("d") as DateKey) : todayKey();
  const anchor = useMemo(() => fromKey(anchorKey), [anchorKey]);
  const [retry, setRetry] = useState(0);
  // 月を送った向き。新しい月をその向きから入れる（0 は動きなし）
  const [dir, setDir] = useState<SwipeDir | 0>(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  // 表示用の今日。記録する日付は、押した時点の todayKey() で決める（開いたまま日付が変わることがあるため）
  const today = useToday();

  const byDate = useMemo(() => {
    const m = new Map<DateKey, Mark[]>();
    for (const mk of habits.marks) m.set(mk.date, [...(m.get(mk.date) ?? []), mk]);
    return m;
  }, [habits.marks]);

  // 初版の食事記録を引き継いだら知らせる（Structure Q68）
  useEffect(() => {
    if (habits.migratedDays) toast(`これまでの記録から ${habits.migratedDays}日分を引き継ぎました`);
  }, [habits.migratedDays, toast]);

  /** いまの URL の基準日。描画時の値は、続けて操作すると再描画の前で古いことがあるため使わない。 */
  function currentKey(): DateKey {
    const d = new URLSearchParams(window.location.search).get("d") ?? undefined;
    return isDateKey(d) ? d : todayKey();
  }
  function move(d: DateKey, n: SwipeDir | 0) {
    setDir(n);
    const p = new URLSearchParams(window.location.search);
    p.set("d", d);
    setParams(p, { replace: true });
  }
  function go(n: SwipeDir) {
    move(toKey(shiftMonth(fromKey(currentKey()), n)), n);
  }
  function goToday() {
    const cur = currentKey();
    const now = todayKey();
    move(now, isSameMonth(fromKey(now), fromKey(cur)) ? 0 : now > cur ? 1 : -1);
  }
  const swipe = useSwipe(go);

  /** 押す・取り消す。取り消せる知らせを出す（Scope Q53、Structure Q69）。 */
  function press(date: DateKey, item: HabitItem) {
    const on = !hasMark(byDate, date, item.id);
    setMark(uid, date, item.id, on);
    toast(on ? `${item.name}を記録しました` : `${item.name}を取り消しました`, {
      label: on ? "取り消す" : "元に戻す",
      onClick: () => setMark(uid, date, item.id, !on),
    });
  }

  const reduceItems = habits.active.filter((i) => i.kind === "reduce");
  const keepItems = habits.active.filter((i) => i.kind === "keep");
  const keepDoneToday = keepItems.some((i) => hasMark(byDate, today, i.id));

  return (
    <div className="screen">
      <header className="hd cal-hd">
        <div className="nav">
          <button type="button" className="arw" aria-label="前の月" onClick={() => go(-1)}>
            ‹
          </button>
          <h1 className="rng" aria-label={formatMonthJa(anchor)}>
            {anchor.getFullYear()}
            <span className="u">年</span>
            {anchor.getMonth() + 1}
            <span className="u">月</span>
          </h1>
          <button type="button" className="arw" aria-label="次の月" onClick={() => go(1)}>
            ›
          </button>
        </div>
        <button type="button" className="pill" onClick={goToday}>
          今日
        </button>
        <button type="button" className="ico" aria-label="項目管理" onClick={() => nav.go("/items", "push")}>
          <svg width="22" height="22" viewBox="0 0 24 24">
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

      {habits.error ? (
        <div className="main cal">
          <ErrorRetry message={habits.error} onRetry={habits.retry} />
        </div>
      ) : (
        <>
          <Numbers today={today} />
          <div className="main cal swipe" {...swipe.handlers}>
            <div
              className={`track${swipe.dx ? " dragging" : ""}`}
              style={swipe.dx ? { transform: `translateX(${swipe.dx * 0.35}px)` } : undefined}
            >
              <div
                key={`${anchorKey}${retry}`}
                className={`pager${dir === 1 ? " from-r" : dir === -1 ? " from-l" : ""}`}
              >
                <MonthView
                  anchor={anchor}
                  today={today}
                  byDate={byDate}
                  onOpen={(date) => setSheet({ date })}
                  onRetry={() => setRetry((n) => n + 1)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="bar cal" aria-label="記録">
        {reduceItems.length > 0 && (
          <button type="button" className="btn rec" onClick={() => setSheet({ kind: "reduce" })}>
            食べちゃった
          </button>
        )}
        {keepItems.length > 0 && (
          <button
            type="button"
            className={`btn rec${keepDoneToday ? " done" : ""}`}
            aria-pressed={keepDoneToday}
            onClick={() => (keepItems.length === 1 ? press(todayKey(), keepItems[0]!) : setSheet({ kind: "keep" }))}
          >
            {keepItems.length === 1 ? `${keepItems[0]!.name}${keepDoneToday ? "した" : "する"}` : "できた"}
          </button>
        )}
        <button type="button" className="btn rec" onClick={() => nav.go(`/stool/new?date=${todayKey()}`, "open")}>
          便
        </button>
      </nav>

      {sheet && "kind" in sheet && (
        <PickSheet
          label={sheet.kind === "reduce" ? "何を食べた？" : "何をやった？"}
          items={sheet.kind === "reduce" ? reduceItems : keepItems}
          date={today}
          byDate={byDate}
          onPress={(item) => {
            press(todayKey(), item);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet && "date" in sheet && (
        <DaySheet
          date={sheet.date}
          byDate={byDate}
          onPress={press}
          onClose={() => setSheet(null)}
          onStool={(path) => {
            setSheet(null);
            nav.go(path, "open");
          }}
        />
      )}
    </div>
  );
}

function hasMark(byDate: Map<DateKey, Mark[]>, date: DateKey, itemId: string): boolean {
  return (byDate.get(date) ?? []).some((m) => m.itemId === itemId);
}

/** 上部の数字（Scope F-14）。表示中の月によらず、今日の時点の数字を示す（Structure Q65）。 */
function Numbers({ today }: { today: DateKey }) {
  const { habits } = useUserData();
  const kindOf = useMemo(() => new Map(habits.all.map((i) => [i.id, i.kind])), [habits.all]);
  const eaten = useMemo(
    () => new Set(habits.marks.filter((m) => kindOf.get(m.itemId) === "reduce").map((m) => m.date)),
    [habits.marks, kindOf],
  );
  const done = useMemo(
    () => new Set(habits.marks.filter((m) => kindOf.get(m.itemId) === "keep").map((m) => m.date)),
    [habits.marks, kindOf],
  );
  const reduce = habits.active.filter((i) => i.kind === "reduce");
  const keep = habits.active.filter((i) => i.kind === "keep");

  if (habits.loading) return <section className="nums" aria-busy="true" />;
  return (
    <section className="nums" aria-label="今日の時点の数字">
      {reduce.length > 0 && (
        <div className="ncard">
          <h2>{reduce.map((i) => i.name).join("・")}</h2>
          <p className="nbig">
            <span className="num">{countThisMonth(eaten, today)}</span>
            <small>日</small>
            <span className="cap">今月食べた</span>
          </p>
          <p className="nsub">
            {lastMonthLabel(today)} <b className="num">{countLastMonthSoFar(eaten, today)}</b>日
          </p>
          <p className="nsub">
            食べずに <b className="num">{cleanStreak(eaten, habits.startDate, today)}</b>日・ベスト{" "}
            <b className="num">{bestCleanStreak(eaten, habits.startDate, today)}</b>日
          </p>
        </div>
      )}
      {keep.length > 0 && (
        <div className="ncard">
          <h2>{keep.map((i) => i.name).join("・")}</h2>
          <p className="nbig">
            <span className="num">{doneStreak(done, today)}</span>
            <small>日</small>
            <span className="cap">連続</span>
          </p>
          <p className="nsub">
            ベスト <b className="num">{bestDoneStreak(done)}</b>日
          </p>
          <p className="nsub">
            今月 <b className="num">{countThisMonth(done, today)}</b>日
          </p>
        </div>
      )}
    </section>
  );
}

function MonthView({
  anchor,
  today,
  byDate,
  onOpen,
  onRetry,
}: {
  anchor: Date;
  today: DateKey;
  byDate: Map<DateKey, Mark[]>;
  onOpen: (date: DateKey) => void;
  onRetry: () => void;
}) {
  const { uid, habits } = useUserData();
  const { start, end } = monthRange(anchor);
  const stools = useStoolsInRange(uid, start, end);
  const stoolsBy = useMemo(() => {
    const m = new Map<DateKey, Stool[]>();
    for (const s of stools.items) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [stools.items]);

  if (stools.error) return <ErrorRetry message={stools.error} onRetry={onRetry} />;

  return (
    <>
      <div className="mwd" aria-hidden="true">
        {["月", "火", "水", "木", "金", "土", "日"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mgrid" aria-busy={stools.loading || habits.loading}>
        {monthGrid(anchor).map((d) => {
          const key = toKey(d);
          const future = isFuture(key);
          // 「使わない」項目も、過去の記録にあれば示す（Scope Q58）
          const items = (byDate.get(key) ?? [])
            .map((m) => habits.byId.get(m.itemId))
            .filter((i): i is HabitItem => !!i);
          const food = items.filter((i) => i.kind === "reduce").sort((a, b) => a.order - b.order);
          const keep = items.filter((i) => i.kind === "keep").sort((a, b) => a.order - b.order);
          const dayStools = stoolsBy.get(key) ?? [];
          // 食べなかった日：起点日以降の過去の日。今日は途中として塗らない（Structure Q66）
          const clean = !habits.loading && key >= habits.startDate && key < today && food.length === 0;
          const cls = [
            "mc",
            key === today ? "today" : "",
            isSameMonth(d, anchor) ? "" : "om",
            future ? "future" : "",
            clean ? "clean" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const label = [
            `${d.getMonth() + 1}月${d.getDate()}日`,
            key === today ? "今日" : "",
            ...food.map((i) => i.name),
            ...keep.map((i) => i.name),
            dayStools.length ? `便${dayStools.length}回` : "",
            clean ? "食べなかった日" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={cls}
              disabled={future}
              aria-current={key === today ? "date" : undefined}
              aria-label={label}
              onClick={() => onOpen(key)}
            >
              <span className="mtop">
                <span className="md">{d.getDate()}</span>
                {keep.slice(0, 1).map((i) => (
                  <span key={i.id} className={`mex g-${inkOf(i, habits.all)}`}>
                    {i.abbr}
                  </span>
                ))}
              </span>
              <span className={`mfood${food.length > 2 ? " many" : ""}`}>
                {food.map((i, n) => (
                  <span key={i.id} className={`t g-${inkOf(i, habits.all)}`} style={{ "--i": n } as CSSProperties}>
                    {i.abbr}
                  </span>
                ))}
              </span>
              <span className="mm">
                {dayStools.slice(0, 3).map((s) => (
                  <StoolMark key={s.id} shape={s.shape} size={11} />
                ))}
                {dayStools.length > 3 && <span className="more">+{dayStools.length - 3}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** 下からのシート。開いたらシートにフォーカスを移し、閉じたら元の位置に戻す。Esc で閉じる。 */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <>
      {/* 「閉じる」と同じ働きなので、キーボードの移動先からは外す */}
      <button type="button" className="dim" aria-label="閉じる" tabIndex={-1} onClick={onClose} />
      <div
        ref={ref}
        className="sheet pick"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <p>{label}</p>
        {children}
        <button type="button" className="btn plain" onClick={onClose}>
          閉じる
        </button>
      </div>
    </>
  );
}

/** S-10 食べたものを選ぶ。選んだ時点で記録して閉じる（Structure Q64）。 */
function PickSheet({
  label,
  items,
  date,
  byDate,
  onPress,
  onClose,
}: {
  label: string;
  items: HabitItem[];
  date: DateKey;
  byDate: Map<DateKey, Mark[]>;
  onPress: (item: HabitItem) => void;
  onClose: () => void;
}) {
  const { habits } = useUserData();
  return (
    <Sheet label={label} onClose={onClose}>
      <div className="picks two">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip big c-${inkOf(item, habits.all)}`}
            aria-pressed={hasMark(byDate, date, item.id)}
            onClick={() => onPress(item)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** S-03 日別シート。その日の記録・取り消しと、便の一覧（Structure 7章）。 */
function DaySheet({
  date,
  byDate,
  onPress,
  onClose,
  onStool,
}: {
  date: DateKey;
  byDate: Map<DateKey, Mark[]>;
  onPress: (date: DateKey, item: HabitItem) => void;
  onClose: () => void;
  onStool: (path: string) => void;
}) {
  const { uid, habits } = useUserData();
  const stools = useStoolsInRange(uid, date, date);
  const marks = byDate.get(date) ?? [];
  // 「使う」項目と、その日に記録がある「使わない」項目
  const items = habits.all.filter((i) => i.active || marks.some((m) => m.itemId === i.id));
  const pending = marks.some((m) => m.pending);

  return (
    <Sheet label={formatDayJa(date)} onClose={onClose}>
      <div className="picks">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip c-${inkOf(item, habits.all)}`}
            aria-pressed={hasMark(byDate, date, item.id)}
            onClick={() => onPress(date, item)}
          >
            {item.name}
          </button>
        ))}
      </div>
      {pending && <span className="uns">未同期の記録があります</span>}
      {stools.error ? (
        <span className="muted">{stools.error}</span>
      ) : (
        <ul className="dstools">
          {stools.items.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onStool(`/stool/${s.id}`)}>
                <span className="tm">{formatTime(s.occurredAt)}</span>
                <StoolMark shape={s.shape} size={18} />
                <span>
                  {[SHAPE_LABEL[s.shape], s.amount && AMOUNT_LABEL[s.amount], s.feeling && FEELING_LABEL[s.feeling]]
                    .filter(Boolean)
                    .join("・")}
                </span>
                {s.pending && <span className="uns">未同期</span>}
                <span className="chev" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn out" onClick={() => onStool(`/stool/new?date=${date}`)}>
        ＋ 便を追加
      </button>
    </Sheet>
  );
}
