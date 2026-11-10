export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** 少数の択一（週／月、食事枠など）。optional=true なら選択中をもう一度押すと解除できる。 */
export function Segment<T extends string>({
  options,
  value,
  onChange,
  className = "",
  optional = false,
  label,
}: {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
  className?: string;
  optional?: boolean;
  label?: string;
}) {
  return (
    <div className={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on && optional ? null : o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
