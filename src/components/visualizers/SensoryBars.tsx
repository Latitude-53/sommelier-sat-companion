import type { ProfileAxis } from '@/engine/structuralProfile';
import { T } from '@/lib/tr';

/**
 * Печатная лента (v15 → v17): чёрные бары на белом для печатного листа
 * и формальных экспортов — школьный порядок осей, градации не нужны,
 * только числа. Экранная визуализация профиля с v17 — «Кольцо баланса»
 * (RingGauge) со строками расчёта; лента и «Полнота профиля» с экрана
 * убраны (полнота читается из формы кольца).
 */

const pct = (v: number): number => Math.min(10, Math.max(0, v)) * 10;

/** Печатная лента: чёрные бары на белом, градации не нужны — только числа. */
export function SensoryBarsPrint({ axes }: { axes: ProfileAxis[] }) {
  const cell: React.CSSProperties = { display: 'grid', gridTemplateColumns: '96px 1fr 44px', gap: 9, alignItems: 'center', padding: '4.5px 0' };
  return (
    <div style={{ width: 286 }}>
      {axes.map((a) => {
        const assessed = a.contributions.length > 0;
        return (
          <div key={a.key} style={cell}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: assessed ? '#1d1a15' : '#999' }}>{T(a.label)}</span>
            <span
              style={{
                position: 'relative',
                display: 'block',
                height: 9,
                borderRadius: 999,
                border: assessed ? '1px solid #b9b2a0' : '1px dashed #b9b2a0',
                background: assessed ? '#f3efe6' : 'transparent',
              }}
            >
              {assessed && (
                <span
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, background: '#1d1a15', opacity: 0.82, width: `${pct(a.value)}%` }}
                />
              )}
            </span>
            <span style={{ textAlign: 'right', fontSize: 10.5, color: assessed ? '#1d1a15' : '#999', fontStyle: assessed ? 'normal' : 'italic' }}>
              {assessed ? a.value.toFixed(1) : T('н/о')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
