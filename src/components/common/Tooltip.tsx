import { useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { T } from '@/lib/tr';

/** Тултип с пояснением (иконка ℹ). Работает по hover/focus. */
export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-ink-faint hover:text-gold-soft transition"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={T('Пояснение')}
      >
        {children ?? <Info size={14} />}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-64 sm:w-72 px-3 py-2.5 rounded-xl bg-cellar-deep border border-hairline text-[12px] leading-relaxed text-ink-dim shadow-cellar text-left"
        >
          {T(text)}
        </span>
      )}
    </span>
  );
}
