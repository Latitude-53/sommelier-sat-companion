import { CORE_OPTIONS_ANY, RIM_OPTIONS_ANY, WINE_COLOR_PALETTES, type WineColorOption } from '@/lib/catalog';
import type { WineStyle } from '@/types/wset';
import { vibrate } from '@/lib/haptics';
import { T } from '@/lib/tr';

/**
 * Селекторы «Цвет ядра» и «Цвет каймы» в виде кнопок-чипов с цветной
 * точкой-индикатором. Палитра строго зависит от цвет-основы вина:
 * дегустируя красное, сомелье не видит лимонно-зелёных и лососевых вариантов.
 * Пока стиль не выбран в Паспорте — показывается полная палитра с подсказкой.
 */

function ColorChipRow({
  options,
  activeHex,
  onPick,
}: {
  options: WineColorOption[];
  activeHex: string | null;
  onPick: (opt: WineColorOption) => void;
}) {
  const active = activeHex
    ? options.find((o) => o.hex.toLowerCase() === activeHex.toLowerCase()) ?? null
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = active?.id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.hint ? T(opt.hint) : undefined}
              aria-pressed={isActive}
              onClick={() => {
                vibrate(8);
                onPick(opt);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] border flex items-center gap-2 transition-all active:scale-[0.97] whitespace-nowrap ${
                isActive
                  ? 'border-gold bg-gold/15 text-gold-soft font-semibold shadow-[0_0_0_1px_rgba(197,155,78,0.25)]'
                  : 'border-hairline bg-surface text-ink-dim hover:text-ink hover:border-[#4a6350]'
              }`}
            >
              <span
                aria-hidden
                className="w-3 h-3 rounded-full shrink-0 border border-black/40 shadow-sm"
                style={{ backgroundColor: opt.hex }}
              />
              {T(opt.label)}
            </button>
          );
        })}
      </div>
      {active && (
        <p className="text-[11px] text-ink-faint mt-1.5 leading-snug">{active.hint ? T(active.hint) : ''}</p>
      )}
    </div>
  );
}

export function WineColorControls({
  style,
  coreHex,
  rimHex,
  onCore,
  onRim,
}: {
  /** Цвет-основа из Паспорта (null — тип ещё не выбран). */
  style: WineStyle | null;
  coreHex: string | null;
  rimHex: string | null;
  /** Клик по чипу ядра (опция несёт категорию WSET для синхронизации шкалы). */
  onCore: (opt: WineColorOption) => void;
  onRim: (opt: WineColorOption) => void;
}) {
  const palette = style ? WINE_COLOR_PALETTES[style] : null;
  const coreOptions = palette?.core ?? CORE_OPTIONS_ANY;
  const rimOptions = palette?.rim ?? RIM_OPTIONS_ANY;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-[13px] font-semibold tracking-wide text-ink">{T('Цвет ядра')}</span>
          {coreHex && <span className="tnum text-[10.5px] text-gold-soft">{coreHex.toUpperCase()}</span>}
        </div>
        <ColorChipRow options={coreOptions} activeHex={coreHex} onPick={onCore} />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-[13px] font-semibold tracking-wide text-ink">{T('Цвет каймы (обода)')}</span>
          {rimHex && <span className="tnum text-[10.5px] text-gold-soft">{rimHex.toUpperCase()}</span>}
        </div>
        <ColorChipRow options={rimOptions} activeHex={rimHex} onPick={onRim} />
      </div>

      {!style && (
        <p className="text-[11px] text-ink-faint leading-snug">
          {T('Тип вина не выбран — показана полная палитра. Выбери цвет-основу в «Титуле», и списки сожмутся до энологически допустимых.')}
        </p>
      )}
    </div>
  );
}
