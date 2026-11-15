import type { Meta, StoryObj } from "@storybook/react-vite";
import { toKey } from "@/lib/date";
import { DateTitle } from "./DateTitle";
import { Header } from "./Header";

const meta = {
  title: "部品/ヘッダー",
  component: Header,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Header>;
export default meta;
type Story = StoryObj<typeof meta>;

const back = (
  <button type="button" className="lnk">
    ‹ 戻る
  </button>
);

/** 日別詳細・記録画面のヘッダー。数字を大きく、曜日を丸囲みで組む。 */
export const WithDate: Story = {
  args: { left: back, title: <DateTitle date={toKey(new Date())} /> },
};

export const EditWithDelete: Story = {
  args: {
    left: (
      <button type="button" className="lnk">
        キャンセル
      </button>
    ),
    title: <DateTitle date={toKey(new Date())} />,
    right: (
      <button type="button" className="lnk">
        削除
      </button>
    ),
  },
};

export const TextTitle: Story = { args: { left: back, title: "カテゴリ管理" } };
