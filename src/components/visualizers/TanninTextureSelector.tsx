import type { TanninTexture } from '@/types/wset';
import { vibrate } from '@/lib/haptics';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/* ═══════════════════════════════════════════════════════════════════════════
 * ИНТЕРАКТИВНАЯ МАТРИЦА ТЕКСТУРЫ ТАНИНОВ (ТЗ §БЛОК 3).
 *
 * Вместо плоских кнопок — сенсорная матрица: у каждой текстуры свой
 * микро-паттерн зерна (иконка), тактильное описание и анатомическая
 * подсказка — где именно на дёснах и слизистой вяжет вино.
 * ═══════════════════════════════════════════════════════════════════════════ */

const TANNIN_TEXTURE_GUIDE: Record<TanninTexture, { label: string; subtitle: string; zone: string; feel: string; icon: string }> = {
  silky: {
    label: 'Шелковистые',
    subtitle: 'Ультра-мелкая фракция',
    zone: 'Скользит по всему нёбу',
    feel: 'Ощущение гладкого атласа, полифенолы идеально встроены в структуру (Пино Нуар, зрелая Бургундия).',
    icon: '〜',
  },
  chalky: {
    label: 'Меловые',
    subtitle: 'Известковая пудра',
    zone: 'Центр языка и десны',
    feel: 'Сухая минеральная пыль, ощущение мела или талька между зубами (известняковый терруар, Санджовезе).',
    icon: '⸫',
  },
  velvety: {
    label: 'Бархатистые',
    subtitle: 'Плотный мягкий ворс',
    zone: 'Щёки и мягкое нёбо',
    feel: 'Обволакивающий, мягкий объемный ворс без агрессии (Мерло, спелый Напа Каберне).',
    icon: '≡',
  },
  grainy: {
    label: 'Зернистые',
    subtitle: 'Осязаемые частицы',
    zone: 'Внутренняя сторона губ',
    feel: 'Мелкая наждачная бумага, ощутимый полифенольный осадок на зубах (молодое Бордо, Каберне Совиньон).',
    icon: '⁘',
  },
  grippy: {
    label: 'Хваткие',
    subtitle: 'Мускульный зажим',
    zone: 'Передние верхние десны',
    feel: 'Стягивающий каркас, цепкое ощущение высушивания десен (Неббиоло, молодая Сира).',
    icon: '☵',
  },
  rustic: {
    label: 'Грубые',
    subtitle: 'Деревенский стиль',
    zone: 'Вся полость рта',
    feel: 'Шероховатые, угловатые, неотполированные танины с легкой горечью (Танат, автохтоны юга).',
    icon: '▲',
  },
};

/** Сенсорная матрица текстуры танинов: кнопки с зерном + карточка локализации. */
export function TanninTextureSelector({
  value,
  onChange,
}: {
  value: TanninTexture | null;
  onChange: (v: TanninTexture | null) => void;
}) {
  useLang();
  const current = value ? TANNIN_TEXTURE_GUIDE[value] : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(Object.entries(TANNIN_TEXTURE_GUIDE) as [TanninTexture, (typeof TANNIN_TEXTURE_GUIDE)[TanninTexture]][]).map(
          ([key, item]) => {
            const isActive = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  vibrate(6);
                  onChange(isActive ? null : key);
                }}
                aria-pressed={isActive}
                className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                  isActive
                    ? 'border-garnet bg-garnet/20 text-[#e8b3ac] shadow-[0_0_12px_rgba(154,74,68,0.3)]'
                    : 'border-hairline bg-surface/60 text-ink-dim hover:border-gold/40 hover:text-ink'
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-1">
                  <span className="text-[13px] font-bold">{T(item.label)}</span>
                  <span className="font-mono text-sm opacity-60" aria-hidden>
                    {item.icon}
                  </span>
                </div>
                <span className="block text-[10px] text-ink-faint truncate">{T(item.subtitle)}</span>
              </button>
            );
          },
        )}
      </div>

      {/* Интерактивная карточка сомелье при выборе: локализация + тактильный портрет */}
      {current && (
        <div className="rise-in rounded-xl border border-garnet/30 bg-garnet/10 p-3 text-xs leading-relaxed text-ink-dim">
          <div className="flex items-center gap-2 mb-1 text-[#e8b3ac] font-semibold text-[11.5px]">
            <span aria-hidden>◎</span>
            <span>{T('Локализация:')} {T(current.zone)}</span>
          </div>
          <p>{T(current.feel)}</p>
        </div>
      )}
    </div>
  );
}
