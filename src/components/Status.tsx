export function Loading({ text = "読み込み中…" }: { text?: string }) {
  return <div className="status" role="status">{text}</div>;
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="status" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn out" onClick={onRetry}>
          再試行
        </button>
      )}
    </div>
  );
}
