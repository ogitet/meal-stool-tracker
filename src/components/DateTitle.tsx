import { fromKey, weekdayJa } from "../lib/date";
import type { DateKey } from "../lib/types";

/** ヘッダーの日付。数字は日めくりの数字、曜日は丸囲みで示す。 */
export function DateTitle({ date }: { date: DateKey }) {
  const d = fromKey(date);
  return (
    <span className="dtt" aria-label={`${d.getMonth() + 1}月${d.getDate()}日 ${weekdayJa(d)}曜日`}>
      <span className="d">{d.getMonth() + 1}</span>月<span className="d">{d.getDate()}</span>日
      <span className="wk">{weekdayJa(d)}</span>
    </span>
  );
}
