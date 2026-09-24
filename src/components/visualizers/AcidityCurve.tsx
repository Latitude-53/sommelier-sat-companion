import { useEffect, useReducer, useRef, useState } from 'react';
import type { AcidityShape, SatAcidity } from '@/types/wset';
import { ACIDITY_SHAPE_OPTS } from '@/lib/catalog';
import { vibrate } from '@/lib/haptics';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/* ═══════════════════════════════════════════════════════════════════════════
 * ОСЦИЛЛОГРАФ КИСЛОТНОСТИ v3.1 — «Компактный HUD телеметрии» (ТЗ §БЛОК 2).
 *
 * Что изменилось против v3 («иллюминатор на пол-экрана»):
 *  • высота экрана сжата ~на 35% (68 ед. вместо 110, класс h-20);
 *  • аккуратная горизонтальная приборная шапка в стиле телеметрии:
 *    пульсирующий маркер + подпись формы | фаза и интенсивность справа;
 *  • интерактивный сканнер времени: водя пальцем/курсором по волне,
 *    сомелье видит визир с физиологической подсказкой фазы
 *    («1.5 с — рецепторы кончика языка…» → «4 с — сочность в теле»
 *    → «8 с — слюноотделение на финише»);
 *  • золотая неоновая кривая #f5df9e→#e5c179 с ореолом и градиентной
 *    подложкой, жидкий морфинг между профилями сохранён;
 *  • жемчужина пика (Apex) без тяжёлого парящего бейджа — подпись пика
 *    переехала в шапку HUD;
 *  • компактный футер с тремя фазами глотка, активная подсвечивается.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ── Математические профили формы кислотности (ТЗ §4.3) ─────────────────────
 * Чистые функции y(t), t∈[0,1] — атака→финиш; возвращают интенсивность 0..1.
 * Функции (а не статичные path) позволяют НАСТОЯЩЕЕ перетекание кривой:
 * морфинг считается попиксельно между двумя профилями и рендерится
 * сглаженной кубической кривой Безье (Catmull-Rom → cubic Bézier). */

const SHAPE_FN: Record<AcidityShape, (t: number) => number> = {
  // Прямая ось: натянутая струна от входа до послевкусия (Шабли, Асиртико)
  linear: (t) => 0.18 + 0.42 * t,
  // Ранний пик: резкий взлёт на первой секунде, мягкий спад (Мозель Рислинг)
  'early-peak': (t) =>
    0.08 + 0.7 * Math.exp(-(((t - 0.16) / 0.15) ** 2)) + 0.3 * Math.exp(-(((t - 0.72) / 0.4) ** 2)),
  // Середина: гармоничная арка Гаусса с кульминацией в центре нёба (Шардоне)
  'mid-peak': (t) => 0.22 + 0.5 * Math.exp(-(((t - 0.5) / 0.26) ** 2)),
  // Плоская: проваленная линия без энергии (уставшее вино)
  flat: (t) => 0.3 + 0.05 * Math.sin(t * 6.3),
  // Поздний пик: нарастание к глотку, мощный финиш (Бароло, Брют)
  'late-peak': (t) => 0.18 + 0.52 * t ** 2.1 - 0.06 * Math.exp(-(((t - 0.32) / 0.1) ** 2)),
  // Мягкая волна: бархатный купол МЛО (белая Бургундия, Вионье)
  'soft-wave': (t) => 0.2 + 0.42 * Math.exp(-(((t - 0.38) / 0.3) ** 2)) + 0.16 * Math.exp(-(((t - 0.78) / 0.2) ** 2)),
};

/* ── Реактивная связь с уровнем кислотности (ТЗ v4 §3) ─────────────────────
 * Множитель высоты амплитуды волны: Низкая → волна приседает (×0.65),
 * Средняя → ×1.0, Высокая → кривая поднимается (×1.35) и пульсирует
 * неоновым золотым лазером (CSS-класс scope-laser-pulse). */
const LEVEL_AMP: Record<SatAcidity, number> = {
  low: 0.65,
  'medium-': 0.82,
  medium: 1.0,
  'medium+': 1.18,
  high: 1.35,
};

const LEVEL_AMP_LABEL: Record<SatAcidity, string> = {
  low: 'Низкая',
  'medium-': 'Средняя−',
  medium: 'Средняя',
  'medium+': 'Средняя+',
  high: 'Высокая',
};

/** Амплитуда уровня × форма; клэмп сверху — волна не пробивает экран. */
function shapeWithLevel(shape: AcidityShape, level: SatAcidity | null): (t: number) => number {
  const amp = level ? (LEVEL_AMP[level] ?? 1) : 1;
  const fn = SHAPE_FN[shape] ?? SHAPE_FN.linear;
  return (t) => Math.min(1, fn(t) * amp);
}

/** Подписи пика (шапка HUD) и примеры сортов для карточек форм. */
const SHAPE_META: Record<AcidityShape, { caption: string; examples: string }> = {
  'early-peak': { caption: 'Цитрусовый удар', examples: 'Мозель Рислинг · Совиньон Блан' },
  'mid-peak': { caption: 'Купольная сочность', examples: 'Выдержанное Шардоне · Мерло' },
  'late-peak': { caption: 'Финишный импульс', examples: 'Бароло · Шампань Брют · Этна Россо' },
  linear: { caption: 'Натянутая струна', examples: 'Шабли · Мюскаде · Асиртико' },
  'soft-wave': { caption: 'Бархатный купол', examples: 'Белая Бургундия · Вионье' },
  flat: { caption: 'Провал энергии', examples: 'Уставшее · перезрелое вино' },
};

/** Энологические аннотации фаз глотка — физиологические подсказки сканера. */
const TASTE_PHASES_INFO = [
  { sec: '0–2 с', title: 'Атака', desc: 'Кончик языка и десны. Первое впечатление кислотного удара.' },
  { sec: '2–6 с', title: 'Эволюция', desc: 'Середина нёба. Взаимодействие сочности с телом вина.' },
  { sec: '6+ с', title: 'Финиш', desc: 'Глоток и каудалии. Слюноотделение и послевкусие.' },
] as const;

const SAMPLES = 48;
const PAD_X = 8;
const TOP = 5;
const PLOT_H = 48;
const BASELINE = TOP + PLOT_H + 5; // 58 — низ области данных
const W = 200;
const PLOT_W = W - PAD_X * 2;
const VIEW_H = 68; // компактная высота экрана (было 110)

const xAt = (i: number): number => PAD_X + (i / SAMPLES) * PLOT_W;

function ptsOf(shape: AcidityShape, level: SatAcidity | null = null): number[] {
  const fn = shapeWithLevel(shape, level);
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    return TOP + (1 - Math.min(1, fn(t))) * PLOT_H;
  });
}

function blend(a: number[], b: number[], k: number): number[] {
  // длины массивов равны по построению (одинаковый SAMPLES)
  return a.map((y, i) => y + ((b[i] ?? y) - y) * k);
}

/** Сглаженная кубическая Безье (Catmull-Rom → cubic Bézier) по точкам. */
function smoothPath(pts: number[]): string {
  const n = pts.length;
  if (n < 2) return '';
  const d: string[] = [`M${xAt(0).toFixed(1)},${pts[0]!.toFixed(1)}`];
  for (let i = 0; i < n - 1; i++) {
    const y0 = pts[Math.max(0, i - 1)]!;
    const y1 = pts[i]!;
    const y2 = pts[i + 1]!;
    const y3 = pts[Math.min(n - 1, i + 2)]!;
    const x0 = xAt(Math.max(0, i - 1));
    const x1 = xAt(i);
    const x2 = xAt(i + 1);
    const x3 = xAt(Math.min(n - 1, i + 2));
    // кубическая Эрмита: касательные — секательные наклоны соседних сегментов
    // (для равномерной сетки совпадает с классическим Catmull-Rom /6)
    const h = (x2 - x1) / 3;
    const c1x = x1 + h;
    const c1y = y1 + ((y2 - y0) / (x2 - x0 || 1)) * h;
    const c2x = x2 - h;
    const c2y = y2 - ((y3 - y1) / (x3 - x1 || 1)) * h;
    d.push(`C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
  }
  return d.join(' ');
}

/** Область под кривой (градиент от 0.25 на пике до нуля у базовой линии). */
function areaPath(pts: number[]): string {
  return `${smoothPath(pts)} L${xAt(SAMPLES).toFixed(1)},${BASELINE} L${xAt(0).toFixed(1)},${BASELINE} Z`;
}

/* ── Компактный осциллограф: HUD + интерактивный сканнер вкуса ────────────── */

export function CompactOscilloscope({
  shape,
  hoverShape = null,
  acidityLevel = null,
}: {
  shape: AcidityShape | null;
  hoverShape?: AcidityShape | null;
  /** Уровень кислотности: реактивно управляет высотой волны (ТЗ v4 §3). */
  acidityLevel?: SatAcidity | null;
}) {
  useLang();
  const activeKey = hoverShape ?? shape ?? 'mid-peak';
  const activeLevel = acidityLevel;
  const isSelected = shape !== null;
  const [scanX, setScanX] = useState(50); // позиция сканера: % времени глотка (0..100)

  /* Жидкий морфинг (Fluid Spring Morphing) — наследие v3.
   * Претендует и на смену формы, и на смену уровня (амплитуда перетекает). */
  const fromPts = useRef<number[]>(ptsOf(shape ?? 'mid-peak', acidityLevel));
  const toShape = useRef<AcidityShape>(shape ?? 'mid-peak');
  const toLevel = useRef<SatAcidity | null>(acidityLevel);
  const kRef = useRef(1);
  const rafRef = useRef(0);
  const [, bump] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const targetShape = shape ?? 'mid-peak';
    if (targetShape === toShape.current && acidityLevel === toLevel.current) return;
    // Прерывание посреди анимации: фиксируем текущее смешанное состояние как новую стартовую линию
    fromPts.current = blend(fromPts.current, ptsOf(toShape.current, toLevel.current), kRef.current);
    toShape.current = targetShape;
    toLevel.current = acidityLevel;
    kRef.current = 0;
    const start = performance.now();
    const DUR = 560;
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / DUR);
      // easeOutCubic: лёгкая «жидкая» пружина без перелёта
      kRef.current = 1 - Math.pow(1 - p, 3);
      bump();
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [shape, acidityLevel]);

  const points = blend(fromPts.current, ptsOf(toShape.current, toLevel.current), kRef.current);
  const pathD = smoothPath(points);
  const areaD = areaPath(points);

  /* Неоновая пульсация лазера: выбранная форма + высокая кислотность (ТЗ v4 §3). */
  const neonPulse = isSelected && activeLevel === 'high';

  /* Сканер времени: высота кривой в точке сканирования → интенсивность 0..100%. */
  const normalizedIndex = Math.min(SAMPLES, Math.max(0, Math.round((scanX / 100) * SAMPLES)));
  const currentY = points[normalizedIndex] ?? BASELINE;
  const currentAmplitude = Math.round((1 - (currentY - TOP) / PLOT_H) * 100);

  const phaseIndex = scanX < 33.3 ? 0 : scanX < 66.6 ? 1 : 2;
  const currentPhase = TASTE_PHASES_INFO[phaseIndex];
  const scanSeconds = ((scanX / 100) * 10).toFixed(1).replace('.', ',');

  const scanFrom = (clientX: number, el: HTMLElement): void => {
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setScanX(Math.max(0, Math.min(100, x)));
  };

  /* Пик: максимум интенсивности (минимальный y) — жемчужина без бейджа. */
  let peakIdx = 0;
  for (let i = 1; i < points.length; i++) if ((points[i] ?? 0) < (points[peakIdx] ?? 0)) peakIdx = i;
  const peakX = xAt(peakIdx);
  const peakY = points[peakIdx] ?? BASELINE;

  const displayShape = shape ?? hoverShape;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-[#080d0a] shadow-cellar">
      {/* ── Шапка HUD: телеметрия формы, фазы и интенсивности ── */}
      <div className="flex items-center justify-between gap-x-3 gap-y-0.5 flex-wrap px-3 pt-2.5 pb-2 border-b border-hairline/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-gold-soft animate-pulse shrink-0" aria-hidden />
          <span className="font-bold text-ink uppercase tracking-wider text-[11px] truncate">
            {T(SHAPE_META[activeKey]?.caption ?? 'Осциллограмма сочности')}
          </span>
        </div>
        <div className="flex items-center gap-3 tnum text-[11px] text-ink-faint">
          <span>
            {T('Уровень:')}{' '}
            <b className="text-gold-soft font-semibold">
              {activeLevel ? `${T(LEVEL_AMP_LABEL[activeLevel])} ×${LEVEL_AMP[activeLevel].toFixed(2)}` : '—'}
            </b>
          </span>
          <span>
            {T('Фаза:')} <b className="text-gold-soft font-semibold">{T(currentPhase.title)} ({T(currentPhase.sec)})</b>
          </span>
          <span className="hidden sm:inline">
            {T('Сочность:')} <b className="text-gold-soft font-semibold">{currentAmplitude}%</b>
          </span>
        </div>
      </div>

      {/* ── Экран осциллографа (компактная высота h-20 вместо 110) ── */}
      <div
        className="relative cursor-crosshair select-none"
        onMouseMove={(e) => scanFrom(e.clientX, e.currentTarget)}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) scanFrom(touch.clientX, e.currentTarget);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) scanFrom(touch.clientX, e.currentTarget);
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${VIEW_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={T(`Осциллограф кислотности: ${displayShape}`)}
          className="block w-full h-20"
        >
          <defs>
            {/* градиент лазерной кривой: неоновый цитрус → золото */}
            <linearGradient id="hud-laser" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f5df9e" />
              <stop offset="0.55" stopColor="#e5c179" />
              <stop offset="1" stopColor="#f5df9e" />
            </linearGradient>
            {/* заливка под кривой: 0.25 на пике → 0 у базовой линии */}
            <linearGradient id="hud-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e5c179" stopOpacity={isSelected ? 0.25 : 0.1} />
              <stop offset="0.8" stopColor="#e5c179" stopOpacity="0.02" />
              <stop offset="1" stopColor="#e5c179" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── горизонтальная миллиметровка ── */}
          {[TOP + PLOT_H * 0.3, TOP + PLOT_H * 0.7].map((h) => (
            <line
              key={h}
              x1={PAD_X}
              y1={h}
              x2={W - PAD_X}
              y2={h}
              stroke="#1b2a20"
              strokeWidth="0.6"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* ── фазовые вертикали (границы Атака | Эволюция | Финиш) ── */}
          {[1 / 3, 2 / 3].map((ratio) => (
            <line
              key={ratio}
              x1={PAD_X + ratio * PLOT_W}
              y1={TOP}
              x2={PAD_X + ratio * PLOT_W}
              y2={BASELINE}
              stroke="#2b3d30"
              strokeWidth="0.8"
              strokeDasharray="1.5 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* базовая линия */}
          <line x1={PAD_X} y1={BASELINE} x2={W - PAD_X} y2={BASELINE} stroke="#3a5243" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />

          {/* ── градиентная подложка и неоновая кривая (морфится) ──
              Неон = подложка-обводка с пульсом прозрачности: CSS-фильтры
              (drop-shadow) на SVG-путях вызывают GPU-краш Chrome. */}
          <path d={areaD} fill="url(#hud-area)" />
          {isSelected && (
            <path
              d={pathD}
              fill="none"
              stroke="#f5df9e"
              strokeWidth={neonPulse ? 6 : 5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={neonPulse ? 'scope-laser-aura' : undefined}
              opacity={neonPulse ? undefined : 0.35}
              aria-hidden
            />
          )}
          <path
            d={pathD}
            fill="none"
            stroke={isSelected ? 'url(#hud-laser)' : '#4a5c4d'}
            strokeWidth={isSelected ? 2.8 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* ── интерактивный визир курсора / пальца ── */}
          <line
            x1={PAD_X + (scanX / 100) * PLOT_W}
            y1={TOP}
            x2={PAD_X + (scanX / 100) * PLOT_W}
            y2={BASELINE}
            stroke="#e5c179"
            strokeWidth="0.75"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
          {/* линия пика вниз (только когда форма выбрана) */}
          {isSelected && (
            <line
              x1={peakX}
              y1={peakY + 3}
              x2={peakX}
              y2={BASELINE}
              stroke="#e5c179"
              strokeOpacity="0.4"
              strokeWidth="0.7"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* HTML-оверлеи: точка сканера и жемчужина пика — не искажаются
            при preserveAspectRatio="none" (остаются идеальными кругами). */}
        <span
          aria-hidden
          className="pointer-events-none absolute z-10"
          style={{ left: `${scanX}%`, top: `${(currentY / VIEW_H) * 100}%`, transform: 'translate(-50%,-50%)' }}
        >
          <span
            className="block w-[9px] h-[9px] rounded-full bg-[#f5df9e]"
            style={{ filter: 'drop-shadow(0 0 5px #f5df9e)' }}
          />
        </span>
        {isSelected && (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{ left: `${(peakX / W) * 100}%`, top: `${(peakY / VIEW_H) * 100}%`, transform: 'translate(-50%,-50%)' }}
          >
            <span
              className="block w-[7px] h-[7px] rounded-full bg-[#f5df9e] scope-pearl"
              style={{ filter: 'drop-shadow(0 0 6px rgba(245,223,158,0.95))' }}
            />
          </span>
        )}
      </div>

      {/* ── Физиологическая подсказка сканера времени ── */}
      <p className="tnum text-[10px] text-ink-faint text-center leading-snug px-3 mt-1.5 min-h-[14px]">
        ≈ {scanSeconds} {T('с')} — {T(currentPhase.desc)}
      </p>

      {/* ── Компактный футер с фазами глотка ── */}
      <div className="grid grid-cols-3 gap-2 mt-1 px-3 pb-3 pt-1.5 border-t border-hairline/40 text-center">
        {TASTE_PHASES_INFO.map((phase, idx) => (
          <div
            key={idx}
            className={`p-1 rounded transition-colors ${phaseIndex === idx ? 'bg-gold/10 text-gold-soft' : 'text-ink-faint'}`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider">{T(phase.title)}</span>
            <span className="block text-[9.5px] opacity-75 leading-none mt-0.5 tnum">{T(phase.sec)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Карточки выбора формы: мини-иконка кривой + энологические примеры ───── */

/** Миниатюра формы кривой для карточки (48×22, та же математика SHAPE_FN). */
function ShapeThumb({ shape, active }: { shape: AcidityShape; active: boolean }) {
  const pts = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return 2 + (1 - Math.min(1, SHAPE_FN[shape](t))) * 18;
  });
  const d = pts
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${((i / 24) * 48).toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  return (
    <svg width="48" height="22" viewBox="0 0 48 22" aria-hidden className="shrink-0">
      <line x1="1" y1="20.5" x2="47" y2="20.5" stroke={active ? '#3a5243' : '#2b3d30'} strokeWidth="0.8" />
      <path
        d={d}
        fill="none"
        stroke={active ? '#e5c179' : '#5a655b'}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {active && <path d={d} fill="none" stroke="#e5c179" strokeWidth="3.4" strokeLinecap="round" opacity="0.35" aria-hidden />}
    </svg>
  );
}

/** Селектор формы кислотности: компактный HUD-осциллограф + карточки форм + расшифровка.
 *  Уровень кислотности реактивно управляет высотой волны (ТЗ v4 §3). */
export function AcidityCurvePicker({
  value,
  onChange,
  acidityLevel = null,
}: {
  value: AcidityShape | null;
  onChange: (s: AcidityShape | null) => void;
  acidityLevel?: SatAcidity | null;
}) {
  useLang();
  const [hover, setHover] = useState<AcidityShape | null>(null);
  const preview = hover ?? value;
  const desc = preview
    ? ACIDITY_SHAPE_OPTS.find((o) => o.value === preview)?.hint
    : T('Выберите форму волны — кривая перетечёт в неё. Проведите пальцем по экрану: сканер покажет физиологию каждой секунды глотка.');

  return (
    <div>
      <CompactOscilloscope shape={preview} hoverShape={hover} acidityLevel={acidityLevel} />

      {/* текстовая расшифровка выбранного типа — под экраном */}
      <p className="text-[12px] text-ink-dim mt-3 mb-2.5 min-h-[36px] leading-snug px-0.5">
        {preview && <span className="text-gold-soft font-semibold mr-1.5">{T(ACIDITY_SHAPE_OPTS.find((o) => o.value === preview)?.label ?? '')}:</span>}
        {desc ? T(desc) : null}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {ACIDITY_SHAPE_OPTS.map((o) => {
          const active = value === o.value;
          const meta = SHAPE_META[o.value];
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                vibrate(6);
                onChange(active ? null : o.value);
              }}
              onMouseEnter={() => setHover(o.value)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(o.value)}
              onBlur={() => setHover(null)}
              title={T(o.hint)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 min-h-[54px] px-3 py-2 rounded-xl border text-left transition-all active:scale-[0.97] ${
                active
                  ? 'border-gold/70 bg-gold/10 shadow-[0_0_18px_rgba(229,193,121,0.15)]'
                  : 'border-hairline bg-surface/40 hover:border-[#4a6350]'
              }`}
            >
              <ShapeThumb shape={o.value} active={active} />
              <span className="min-w-0">
                <span className={`block text-[12px] font-semibold truncate ${active ? 'text-gold-soft' : 'text-ink-dim'}`}>
                  {T(o.label)}
                </span>
                <span className="block text-[10px] text-ink-faint truncate" title={T(meta.examples)}>
                  {T(meta.examples)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
