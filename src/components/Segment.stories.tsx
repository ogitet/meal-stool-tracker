import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AMOUNT_LABEL, AMOUNTS, SLOT_LABEL, SLOTS } from "@/lib/constants";
import { Segment } from "./Segment";

const meta = {
  title: "部品/セグメント",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** 食事枠。必ずどれか1つを選ぶ。 */
export const Slot: Story = {
  render: () => {
    const [v, setV] = useState<string | null>("lunch");
    return (
      <div style={{ background: "#fff", padding: 12, borderRadius: 14 }}>
        <Segment
          className="slot"
          label="食事枠"
          options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))}
          value={v}
          onChange={(x) => x && setV(x)}
        />
      </div>
    );
  },
};

/** 量（任意）。選択中をもう一度押すと解除できる。 */
export const Optional: Story = {
  render: () => {
    const [v, setV] = useState<string | null>(null);
    return (
      <div style={{ background: "#fff", padding: 12, borderRadius: 14 }}>
        <Segment
          optional
          label="量"
          options={AMOUNTS.map((a) => ({ value: a, label: AMOUNT_LABEL[a] }))}
          value={v}
          onChange={setV}
        />
      </div>
    );
  },
};

/** カレンダーのヘッダーの「週／月」。 */
export const WeekMonth: Story = {
  render: () => {
    const [v, setV] = useState<string | null>("week");
    return (
      <Segment
        className="sm"
        label="表示の切替"
        options={[
          { value: "week", label: "週" },
          { value: "month", label: "月" },
        ]}
        value={v}
        onChange={(x) => x && setV(x)}
      />
    );
  },
};
