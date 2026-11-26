import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** 知らせに添える操作（取り消すなど）。 */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

type Show = (message: string, action?: ToastAction) => void;
const ToastContext = createContext<Show>(() => {});

/** 知らせを示す時間。操作付きは、気づいてから押せるよう長くする（Structure Q69）。 */
const PLAIN_MS = 2000;
const ACTION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; action?: ToastAction; seq: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback<Show>((message, action) => {
    seq.current += 1;
    setToast({ message, action, seq: seq.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), action ? ACTION_MS : PLAIN_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.seq} className={`toast${toast.action ? " act" : ""}`} role="status">
          {toast.message}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                hide();
                toast.action?.onClick();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): Show {
  return useContext(ToastContext);
}
