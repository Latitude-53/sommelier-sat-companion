import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { vibrate } from '@/lib/haptics';

type Variant = 'primary' | 'gold' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Тактильный отклик при клике. */
  tactile?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-garnet hover:bg-garnet-hover text-[#f6efe3] shadow-card',
  gold: 'bg-gold hover:bg-gold-soft text-[#1a1408] shadow-card',
  ghost: 'bg-transparent hover:bg-surface-2 text-ink-dim hover:text-ink',
  outline: 'bg-surface border border-hairline hover:border-gold text-ink hover:text-gold-soft',
  danger: 'bg-transparent border border-danger/60 hover:bg-danger/15 text-danger',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', icon, tactile = true, className = '', children, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      onClick={(e) => {
        if (tactile) vibrate(8);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
