import { useEffect, useState } from "react";
import { todayKey } from "@/lib/date";
import type { DateKey } from "@/lib/types";

/**
 * 今日の日付。アプリを開いたまま日付が変わっても、画面に戻ったときに更新する
 * （ホーム画面のアプリは、閉じずに翌日そのまま使われることがある）。
 * 記録する日付そのものは、操作した時点の todayKey() で決める。ここは表示用。
 */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) setToday(todayKey());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);
  return today;
}
