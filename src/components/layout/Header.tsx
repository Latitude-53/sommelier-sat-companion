import { Grape, Library, Printer, Save } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { vibrate } from '@/lib/haptics';
import { useLang, type Lang } from '@/lib/i18n';
import type { TastingMode } from '@/types/wset';

/** Компактный переключатель языка [ EN | RU ] для шапки (EN — дефолт релиза v11). */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang();
  const options: Lang[] = ['en', 'ru'];
  return (
    <div
      className={`flex rounded-xl border border-hairline bg-surface p-0.5 ${compact ? '' : 'gap-0.5'}`}
      role="radiogroup"
      aria-label={t.langAriaLabel}
    >
      {options.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => {
            vibrate(6);
            setLang(l);
          }}
          className={`h-8 px-2.5 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all ${
            lang === l ? 'bg-gold text-[#1a1408]' : 'text-ink-faint hover:text-ink'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Шапка: логотип, переключатель языков RU/EN, режимов WSET/Pro, действия. */
export function Header({
  mode,
  onModeChange,
  onLibrary,
  onExport,
  onSave,
  dirty,
}: {
  mode: TastingMode;
  onModeChange: (m: TastingMode) => void;
  onLibrary: () => void;
  onExport: () => void;
  onSave: () => void;
  dirty: boolean;
}) {
  const { t } = useLang();
  const modes: TastingMode[] = ['wset3', 'sommelier-pro'];
  const modeLabel = (m: TastingMode): string => (m === 'wset3' ? t.modeWset : t.modePro);
  return (
    <header className="sticky top-0 z-40 bg-cellar/92 backdrop-blur-md border-b border-hairline">
      <div className="mx-auto max-w-4xl px-3 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-garnet/25 border border-garnet/50 text-gold-soft shrink-0">
              <Grape size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="display text-lg leading-none text-ink truncate">{t.appTitle}</h1>
              {/* Каноническая формулировка квалификации — без «Protocol» (v10) */}
              <p className="text-[10px] tracking-[0.14em] uppercase text-ink-faint mt-1 truncate">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Переключатель языка RU / EN */}
            <LangToggle />

            {/* Переключатель методологий */}
            <div
              className="hidden sm:flex rounded-xl border border-hairline bg-surface p-1 gap-1"
              role="radiogroup"
              aria-label={t.modeAriaLabel}
            >
              {modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    vibrate(8);
                    onModeChange(m);
                  }}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    mode === m ? 'bg-garnet text-[#f6efe3]' : 'text-ink-dim hover:text-ink hover:bg-surface-2'
                  }`}
                >
                  {modeLabel(m)}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={onLibrary} icon={<Library size={17} />} aria-label={t.cellar}>
              <span className="hidden md:inline">{t.cellar}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onExport} icon={<Printer size={17} />} aria-label={t.export}>
              <span className="hidden md:inline">{t.export}</span>
            </Button>
            <Button variant="gold" size="sm" onClick={onSave} icon={<Save size={16} />}>
              <span className="hidden sm:inline">{dirty ? t.save : t.toCellar}</span>
            </Button>
          </div>
        </div>

        {/* Мобильный тумблер режимов (v10): разделение WSET/Pro — ядро
            приложения, он обязан быть доступен и на узком экране. */}
        <div className="sm:hidden pb-2">
          <div
            className="flex rounded-xl border border-hairline bg-surface p-1 gap-1"
            role="radiogroup"
            aria-label={t.modeAriaLabel}
          >
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  vibrate(8);
                  onModeChange(m);
                }}
                className={`flex-1 h-8 rounded-lg text-[11.5px] font-semibold whitespace-nowrap transition-all ${
                  mode === m ? 'bg-garnet text-[#f6efe3]' : 'text-ink-dim active:bg-surface-2'
                }`}
              >
                {modeLabel(m)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Бейдж активного режима (для мобильной шапки). */
export function ModeBadge({ mode }: { mode: TastingMode }) {
  const { t } = useLang();
  return <Badge tone={mode === 'wset3' ? 'gold' : 'garnet'}>{mode === 'wset3' ? t.modeWset : t.modePro}</Badge>;
}
