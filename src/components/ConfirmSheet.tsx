import { useEffect, useRef, type KeyboardEvent } from "react";

/**
 * 削除の確認（Skeleton 2章）。「削除する」「やめる」の2択。
 * 開いたら「やめる」にフォーカスを移し、閉じたら元の位置に戻す。Esc でやめる。Tab は2つのボタンの間だけを移る。
 */
export function ConfirmSheet({
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!busy) onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
    }
  }

  return (
    <>
      {/* 「やめる」と同じ働きなので、キーボードの移動先からは外す */}
      <button type="button" className="dim" aria-label="閉じる" tabIndex={-1} onClick={onCancel} disabled={busy} />
      <div className="sheet" role="alertdialog" aria-modal="true" aria-label={message} onKeyDown={onKeyDown}>
        <p>{message}</p>
        <button ref={confirmRef} type="button" className="btn del" onClick={onConfirm} disabled={busy}>
          {busy ? "削除しています…" : confirmLabel}
        </button>
        <button ref={cancelRef} type="button" className="btn plain" onClick={onCancel} disabled={busy}>
          やめる
        </button>
      </div>
    </>
  );
}
