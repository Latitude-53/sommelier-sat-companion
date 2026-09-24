import type { ProfileAxis, ProfileAxisKey } from '@/engine/structuralProfile';
import { T } from '@/lib/tr';
import { useLang } from '@/lib/i18n';

/**
 * Кольцо баланса (v17) — замена сенсорной ленты и радара в «Сводке».
 *
 * Геометрия (макет «Профиль-доводка», итерация 4):
 *  • 6 секторов по 56° с зазорами 4°, длина дуги = балл оси;
 *  • градиент гарнец → золото (userSpaceOnUse), оценённые дуги образуют арку;
 *  • ноль и н/о — пунктирные прорези: кольцо отвечает только на вопрос
 *    «что ощутимо», различие «0.0 против н/о» живёт в строках расчёта;
 *  • порядок v17: оценённые оси по убыванию балла (равные — школьным
 *    порядком), «н/о» — в самом низу; Сладость и Минеральность в этой школе
 *    всегда оцениваются — пустые показываются как честный 0.0;
 *  • ротация: центр арки оценённых всегда на 12:00 — прорези стекают
 *    ровно вниз по центру (6:00), кольцо собирается в «арку»;
 *  • центр пустой: счётчик «N / 6 осей» убран (в белом вине «4 / 6»
 *    звучало как диагноз), форма сама сообщает полноту.
 */

/** Оси, у которых «не указано» не бывает: показываются как 0.0. */
const ALWAYS_SCORED: ReadonlySet<ProfileAxisKey> = new Set(['sweetness', 'minerality']);

export interface RankedSlot {
  axis: ProfileAxis;
  /** Ось имеет вклады движка. */
  assessed: boolean;
  /** Пунктирная прорезь (честный ноль или н/о). */
  dead: boolean;
  /** Подпись числа: «9.0» или «0.0»; null — честное «н/о» (текст подставляет потребитель через T). */
  tag: string | null;
}

/** Порядок отображения профиля v17 (кольцо и строки живут в одном порядке). */
export function rankAxesForDisplay(axes: ProfileAxis[]): RankedSlot[] {
  const idx = new Map(axes.map((a, i) => [a.key, i] as const));
  const rankOf = (a: ProfileAxis): number =>
    a.contributions.length > 0 || ALWAYS_SCORED.has(a.key) ? 1 : 0;
  return [...axes]
    .sort((x, y) => {
      const rx = rankOf(x);
      const ry = rankOf(y);
      if (rx !== ry) return ry - rx;
      if (rx === 1 && x.value !== y.value) return y.value - x.value;
      return (idx.get(x.key) ?? 0) - (idx.get(y.key) ?? 0);
    })
    .map((axis) => {
      const assessed = axis.contributions.length > 0;
      const dead = axis.value <= 0;
      const tag = assessed
        ? axis.value.toFixed(1)
        : ALWAYS_SCORED.has(axis.key)
          ? '0.0'
          : null;
      return { axis, assessed, dead, tag };
    });
}

const pt = (r: number, aDeg: number): [number, number] => [
  r * Math.cos((aDeg * Math.PI) / 180),
  r * Math.sin((aDeg * Math.PI) / 180),
];

const arcPath = (r: number, a0: number, a1: number): string => {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** Экранное кольцо: ранжирование + прорези вниз по центру + пустой центр. */
export function RingGauge({
  axes,
  size = 136,
}: {
  axes: ProfileAxis[];
  /** Диаметр кольца (макет-ставка: 136px). */
  size?: number;
}) {
  useLang();
  const slots = rankAxesForDisplay(axes);
  const W = size * 0.095;
  const R = size / 2 - W / 2;
  const padX = 38;
  const padY = 24;
  const w = size + padX * 2;
  const h = size + padY * 2;

  /* Ротация: сколько пунктирных прорезей стоит в хвосте рейтинга.
     Центр арки оценённых держим на 12:00 → прорези стекают к 6:00.
     delta = k*30 − 180 (поворот по часовой, градусы). */
  let k = 0;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i]?.dead) k++;
    else break;
  }
  const delta = k > 0 && k < slots.length ? k * 30 - 180 : 0;

  const dash = Math.max(2.2, size * 0.024);
  const dashArr = `${dash.toFixed(1)} ${(dash * 1.45).toFixed(1)}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`}
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
      role="img"
      aria-label={T('Кольцо баланса')}
    >
      <defs>
        <linearGradient
          id="ring-grad"
          gradientUnits="userSpaceOnUse"
          x1={-R}
          y1={R}
          x2={R}
          y2={-R}
        >
          <stop offset="0" stopColor="#9a4a44" />
          <stop offset="0.55" stopColor="#b98a52" />
          <stop offset="1" stopColor="#e5c179" />
        </linearGradient>
      </defs>
      {slots.map((s, i) => {
        const a0 = -90 + i * 60 + 2 + delta;
        const a1 = a0 + 56;
        if (s.dead) {
          return (
            <path
              key={s.axis.key}
              d={arcPath(R, a0, a1)}
              fill="none"
              stroke="#6b7566"
              strokeOpacity={0.5}
              strokeWidth={W * 0.62}
              strokeDasharray={dashArr}
              strokeLinecap="butt"
            />
          );
        }
        const av = a0 + (Math.min(10, Math.max(0, s.axis.value)) / 10) * 56;
        return (
          <g key={s.axis.key}>
            <path
              d={arcPath(R, a0, a1)}
              fill="none"
              stroke="rgba(107,117,102,.24)"
              strokeWidth={W}
            />
            <path
              d={arcPath(R, a0, av)}
              fill="none"
              stroke="url(#ring-grad)"
              strokeWidth={W}
            />
          </g>
        );
      })}
      {/* числа у секторов: золото — оценено, курсив-приглушённо — 0.0 / н/о */}
      {slots.map((s, i) => {
        const mid = -90 + i * 60 + 30 + delta;
        const rad = (mid * Math.PI) / 180;
        const c = Math.cos(rad);
        const si = Math.sin(rad);
        const lr = R + W / 2 + 9;
        const lx0 = lr * c;
        const ly0 = lr * si;
        const anchor = c > 0.35 ? 'start' : c < -0.35 ? 'end' : 'middle';
        const lx = anchor === 'start' ? lx0 + 2 : anchor === 'end' ? lx0 - 2 : lx0;
        const fs = 10;
        const ly = si > 0.5 ? ly0 + fs + 1 : si < -0.5 ? ly0 - 3 : ly0 + fs * 0.36;
        const muted = !s.assessed;
        const zero = s.assessed && s.dead;
        return (
          <text
            key={`t-${s.axis.key}`}
            x={lx.toFixed(1)}
            y={ly.toFixed(1)}
            textAnchor={anchor}
            fontSize={fs}
            fontWeight={s.assessed && !s.dead ? 700 : 400}
            fill={muted ? '#55604f' : zero ? '#8a9284' : '#e5c179'}
            fontStyle={s.dead || muted ? 'italic' : undefined}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {s.tag ?? T('н/о')}
          </text>
        );
      })}
      {/* центр пустой — решение v17: счётчика больше нет */}
    </svg>
  );
}

/** Подсказка «где добрать данные» для неоценённой оси (тултип строки «н/о»). */
export const MISSING_HINTS: Record<string, string> = {
  acidity: 'шкала «Кислотность» во «Рте»',
  tannins: 'шкала «Танины» во «Рте»',
  body: 'шкала «Тело» во «Рте»',
  fruit: 'фруктовые дескрипторы на колесе «Носа»',
  minerality: 'минеральные дескрипторы на колесе «Носа»',
  sweetness: 'шкала «Сладость» во «Рте»',
};
