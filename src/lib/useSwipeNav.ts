import { useRef } from 'react';

/**
 * useSwipeNav (v12) — горизонтальная свайп-навигация между разделами.
 *
 * Жест: |dx| ≥ 64 px, доминирует над вертикалью (|dx| ≥ 1.4·|dy|),
 * длительность ≤ 700 мс. Свайп вправо → предыдущий раздел (как перелистывание),
 * влево → следующий. Жесты, начавшиеся на форм-контролах, canvas и
 * data-noswipe-зонах (диск, осциллограф, дуга), игнорируются — там свои
 * pointer-жесты. Работает в паре с touch-action: pan-y на контейнере:
 * вертикальный скролл остаётся у браузера, горизонталь достаётся навигации.
 */
export function useSwipeNav({ onPrev, onNext, enabled = true }: {
  onPrev: () => void;
  onNext: () => void;
  enabled?: boolean;
}) {
  const start = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);

  const onTouchStart = (e: React.TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;
    const el = e.target as HTMLElement | null;
    const interactive = el?.closest(
      'input, textarea, select, option, canvas, [contenteditable="true"], [data-noswipe]',
    );
    start.current = { x: t.clientX, y: t.clientY, t: Date.now(), ok: !interactive };
  };

  const onTouchEnd = (e: React.TouchEvent): void => {
    const s = start.current;
    start.current = null;
    if (!enabled || !s || !s.ok) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const dt = Date.now() - s.t;
    if (dt > 700 || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    /* Сигнал подсказке «свайпните…» (SwipeHint) — жест освоен. */
    window.dispatchEvent(new Event('sat-swiped'));
    if (dx < 0) onNext();
    else onPrev();
  };

  return { onTouchStart, onTouchEnd };
}
