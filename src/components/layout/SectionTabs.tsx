import { useMemo } from 'react';
import { Award, BookOpen, Eye, Flower2, Gauge, Sparkles, Wine } from 'lucide-react';
import { SECTION_META, SECTION_ORDER, sectionFill, type SectionKey } from '@/state/completion';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';
import type { TastingRecord } from '@/types/tasting';

const ICONS: Record<string, typeof BookOpen> = {
  book: BookOpen,
  eye: Eye,
  flower: Flower2,
  wine: Wine,
  award: Award,
  sparkles: Sparkles,
  gauge: Gauge,
};

/** Десктопные табы разделов с индикатором заполнения (v19: список фильтруется по режиму). */
export function SectionTabs({
  active,
  onChange,
  record,
  sections = SECTION_ORDER,
}: {
  active: SectionKey;
  onChange: (k: SectionKey) => void;
  record: TastingRecord;
  sections?: SectionKey[];
}) {
  const fills = useMemo(
    () => Object.fromEntries(sections.map((k) => [k, sectionFill(k, record)])) as Record<SectionKey, number>,
    [record, sections],
  );
  const { t } = useLang();
  return (
    <nav className="hidden md:flex justify-center gap-1.5 py-3" aria-label={T('Разделы дегустации')}>
      {sections.map((k) => {
        const Icon = ICONS[SECTION_META[k].icon] ?? BookOpen;
        const fill = fills[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            aria-current={active === k ? 'page' : undefined}
            className={`relative flex items-center gap-2 h-10 px-3.5 rounded-xl text-[13px] font-medium transition-all ${
              active === k
                ? 'bg-surface border border-gold/50 text-gold-soft shadow-card'
                : 'text-ink-dim hover:text-ink hover:bg-surface/60'
            }`}
          >
            <Icon size={15} />
            {t.tabs[k] ?? SECTION_META[k].label}
            <span className="absolute -bottom-0.5 left-3 right-3 h-[3px] rounded-full bg-hairline overflow-hidden">
              <span
                className="block h-full rounded-full bg-gold transition-all duration-500"
                style={{ width: `${Math.round(fill * 100)}%` }}
              />
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Нижняя навигация для мобильных (thumb-zone), с прогрессом шагов. */
export function MobileBottomNav({
  active,
  onChange,
  record,
  sections = SECTION_ORDER,
}: {
  active: SectionKey;
  onChange: (k: SectionKey) => void;
  record: TastingRecord;
  sections?: SectionKey[];
}) {
  const { t } = useLang();
  const fills = useMemo(
    () => sections.map((k) => sectionFill(k, record)),
    [record, sections],
  );
  const overall = Math.round((fills.reduce((a, b) => a + Math.min(1, b), 0) / sections.length) * 100);
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-cellar/95 backdrop-blur-md border-t border-hairline no-print"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={T('Навигация по разделам')}
    >
      <div className="h-0.5 bg-hairline">
        <div className="h-full bg-gold transition-all duration-500" style={{ width: `${overall}%` }} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
        {sections.map((k, i) => {
          const Icon = ICONS[SECTION_META[k].icon] ?? BookOpen;
          const isActive = active === k;
          const fill = Math.min(1, fills[i] ?? 0);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 h-[58px] min-w-0 px-0.5 transition-colors ${
                isActive ? 'text-gold-soft' : 'text-ink-faint'
              }`}
            >
              {isActive && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-gold" />}
              <span className="relative">
                <Icon size={19} />
                <span
                  className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${
                    fill >= 1 ? 'bg-sage-juicy' : fill > 0.25 ? 'bg-gold' : 'bg-hairline'
                  }`}
                />
              </span>
              <span className="text-[9px] leading-none max-w-full truncate">{t.tabs[k] ?? SECTION_META[k].label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
