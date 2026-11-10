import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * 「開始した画面に戻る」（Structure 5章）。
 * 履歴があれば1つ戻り、直接開かれた場合は fallback に置き換える。
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    const idx = (location.state as { idx?: number } | null)?.idx ?? (window.history.state?.idx as number | undefined);
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, location.state, fallback]);
}
