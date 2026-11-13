import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ConfirmSheet } from "./ConfirmSheet";
import { ErrorRetry, Loading } from "./Status";
import { useToast } from "./Toast";

const meta = {
  title: "部品/状態と通知",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const LoadingState: Story = { name: "読み込み中", render: () => <Loading /> };

export const ErrorState: Story = {
  name: "読み込みの失敗",
  render: () => <ErrorRetry message="読み込めませんでした" onRetry={fn()} />,
};

/** 削除の確認。「削除する」と「やめる」の2択。 */
export const Confirm: Story = {
  name: "削除の確認",
  render: () => (
    <ConfirmSheet message="この記録を削除しますか？" confirmLabel="削除する" onConfirm={fn()} onCancel={fn()} />
  ),
};

export const ConfirmBusy: Story = {
  name: "削除の確認（削除中）",
  render: () => (
    <ConfirmSheet message="この記録を削除しますか？" confirmLabel="削除する" busy onConfirm={fn()} onCancel={fn()} />
  ),
};

function ToastDemo() {
  const toast = useToast();
  const [n, setN] = useState(0);
  return (
    <div style={{ padding: 24 }}>
      <button
        type="button"
        className="btn pri"
        style={{ width: 200, flex: "none" }}
        onClick={() => {
          setN(n + 1);
          toast(n % 2 === 0 ? "記録しました" : "削除しました");
        }}
      >
        トーストを出す
      </button>
    </div>
  );
}

/** 保存・削除のあとに2秒だけ出る。 */
export const Toast: Story = { name: "トースト", render: () => <ToastDemo /> };
