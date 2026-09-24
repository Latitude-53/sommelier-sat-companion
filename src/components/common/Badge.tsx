import type { ReactNode } from 'react';

type BadgeTone = 'gold' | 'sage' | 'garnet' | 'neutral' | 'danger';

const TONES: Record<BadgeTone, string> = {
  gold: 'bg-gold/15 text-gold-soft border-gold/40',
  sage: 'bg-sage/15 text-sage-juicy border-sage/40',
  garnet: 'bg-garnet/20 text-[#e8b3ac] border-garnet/50',
  neutral: 'bg-surface-2 text-ink-dim border-hairline',
  danger: 'bg-danger/15 text-[#f0a49b] border-danger/50',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold tracking-wide ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
