import type { Meta, StoryObj } from "@storybook/react-vite";
import { SHAPE_LABEL, SHAPES } from "../lib/constants";
import { StoolMark } from "./StoolMark";

const meta = {
  title: "部品/便マーク",
  component: StoolMark,
  parameters: { layout: "centered" },
  args: { shape: "normal", size: 32 },
  argTypes: { shape: { control: "inline-radio", options: SHAPES } },
} satisfies Meta<typeof StoolMark>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

/** 4種を、カレンダー（18px）・月表示（14px）・記録画面（26px）の大きさで並べる。 */
export const AllShapes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 72px)", gap: 16, textAlign: "center" }}>
      {SHAPES.map((s) => (
        <div
          key={s}
          style={{ display: "grid", justifyItems: "center", gap: 6, background: "#fff", padding: 12, borderRadius: 12 }}
        >
          <StoolMark shape={s} size={26} />
          <StoolMark shape={s} size={18} />
          <StoolMark shape={s} size={14} />
          <span style={{ fontSize: 12 }}>{SHAPE_LABEL[s]}</span>
        </div>
      ))}
    </div>
  ),
};
