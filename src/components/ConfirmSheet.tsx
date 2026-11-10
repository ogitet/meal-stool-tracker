/** 削除の確認（Skeleton 2章）。「削除する」「やめる」の2択。 */
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
  return (
    <>
      <button type="button" className="dim" aria-label="閉じる" onClick={onCancel} disabled={busy} />
      <div className="sheet" role="alertdialog" aria-modal="true" aria-label={message}>
        <p>{message}</p>
        <button type="button" className="btn del" onClick={onConfirm} disabled={busy}>
          {busy ? "削除しています…" : confirmLabel}
        </button>
        <button type="button" className="btn plain" onClick={onCancel} disabled={busy}>
          やめる
        </button>
      </div>
    </>
  );
}
