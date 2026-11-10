import type { ReactNode } from "react";

export function Header({ left, title, right }: { left?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <header className="hd">
      <div className="hd-l">{left}</div>
      <h1 className="hd-c" style={{ margin: 0 }}>{title}</h1>
      <div className="hd-r">{right}</div>
    </header>
  );
}
