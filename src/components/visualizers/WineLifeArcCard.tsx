import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { TastingRecord } from '@/types/tasting';
import type { StructuralProfile } from '@/engine/structuralProfile';
import { calculateWineLifeArc } from '@/engine/wineLifeArc';
import { READINESS_OPTS } from '@/lib/catalog';
import { Badge } from '@/components/common/Badge';
import { useTasting } from '@/state/TastingProvider';
import { useToast } from '@/components/common/Toast';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/* ═══════════════════════════════════════════════════════════════════════════
 * ПЕРСОНИФИЦИРОВАННЫЙ HUD КРИВОЙ ЖИЗНИ + СИНТЕЗ БАЛЛОВ «СЕГОДНЯ / ЗЕНИТ» (ТЗ v9).
 *
 *  • живая параметрическая дуга: форма физически изгибается от каждого клика
 *    дегустатора — глубина провала Dumb Phase зависит от ТЕКСТУРЫ танина
 *    (хваткий/зернистый → яма глубже и дольше; шелковистый → мягкая волна);
 *      Y₀ ≥ 0.85 (Божоле/СовБлан/Тони) — старт с самого верха и полка;
 *      структурный танин (Бароло/Бордо) — волна с параметрической ямой;
 *      иначе — плавный классический подъём из Y₀;
 *  • ДВОЙНОЙ БАЛЛ: «Оценка сейчас → Зенит на пике» с честным штрафом
 *    за молодость/закрытость и прогнозом интеграции полифенолов;
 *  • сканер лет: палец/курсор по дуге → живой сенсорный прогноз на нёбе;
 *  • «ВЫ ЗДЕСЬ (год)» — пульсирующий маркер текущей позиции;
 *  • кнопка «Применить в карту ↵» заполняет готовность и окно питья.
 *
 *  GPU-hardening (урок v6): ни одного CSS-фильтра на SVG-путях —
 *  неоновое свечение имитируется подложкой-обводкой, текст — paint-order.
 * ═══════════════════════════════════════════════════════════════════════════ */

const W = 320;
const H = 88;
const PAD_X = 14;

export function WineLifeArcCard({
  record,
  profile,
  faultyMode,
}: {
  record: TastingRecord;
  profile: StructuralProfile;
  faultyMode: boolean;
}) {
  const { dispatch } = useTasting();
  /* Перерисовка при смене языка (лейблы фаз/зон/тостов). */
  useLang();
  const toast = useToast();
  const arc = useMemo(() => calculateWineLifeArc(record, profile), [record, profile]);
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  const graphW = W - PAD_X * 2;
  const topY = 16;
  const baseY = 70;
  const amp = baseY - topY;

  /* Опорные координаты X. */
  const x0 = PAD_X;
  const xRise = PAD_X + arc.riseRatio * graphW;
  const xPlateau = PAD_X + (arc.riseRatio + arc.plateauRatio) * graphW;
  const xEnd = PAD_X + graphW;

  /* Живая параметрическая кривая Y(t): старт из Y₀, яма из dumbDepth.
   * Никаких переключений шаблонов — форма изгибается от физики бутылки. */
  const yStart = baseY - arc.y0 * amp;
  const yPeak = topY + 2;
  let curvePath = '';
  if (arc.hasDumbPhase) {
    // Провал «Фазы закрытости», глубина которого зависит от tanninTexture!
    const xDumb = PAD_X + 0.13 * graphW;
    const yDumb = baseY - (arc.y0 - arc.dumbDepth) * amp;
    curvePath = `M ${x0} ${yStart} C ${x0 + 10} ${yStart}, ${xDumb - 12} ${yDumb}, ${xDumb} ${yDumb} C ${xDumb + 15} ${yDumb}, ${xRise - 15} ${yPeak}, ${xRise} ${yPeak} L ${xPlateau} ${yPeak} C ${xPlateau + 18} ${topY + 4}, ${(xPlateau + xEnd) / 2} ${baseY - 4}, ${xEnd} ${baseY - 2}`;
  } else if (arc.y0 >= 0.85) {
    // Свежее вино: стартует прямо с пика (полка) → спад.
    curvePath = `M ${x0} ${yStart} L ${xPlateau} ${yPeak} C ${xPlateau + 20} ${topY + 4}, ${(xPlateau + xEnd) / 2} ${baseY - 4}, ${xEnd} ${baseY - 2}`;
  } else {
    // Классическая благородная арка (Кьянти, Риоха, выдержанное Шардоне).
    curvePath = `M ${x0} ${yStart} C ${(x0 + xRise) / 2} ${yStart}, ${xRise - 12} ${yPeak}, ${xRise} ${yPeak} L ${xPlateau} ${yPeak} C ${xPlateau + 18} ${topY + 4}, ${(xPlateau + xEnd) / 2} ${baseY - 4}, ${xEnd} ${baseY - 2}`;
  }
  const areaPath = `${curvePath} L ${xEnd} ${baseY} L ${x0} ${baseY} Z`;

  /* Позиция текущего года («Вы здесь»). */
  const curT = Math.min(1, Math.max(0, arc.currentPercent / 100));
  const curX = PAD_X + curT * graphW;

  /* Y маркера «Вы здесь» — честно следует форме Y(t) вместе с ямой. */
  const yDumb = baseY - (arc.y0 - arc.dumbDepth) * amp;
  let curY = yPeak;
  if (arc.hasDumbPhase && curT < arc.riseRatio) {
    // Погружение в яму закрытости к дну dumbDepth (точка 13% дуги).
    curY = curT < 0.13 ? yStart - (curT / 0.13) * (yStart - yDumb) : yDumb;
  } else if (curT < arc.riseRatio) {
    curY = yStart + (yPeak - yStart) * Math.sin((curT / (arc.riseRatio || 1)) * Math.PI * 0.5);
  } else if (curT > arc.riseRatio + arc.plateauRatio) {
    const decP = (curT - arc.riseRatio - arc.plateauRatio) / (1 - arc.riseRatio - arc.plateauRatio || 1);
    curY = yPeak + decP * decP * (baseY - yPeak);
  }

  /* Интерактивный визир: прогноз на год под курсором/пальцем. */
  const activeYear = hoverYear ?? arc.currentYear;
  const activeNote = arc.getTasteNoteAtYear(activeYear);

  const apply = (): void => {
    dispatch({
      type: 'patch-conclusion',
      patch: { readiness: arc.readiness, windowFrom: arc.peakFrom, windowTo: arc.peakTo },
    });
    toast(T(`Дуга применена: ${arc.peakFrom}–${arc.peakTo} гг. («${READINESS_OPTS.find((x) => x.value === arc.readiness)?.label}»)`, ), 'ok');
  };

  const scanFrom = (clientX: number, el: HTMLElement): void => {
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHoverYear(Math.round(arc.vintage + ratio * arc.lifespan));
  };

  /* Метки годов; дедупликация по значению года (vintage == peakFrom у свежих
   * и креплёных вин) И по близости X — наложение текста недопустимо. */
  const yearMarks = [
    { x: x0, label: String(arc.vintage) },
    { x: xRise, label: String(arc.peakFrom) },
    { x: xPlateau, label: String(arc.peakTo) },
    { x: xEnd, label: `${arc.lifeEnd}+` },
  ].filter((p, i, arr) => arr.findIndex((q) => q.label === p.label) === i && arr.findIndex((q) => Math.abs(q.x - p.x) < 9) === i);

  /* Лейбл «ВЫ ЗДЕСЬ» клэмпится в границы, чтобы не резаться контейнером. */
  const markerLabelX = Math.min(W - PAD_X - 30, Math.max(PAD_X + 30, curX));

  return (
    <div className="pb-3.5 mb-3.5 border-b border-hairline/60">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp size={14} className="text-sage-juicy shrink-0" />
          <span className="text-[13px] font-semibold text-ink whitespace-nowrap">{T('Кривая жизни вина')}</span>
          <Badge tone={arc.archetypeTone}>{T(arc.archetypeLabel)}</Badge>
        </div>
        {!faultyMode && (
          <button
            type="button"
            onClick={apply}
            className="text-[11px] px-2.5 py-1.5 min-h-[32px] rounded-lg border border-gold/40 bg-gold/10 text-gold-soft hover:bg-gold/20 active:scale-95 transition"
          >
            {T('Применить в карту ↵')}
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-hairline bg-[#080d0a] shadow-cellar p-2.5">
        {/* Двойной балл Паркера: «Балл сегодня» → «Потенциал в зените» */}
        <div className="flex items-center justify-between px-1 pb-2 mb-1.5 border-b border-hairline/40 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-faint">{T('Оценка сейчас:')}</span>
            <b className="text-ink font-bold tnum">{arc.scoreToday} / 100</b>
          </div>
          <span className="text-gold-soft font-mono" aria-hidden>────────►</span>
          <div className="flex items-center gap-1.5">
            <span className="text-ink-faint">{T('Зенит на пике:')}</span>
            <b className="text-gold-soft font-bold tnum">{arc.scoreZenith} / 100</b>
          </div>
        </div>
        <div
          className="relative cursor-crosshair select-none touch-none"
          onPointerMove={(e) => scanFrom(e.clientX, e.currentTarget)}
          onPointerDown={(e) => scanFrom(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHoverYear(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full h-auto overflow-visible"
            role="img"
            aria-label={T('Кривая эволюции вкуса')}
          >
            <defs>
              <linearGradient id="life-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e5c179" stopOpacity="0.26" />
                <stop offset="75%" stopColor="#c59b4e" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#c59b4e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="life-line-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e5c179" />
                <stop offset="50%" stopColor="#f5df9e" />
                <stop offset="100%" stopColor="#c59b4e" />
              </linearGradient>
            </defs>

            {/* подсветка зоны Золотого Плато */}
            <rect
              x={xRise}
              y={topY}
              width={Math.max(4, xPlateau - xRise)}
              height={amp}
              fill="#e5c179"
              fillOpacity="0.06"
              rx={3}
            />
            <line x1={xRise} y1={topY} x2={xRise} y2={baseY} stroke="#e5c179" strokeDasharray="2 3" strokeWidth="0.7" opacity="0.4" />
            <line x1={xPlateau} y1={topY} x2={xPlateau} y2={baseY} stroke="#e5c179" strokeDasharray="2 3" strokeWidth="0.7" opacity="0.4" />

            {/* зона «Фазы закрытости» (структурный танин у некреплёного) */}
            {arc.hasDumbPhase && (
              <>
                <rect
                  x={PAD_X + 0.04 * graphW}
                  y={baseY - 0.42 * amp}
                  width={0.18 * graphW}
                  height={0.42 * amp}
                  fill="#9a4a44"
                  fillOpacity="0.14"
                  rx={2}
                />
                <text
                  x={PAD_X + 0.13 * graphW}
                  y={baseY - 4.5}
                  textAnchor="middle"
                  fontSize="6.5"
                  fill="#e8b3ac"
                  fontWeight="700"
                >
                  {T('ЗАКРЫТО')}
                </text>
              </>
            )}

            {/* сплайн-кривая и заливка (неон — подложкой-обводкой) */}
            <path d={areaPath} fill="url(#life-area-grad)" />
            <path d={curvePath} fill="none" stroke="#f5df9e" strokeWidth="5" strokeLinecap="round" opacity="0.16" aria-hidden />
            <path d={curvePath} fill="none" stroke="url(#life-line-grad)" strokeWidth="2.4" strokeLinecap="round" />
            <line x1={x0} y1={baseY} x2={xEnd} y2={baseY} stroke="#2b3d30" strokeWidth="0.8" />

            {/* подпись Плато */}
            <text
              x={(xRise + xPlateau) / 2}
              y={topY - 5}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="700"
              letterSpacing="0.08em"
              fill="#e5c179"
            >
              {T('ЗОЛОТОЕ ПЛАТО (ПИК)')}
            </text>

            {/* метки годов */}
            {yearMarks.map((pt) => (
              <g key={pt.label}>
                <line x1={pt.x} y1={baseY} x2={pt.x} y2={baseY + 3} stroke="#3a5243" strokeWidth="0.8" />
                <text
                  x={Math.min(W - 12, Math.max(12, pt.x))}
                  y={baseY + 11}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#8a9484"
                  className="tnum"
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {/* визир сканера */}
            {hoverYear !== null && (
              <line
                x1={PAD_X + Math.min(1, Math.max(0, (hoverYear - arc.vintage) / arc.lifespan)) * graphW}
                y1={topY}
                x2={PAD_X + Math.min(1, Math.max(0, (hoverYear - arc.vintage) / arc.lifespan)) * graphW}
                y2={baseY}
                stroke="#8dc78a"
                strokeOpacity="0.45"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
            )}

            {/* пульсирующий маркер «Вы здесь» */}
            <g transform={`translate(${curX.toFixed(1)}, ${curY.toFixed(1)})`}>
              <circle r="7" fill="#8dc78a" opacity="0.25" className="life-halo" />
              <circle r="3.5" fill="#8dc78a" stroke="#0d120f" strokeWidth="1" className="life-marker" />
              <text
                x={markerLabelX - curX}
                y={curY < topY + 14 ? 14 : -8}
                textAnchor="middle"
                fontSize="8"
                fontWeight="800"
                fill="#8dc78a"
                stroke="#0d120f"
                strokeWidth="2.6"
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {T(`ВЫ ЗДЕСЬ (${arc.currentYear})`)}
              </text>
            </g>
          </svg>
        </div>

        {/* Живой орган чувств: прогноз вкуса в выбранный год */}
        <div className="mt-1 pt-1.5 border-t border-hairline/40 px-1 text-[11px] leading-snug space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-ink-dim">
              {hoverYear !== null ? T('Прогноз на ') : T('Сейчас: ')}
              <b className="text-sage-juicy font-semibold tnum">{activeYear}{T(' год')}</b>
            </span>
            <span className="text-ink-dim">
              {T('Окно пика: ')}<b className="text-gold-soft font-semibold tnum">{arc.peakFrom}–{arc.peakTo}</b>
            </span>
            <span className="hidden sm:inline text-ink-faint tnum">{T('Потенциал: ≈')} {arc.lifespan} {T('л.')}</span>
          </div>
          <p className="text-[10.5px] text-gold-soft/90 italic">{T(activeNote)}</p>
        </div>
      </div>

      {faultyMode && (
        <p className="mt-2.5 text-[11px] text-[#e8b3ac] rounded-lg border border-garnet/40 bg-garnet/10 px-3 py-2 leading-snug">
          {T('Порок выявлен: потенциал выдержки закрыт — окно питья зажато текущим годом.')}
        </p>
      )}
    </div>
  );
}
