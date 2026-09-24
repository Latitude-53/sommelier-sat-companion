import { useId } from 'react';
import { WINE_COLOR_META } from '@/lib/catalog';
import { T } from '@/lib/tr';
import type { WineColor } from '@/types/wset';

/** Доля радиуса, занимаемая каймой (ободом) — управляет градиентом перехода. */
const RIM_FRACTION: Record<'none' | 'narrow' | 'medium' | 'wide', number> = {
  none: 0.05,
  narrow: 0.11,
  medium: 0.18,
  wide: 0.27,
};

/**
 * SVG-визуализатор диска вина: радиальный градиент от ядра к кайме.
 * Ширина обода (rimWidth) задаёт долю радиуса, на которой ядро перетекает в кайму.
 * Выбор цветов вынесен в WineColorControls (чипы, зависящие от стиля вина).
 */
export function InteractiveDisc({
  coreHex,
  rimHex,
  color,
  rimWidth = null,
  size = 190,
}: {
  coreHex: string | null;
  rimHex: string | null;
  color: WineColor | null;
  /** Ширина каймы (Pro-режим); null — мягкий переход по умолчанию. */
  rimWidth?: 'none' | 'narrow' | 'medium' | 'wide' | null;
  size?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `disc-grad-${uid}`;
  const sheenId = `disc-sheen-${uid}`;

  const resolvedColor = color ? WINE_COLOR_META[color] : null;
  const core = coreHex ?? resolvedColor?.hex.core ?? '#4a3b3b';
  const rim = rimHex ?? resolvedColor?.hex.rim ?? core;
  const rimPct = rimWidth ? RIM_FRACTION[rimWidth] : 0.15;

  const glow = size * 0.06;
  const boundaryR = 47 * (1 - rimPct);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={T('Диск вина: градиент от ядра к кайме')}>
        <defs>
          {/* градиент перехода: ядро держится до границы обода, затем уходит в кайму */}
          <radialGradient id={gradId} gradientUnits="userSpaceOnUse" cx="50" cy="50" r="47">
            <stop offset="0" stopColor={core} />
            <stop offset={1 - rimPct} stopColor={core} />
            <stop offset="1" stopColor={rim} />
          </radialGradient>
          <radialGradient id={sheenId} gradientUnits="userSpaceOnUse" cx="38" cy="30" r="30">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* диск одним градиентом: ядро → кайма */}
        <circle cx="50" cy="50" r="47" fill={`url(#${gradId})`} />
        {/* едва заметная граница обода — читается ширина каймы */}
        <circle cx="50" cy="50" r={boundaryR} fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.6" />
        {/* блик */}
        <circle cx="50" cy="50" r="47" fill={`url(#${sheenId})`} />
        <circle cx="50" cy="50" r="47" fill="none" stroke="#00000055" strokeWidth="1" />
      </svg>

      <div className="flex flex-col items-center gap-1.5 text-[11px] text-ink-faint">
        <div className="flex items-center gap-2">
          <span className="tnum flex items-center gap-1.5">
            <span aria-hidden className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ background: core, boxShadow: `0 0 ${glow}px ${core}55` }} />
            {T('ядро')} {core.toUpperCase()}
          </span>
          <span aria-hidden>·</span>
          <span className="tnum flex items-center gap-1.5">
            <span aria-hidden className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ background: rim }} />
            {T('кайма')} {rim.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
