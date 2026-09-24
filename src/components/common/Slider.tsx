/** Слайдер 0–10 с моноширинным значением. Зона клика ≥44px. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  hintLeft,
  hintRight,
  accent = '#c59b4e',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hintLeft?: string;
  hintRight?: string;
  accent?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="pb-4 mb-4 border-b border-hairline/60 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[13px] font-semibold tracking-wide text-ink">{label}</span>
        <span className="tnum text-lg font-bold" style={{ color: accent }}>
          {value.toFixed(step < 1 ? 1 : 0)}
        </span>
      </div>
      <input
        type="range"
        className="sommelier-range"
        style={{ ['--fill' as string]: `${pct}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {(hintLeft || hintRight) && (
        <div className="flex justify-between text-[11px] text-ink-faint -mt-1.5">
          <span>{hintLeft}</span>
          <span>{hintRight}</span>
        </div>
      )}
    </div>
  );
}
