/**
 * CleanSensoryRail (ТЗ v4 §1) — универсальная минималистичная шкала SAT.
 *
 * Единая лаконичная рейка для «Глаза», «Носа» и «Рта»:
 *  • ровные кнопки без визуального мусора внутри (подсказки — снаружи);
 *  • физиологический ориентир (cue) — строго ОДНА строка под рейкой
 *    и ТОЛЬКО при активном выборе;
 *  • «ℹ︎ Шпаргалка» раскрывается инлайн-аккордеоном прямо под блоком
 *    (ТЗ §6: никаких всплывающих модалок по центру экрана).
 */
import { useState, type ReactNode } from 'react';
import { vibrate } from '@/lib/haptics';
import { scaleOptionLabel, useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

export interface RailOption<T extends string> {
  value: T;
  label: string;
}

const TONE_SELECTED: Record<'gold' | 'sage' | 'garnet', string> = {
  gold: 'bg-gold/20 border border-gold text-gold-soft font-bold',
  sage: 'bg-sage/15 border border-sage text-sage-juicy font-bold',
  garnet: 'bg-garnet/20 border border-garnet text-[#e8b3ac] font-bold',
};

/** Кнопка-триггер инлайн-шпаргалки (единый стиль для всех аккордеонов). */
export function GuideToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        vibrate(5);
        onClick();
      }}
      className="shrink-0 text-[10.5px] px-2 py-1 rounded border border-hairline bg-surface/50 text-gold-soft/80 hover:text-gold-soft hover:border-gold/50 transition"
    >
      {open ? T('▲ Скрыть') : T('ℹ︎ Шпаргалка')}
    </button>
  );
}

/** Панель инлайн-шпаргалки (аккордеон под конкретным блоком). */
export function GuidePanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rise-in p-3 rounded-xl border border-hairline bg-surface/90 text-xs text-ink-dim leading-relaxed ${className}`}>
      {children}
    </div>
  );
}

/** Секционный аккордеон-шпаргалка: кнопка + панель под блоком, где нажали. */
export function InlineGuideToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <GuideToggle open={open} onClick={() => setOpen(!open)} />
      {open && <GuidePanel className="mt-2">{children}</GuidePanel>}
    </div>
  );
}

/** Универсальная рейка SAT: label + опции сеткой + cue-строка + шпаргалка. */
export function CleanSensoryRail<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  cues = {},
  guideContent,
  tone = 'gold',
}: {
  label: string;
  hint?: string;
  options: readonly RailOption<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
  /** Однострочные физиологические маркеры — только при активном выборе. */
  cues?: Partial<Record<T, string>>;
  /** Инлайн-шпаргалка под рейкой (аккордеон, без модалок). */
  guideContent?: ReactNode;
  /** Цветовая тональность выбранной кнопки. */
  tone?: 'gold' | 'sage' | 'garnet';
}) {
  const [openGuide, setOpenGuide] = useState(false);
  const activeCue = value ? cues[value] : null;
  const { lang } = useLang();

  return (
    <div className="pb-3.5 mb-3.5 border-b border-hairline/60 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-ink">{T(label)}</span>
          {hint && <span className="text-[11px] text-ink-faint hidden sm:inline">{T(hint)}</span>}
        </div>
        {guideContent && <GuideToggle open={openGuide} onClick={() => setOpenGuide(!openGuide)} />}
      </div>

      {openGuide && guideContent && <GuidePanel className="mb-2">{guideContent}</GuidePanel>}

      {/* Мобильный расклад (<640px): flex-wrap — кнопки держат натуральную
          ширину подписи (min-w-max) и переносятся на новую строку, а не
          наезжают друг на друга (урок релиза v5.1: «РазвиваетсяРаскрылось»).
          sm+: классическая ровная сетка repeat(N, 1fr). */}
      <div
        className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-cellar-deep border border-hairline sm:grid"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                vibrate(6);
                onChange(isSelected ? null : opt.value);
              }}
              aria-pressed={isSelected}
              className={`flex-1 min-w-max min-h-[38px] rounded-lg text-xs transition-all duration-150 active:scale-95 flex items-center justify-center px-2 leading-tight whitespace-nowrap ${
                isSelected ? TONE_SELECTED[tone] ?? TONE_SELECTED.gold : 'text-ink-dim hover:text-ink hover:bg-surface-2 border border-transparent'
              }`}
            >
              {scaleOptionLabel(lang, opt)}
            </button>
          );
        })}
      </div>

      {activeCue && (
        <p className="rise-in text-[11px] text-gold-soft/90 mt-1.5 px-1 leading-tight">⚡︎ {T(activeCue)}</p>
      )}
    </div>
  );
}
