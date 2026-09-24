import { useEffect, useRef, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { T } from '@/lib/tr';

/**
 * Модальное окно с погребным стилем и закрытием по Esc/фону.
 * v6: на смартфонах — полноценный bottom-sheet («ручка» сверху, 88dvh,
 * overscroll-contain + -webkit-overflow-scrolling) — контент пресетов
 * больше не застревает при скролле на мобильных браузерах.
 * v14: порог bottom-sheet поднят с 640px до lg (1024px) — планшеты и
 * горизонтальные крупные телефоны (640–1023px) больше не получают
 * «висящее в центре» десктопное окно; шапка/ручка тянутся свайпом вниз
 * для закрытия (порог ~96px).
 * v14 (критично): рендер через createPortal(document.body) — раньше модалка
 * была потомком SectionCard с .rise-in (identity-transform), и position:fixed
 * привязывался к карточке, а не к вьюпорту: sheet «прилипал» к низу карты и
 * уезжал за экран, а центрирование считалось от карточки.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /* Свайп-вниз для bottom-sheet: тянем только за ручку/шапку, чтобы не
     конфликтовать со скроллом контента. */
  const dragStart = useRef<number | null>(null);
  const dragDy = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const dragTo = (clientY: number): void => {
    if (dragStart.current === null || !ref.current) return;
    const dy = Math.max(0, clientY - dragStart.current);
    dragDy.current = dy;
    ref.current.style.transition = 'none';
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const dragEnd = (): void => {
    dragStart.current = null;
    if (!ref.current) return;
    if (dragDy.current > 96) {
      onClose();
      return; // sheet размонтируется — сброс стилей не нужен
    }
    ref.current.style.transition = 'transform .24s var(--ease-sommelier)';
    ref.current.style.transform = '';
    dragDy.current = 0;
  };
  /** Первая точка касания (touch[0] может отсутствовать при phantom-событиях). */
  const touchY = (e: ReactTouchEvent): number | null => e.touches[0]?.clientY ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className={`modal-in relative w-full ${wide ? 'lg:max-w-3xl' : 'lg:max-w-lg'} max-h-[88dvh] lg:max-h-[85vh] flex flex-col rounded-t-2xl lg:rounded-2xl bg-surface border border-hairline shadow-cellar overflow-hidden`}
      >
        {/* Зона свайпа: «ручка» + шапка. touch-action:none — вертикальный жест
            не уходит в скролл. Кнопка закрытия кликается как обычно. */}
        <div
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => {
            const y = touchY(e);
            if (y === null) return;
            dragStart.current = y;
            dragDy.current = 0;
          }}
          onTouchMove={(e) => {
            const y = touchY(e);
            if (y !== null) dragTo(y);
          }}
          onTouchEnd={dragEnd}
          onTouchCancel={dragEnd}
        >
          {/* «Ручка» bottom-sheet на телефонах и планшетах */}
          <div className="lg:hidden flex justify-center pt-2.5 pb-1 shrink-0">
            <span className="w-10 h-1 rounded-full bg-hairline/80" />
          </div>
          <header className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-hairline shrink-0">
            <h2 className="display text-xl text-gold-soft truncate">{typeof title === 'string' ? T(title) : title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={T('Закрыть')}
              className="min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center rounded-xl text-ink-dim hover:text-ink hover:bg-surface-2 transition"
            >
              <X size={20} />
            </button>
          </header>
        </div>
        <div
          className="overflow-y-auto px-5 py-4 flex-1 min-h-0 overscroll-contain pb-10 lg:pb-5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
