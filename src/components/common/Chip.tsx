import type { ReactNode } from 'react';
import { vibrate } from '@/lib/haptics';
import { scaleOptionLabel, useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/** Один чип выбора. Минимальная зона клика — 44px по высоте. */
export function Chip({
  active,
  onClick,
  children,
  tone = 'gold',
  title,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: 'gold' | 'sage' | 'garnet';
  title?: string;
  /** Заблокирован движком (например, порок запрещает качество выше Acceptable). */
  disabled?: boolean;
}) {
  const tones = {
    gold: 'border-gold bg-gold/15 text-gold-soft',
    sage: 'border-sage bg-sage/15 text-sage-juicy',
    garnet: 'border-garnet bg-garnet/20 text-[#e8b3ac]',
  } as const;
  const idle = 'border-hairline bg-surface text-ink-dim hover:text-ink hover:border-[#4a6350]';
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      disabled={disabled}
      className={`min-h-[44px] px-3.5 rounded-xl text-sm border transition-all duration-150 whitespace-nowrap ${
        disabled
          ? 'border-hairline/60 bg-surface/40 text-ink-faint/50 cursor-not-allowed line-through decoration-ink-faint/40'
          : `active:scale-[0.96] ${active ? `${tones[tone]} font-semibold shadow-[0_0_0_1px_rgba(197,155,78,0.25)]` : idle}`
      }`}
      onClick={() => {
        if (disabled) return;
        vibrate(6);
        onClick();
      }}
    >
      {children}
    </button>
  );
}

/** Группа взаимоисключающих чипов. `value` — null-able. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  tone = 'gold',
  allowNone = true,
}: {
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  value: T | null;
  onChange: (v: T | null) => void;
  tone?: 'gold' | 'sage' | 'garnet';
  allowNone?: boolean;
}) {
  const { lang } = useLang();
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => (
        <Chip
          key={o.value}
          active={value === o.value}
          tone={tone}
          title={o.hint ? T(o.hint) : undefined}
          disabled={o.disabled}
          onClick={() => {
            const next = value === o.value && allowNone ? null : o.value;
            onChange(next);
          }}
        >
          {scaleOptionLabel(lang, o)}
        </Chip>
      ))}
    </div>
  );
}

/** Строка шкалы: подпись + группа чипов. Рабочая лошадка секций SAT. */
export function ScaleRow<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  tone = 'gold',
  badge,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  value: T | null;
  onChange: (v: T | null) => void;
  tone?: 'gold' | 'sage' | 'garnet';
  badge?: ReactNode;
}) {
  return (
    <div className="pb-4 mb-4 border-b border-hairline/60 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold tracking-wide text-ink">{T(label)}</span>
          {hint ? <span className="text-[11px] text-ink-faint">{T(hint)}</span> : null}
        </div>
        {badge}
      </div>
      <ChipGroup options={options} value={value} onChange={onChange} tone={tone} />
    </div>
  );
}
