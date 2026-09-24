import type { ProfileAxis } from '@/engine/structuralProfile';
import { T } from '@/lib/tr';
import { useLang } from '@/lib/i18n';

/**
 * SVG-радар вкусового баланса 0–10 по осям структурного профиля.
 * Полигон с золотой заливкой + подписи осей.
 *
 * ДВУХКОНТУРНЫЙ РЕЖИМ (v9): если передан zenithProjection, поверх текущего
 * контура рисуется пунктирное шалфейное свечение «Контур зенита» —
 * проекция гармоничного купола на Золотом плато (танин полимеризуется,
 * кислота притирается, фрукт уходит в третичный шлейф).
 */
export function TasteRadar({
  axes,
  size = 320,
  accent = '#c59b4e',
  fill = 'rgba(197,155,78,0.16)',
  showValues = true,
  zenithProjection = null,
}: {
  axes: ProfileAxis[];
  size?: number;
  accent?: string;
  fill?: string;
  showValues?: boolean;
  /** Карта «ось → значение в зените»; null — второй контур не рисуется. */
  zenithProjection?: Record<string, number> | null;
}) {
  /* Перерисовка при смене языка (подписи осей). */
  useLang();
  const n = Math.max(3, axes.length);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.3;
  const labelR = R + size * 0.055;
  const SHORT: Record<string, string> = {
    acidity: 'Кислотность',
    tannins: 'Танины',
    body: 'Тело',
    fruit: 'Фруктовость',
    minerality: 'Минеральность',
    sweetness: 'Сладость',
  };

  const point = (i: number, r: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  const polygon = axes
    .map((a, i) => {
      const [x, y] = point(i, (Math.max(0.35, Math.min(10, a.value)) / 10) * R);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  /* Проекция будущего зенита (если передана) — пунктирный контур купола. */
  const zenithPolygon = zenithProjection
    ? axes
        .map((a, i) => {
          const futureVal = zenithProjection[a.key] ?? a.value;
          const [x, y] = point(i, (Math.max(0.35, Math.min(10, futureVal)) / 10) * R);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ')
    : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={T('Радар вкусового профиля')}
      style={{ overflow: 'visible' }}
    >
      {/* кольца */}
      {[2.5, 5, 7.5, 10].map((lvl) => (
        <polygon
          key={lvl}
          points={axes
            .map((_, i) => {
              const [x, y] = point(i, (lvl / 10) * R);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ')}
          fill={lvl === 10 ? 'rgba(255,255,255,0.02)' : 'none'}
          stroke="#2b3d30"
          strokeWidth="0.8"
        />
      ))}
      {/* спицы */}
      {axes.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2b3d30" strokeWidth="0.8" />;
      })}
      {/* Контур Зенита (будущее через 8–10 лет) — пунктирное шалфейное свечение */}
      {zenithPolygon && (
        <polygon points={zenithPolygon} fill="none" stroke="#8dc78a" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.65" strokeLinejoin="round" />
      )}
      {/* полигон */}
      <polygon points={polygon} fill={fill} stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      {/* вершины и значения */}
      {axes.map((a, i) => {
        const [x, y] = point(i, (Math.max(0.35, Math.min(10, a.value)) / 10) * R);
        const [lx, ly] = point(i, labelR);
        const anchor = Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end';
        return (
          <g key={a.key}>
            <circle cx={x} cy={y} r="3" fill={accent} />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={size * 0.036}
              fill="#9da395"
              fontWeight="600"
            >
              {T(SHORT[a.key] ?? a.label)}
            </text>
            {showValues && (
              <text
                x={lx}
                y={ly + size * 0.042}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={size * 0.042}
                fill="#e5c179"
                fontWeight="700"
                className="tnum"
              >
                {a.value.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Радар для печати: чёрные линии на белом. */
export function TasteRadarPrint({ axes, size = 300 }: { axes: ProfileAxis[]; size?: number }) {
  return <TasteRadar axes={axes} size={size} accent="#111111" fill="rgba(17,17,17,0.08)" showValues />;
}
