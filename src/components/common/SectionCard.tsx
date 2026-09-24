import type { ReactNode } from 'react';
import { T } from '@/lib/tr';

/** Карточка раздела: заголовок антиквой + опциональные действия и подсказка. */
export function SectionCard({
  title,
  subtitle,
  badge,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  /** Компактные кнопки в шапке (например, «Шпаргалка» — инспектор сомелье). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const tt = T(title);
  const st = subtitle ? T(subtitle) : undefined;
  return (
    <section className="rise-in rounded-2xl bg-surface border border-hairline shadow-card p-4 sm:p-6" aria-label={tt}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-2xl sm:text-[28px] leading-tight text-ink">{tt}</h2>
          {st ? <p className="text-[13px] text-ink-dim mt-1">{st}</p> : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          {badge}
        </div>
      </header>
      {children}
    </section>
  );
}
