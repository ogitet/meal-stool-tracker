import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { StoolMark } from "@/components/StoolMark";
import { useStoolsInRange } from "@/demo/stools";
import { useNav } from "@/hooks/useNav";
import { useSwipe, type SwipeDir } from "@/hooks/useSwipe";
import { useToday } from "@/hooks/useToday";
import { SHAPE_LABEL } from "@/lib/constants";
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
} from "@/lib/habits";
import type { DateKey, HabitItem, Mark, Stool } from "@/lib/types";
import { ITEM_BY_ID, ITEMS, itemsOf, startDate, toggleMark, useMarks } from "./data";
import "./proto.css";

/** 印のインク色。今のカテゴリの色を借りる（パン＝主食、お菓子＝お菓子、運動＝野菜・果物）。 */
const INK: Record<string, string> = { bread: "g-staple", sweets: "g-sweets", exercise: "g-vegetable" };

const REDUCE_IDS = new Set(ITEMS.filter((i) => i.kind === "reduce").map((i) => i.id));

type Undo = { message: string; date: DateKey; itemId: string; on: boolean };

/**
 * 習慣カレンダーの試作（Scope 第2版 F-10、F-12〜F-14）。デモモードの /proto で開く。
 * ?v=b で、食べなかった日を塗らない見せ方に切り替える（見え方の比較用）。
 */
export function HabitCalendar() {
  const [params, setParams] = useSearchParams();
  const nav = useNav();
  const today = useToday();
  const marks = useMarks();
  const anchorKey = isDateKey(params.get("d") ?? undefined) ? (params.get("d") as DateKey) : todayKey();
  const anchor = useMemo(() => fromKey(anchorKey), [anchorKey]);
  const tint = params.get("v") !== "b";
  const [dir, setDir] = useState<SwipeDir | 0>(0);
  /** 開いているシート。"eat" は食べたものを選ぶシート、日付はその日のシート */
  const [sheet, setSheet] = useState<{ eat: true } | { date: DateKey } | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eaten = useMemo(() => new Set(marks.filter((m) => REDUCE_IDS.has(m.itemId)).map((m) => m.date)), [marks]);
  const done = useMemo(() => new Set(marks.filter((m) => !REDUCE_IDS.has(m.itemId)).map((m) => m.date)), [marks]);
  const byDate = useMemo(() => {
    const m = new Map<DateKey, Mark[]>();
    for (const mk of marks) m.set(mk.date, [...(m.get(mk.date) ?? []), mk]);
    return m;
  }, [marks]);

  function move(d: DateKey, n: SwipeDir | 0) {
    setDir(n);
    const p = new URLSearchParams(window.location.search);
    p.set("d", d);
    setParams(p, { replace: true });
  }
  function go(n: SwipeDir) {
    const cur = new URLSearchParams(window.location.search).get("d") ?? undefined;
    move(toKey(shiftMonth(fromKey(isDateKey(cur) ? cur : todayKey()), n)), n);
  }
  const swipe = useSwipe(go);

  function press(date: DateKey, item: HabitItem) {
    const on = toggleMark(date, item.id);
    const message = on ? `${item.name}を記録しました` : `${item.name}を取り消しました`;
    setUndo({ message, date, itemId: item.id, on });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), 4000);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const reduceItems = itemsOf("reduce");
  const exercise = itemsOf("keep")[0]!;
  const exercisedToday = done.has(today);

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
        <button
          type="button"
          className="pill"
          onClick={() => {
            const now = todayKey();
            move(now, now === anchorKey ? 0 : now > anchorKey ? 1 : -1);
          }}
        >
          今日
        </button>
      </header>

      <Numbers eaten={eaten} done={done} today={today} reduceItems={reduceItems} />

      <div className="main cal swipe hc-main" {...swipe.handlers}>
        <div
          className={`track${swipe.dx ? " dragging" : ""}`}
          style={swipe.dx ? { transform: `translateX(${swipe.dx * 0.35}px)` } : undefined}
        >
          <div key={anchorKey} className={`pager${dir === 1 ? " from-r" : dir === -1 ? " from-l" : ""}`}>
            <Month
              anchor={anchor}
              today={today}
              byDate={byDate}
              eaten={eaten}
              tint={tint}
              onOpen={(d) => setSheet({ date: d })}
            />
          </div>
        </div>
      </div>

      <nav className="bar cal hc-bar" aria-label="記録">
        <button type="button" className="btn rec hc-rec" onClick={() => setSheet({ eat: true })}>
          食べちゃった
        </button>
        <button
          type="button"
          className={`btn rec hc-rec${exercisedToday ? " done" : ""}`}
          aria-pressed={exercisedToday}
          onClick={() => press(todayKey(), exercise)}
        >
          {exercisedToday ? "運動した" : "運動する"}
        </button>
        <button
          type="button"
          className="btn rec hc-rec"
          onClick={() => nav.go(`/stool/new?date=${todayKey()}`, "open")}
        >
          便
        </button>
      </nav>

      {sheet && "eat" in sheet && (
        <Sheet label="何を食べた？" onClose={() => setSheet(null)}>
          <div className="hc-pick two">
            {reduceItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip c-${INK[item.id]!.slice(2)} hc-big`}
                aria-pressed={hasOn(byDate, today, item.id)}
                onClick={() => {
                  press(todayKey(), item);
                  setSheet(null);
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </Sheet>
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

      {undo && (
        <div className="hc-toast" role="status">
          <span>{undo.message}</span>
          <button
            type="button"
            onClick={() => {
              toggleMark(undo.date, undo.itemId);
              setUndo(null);
            }}
          >
            {undo.on ? "取り消す" : "元に戻す"}
          </button>
        </div>
      )}
    </div>
  );
}

function hasOn(byDate: Map<DateKey, Mark[]>, date: DateKey, itemId: string): boolean {
  return (byDate.get(date) ?? []).some((m) => m.itemId === itemId);
}

/** 先月との比較の見出し（Scope 第2版 Q61）。「先月26日まで」、先月に同じ日がなければ「先月末まで」。 */
function lastLabel(today: DateKey): string {
  const t = fromKey(today);
  const lastEnd = new Date(t.getFullYear(), t.getMonth(), 0).getDate();
  return t.getDate() >= lastEnd ? "先月末まで" : `先月${t.getDate()}日まで`;
}

/** 上部の数字（Scope 第2版 F-14）。表示中の月によらず、今日の時点の数字を示す。 */
function Numbers({
  eaten,
  done,
  today,
  reduceItems,
}: {
  eaten: Set<DateKey>;
  done: Set<DateKey>;
  today: DateKey;
  reduceItems: HabitItem[];
}) {
  const start = startDate();
  const month = countThisMonth(eaten, today);
  const last = countLastMonthSoFar(eaten, today);
  const clean = cleanStreak(eaten, start, today);
  const best = bestCleanStreak(eaten, start, today);
  const streak = doneStreak(done, today);
  return (
    <section className="hc-nums" aria-label="今日の時点の数字">
      <div className="hc-card">
        <h2>{reduceItems.map((i) => i.name).join("・")}</h2>
        <p className="hc-big-n">
          <span className="num">{month}</span>
          <small>日</small>
          <span className="hc-cap">今月食べた</span>
        </p>
        <p className="hc-sub">
          {lastLabel(today)} <b className="num">{last}</b>日
        </p>
        <p className="hc-sub">
          食べずに <b className="num">{clean}</b>日・ベスト <b className="num">{best}</b>日
        </p>
      </div>
      <div className="hc-card">
        <h2>運動</h2>
        <p className="hc-big-n">
          <span className="num">{streak}</span>
          <small>日</small>
          <span className="hc-cap">連続</span>
        </p>
        <p className="hc-sub">
          ベスト <b className="num">{bestDoneStreak(done)}</b>日
        </p>
        <p className="hc-sub">
          今月 <b className="num">{countThisMonth(done, today)}</b>日
        </p>
      </div>
    </section>
  );
}

function Month({
  anchor,
  today,
  byDate,
  eaten,
  tint,
  onOpen,
}: {
  anchor: Date;
  today: DateKey;
  byDate: Map<DateKey, Mark[]>;
  eaten: Set<DateKey>;
  tint: boolean;
  onOpen: (d: DateKey) => void;
}) {
  const { start, end } = monthRange(anchor);
  const stools = useStoolsInRange("demo", start, end);
  const stoolsBy = useMemo(() => {
    const m = new Map<DateKey, Stool[]>();
    for (const s of stools.items) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [stools.items]);
  const from = startDate();

  return (
    <>
      <div className="mwd" aria-hidden="true">
        {["月", "火", "水", "木", "金", "土", "日"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className={`mgrid hc-grid${tint ? " tint" : ""}`}>
        {monthGrid(anchor).map((d) => {
          const key = toKey(d);
          const future = isFuture(key);
          const items = (byDate.get(key) ?? [])
            .map((m) => ITEM_BY_ID.get(m.itemId))
            .filter((i): i is HabitItem => !!i)
            .sort((a, b) => a.order - b.order);
          const food = items.filter((i) => i.kind === "reduce");
          const keep = items.filter((i) => i.kind === "keep");
          const dayStools = stoolsBy.get(key) ?? [];
          const shown = dayStools.slice(0, 3);
          const clean = !future && key >= from && key < today && !eaten.has(key);
          const cls = [
            "mc hc-c",
            key === today ? "today" : "",
            isSameMonth(d, anchor) ? "" : "om",
            future ? "future" : "",
            clean ? "clean" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const label = [
            `${d.getMonth() + 1}月${d.getDate()}日`,
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
              <span className="hc-top">
                <span className="md">{d.getDate()}</span>
                {keep.map((i) => (
                  <span key={i.id} className={`hc-ex ${INK[i.id]}`}>
                    {i.abbr}
                  </span>
                ))}
              </span>
              <span className="hc-food">
                {food.map((i) => (
                  <span key={i.id} className={`t hc-t ${INK[i.id]}`}>
                    {i.abbr}
                  </span>
                ))}
              </span>
              <span className="hc-stl">
                {shown.map((s) => (
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

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <button type="button" className="dim" aria-label="閉じる" tabIndex={-1} onClick={onClose} />
      <div
        className="sheet hc-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
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

/** 日別の確認と、過去の日への記録・取り消し（Scope 第2版 F-05）。 */
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
  const stools = useStoolsInRange("demo", date, date);
  return (
    <Sheet label={formatDayJa(date)} onClose={onClose}>
      <div className="hc-pick">
        {ITEMS.filter((i) => i.active).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip c-${INK[item.id]!.slice(2)}`}
            aria-pressed={hasOn(byDate, date, item.id)}
            onClick={() => onPress(date, item)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <ul className="hc-stools">
        {stools.items.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onStool(`/stool/${s.id}`)}>
              <span className="num">{formatTime(s.occurredAt)}</span>
              <StoolMark shape={s.shape} size={16} />
              {SHAPE_LABEL[s.shape]}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn out" onClick={() => onStool(`/stool/new?date=${date}`)}>
        ＋ 便を追加
      </button>
    </Sheet>
  );
}
