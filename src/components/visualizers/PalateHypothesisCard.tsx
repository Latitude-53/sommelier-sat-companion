import { Columns3, Layers, Sparkles, Zap } from 'lucide-react';
import type { PalateHypothesis } from '@/engine/palateHypothesis';
import { Tooltip } from '@/components/common/Tooltip';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/**
 * «Сенсорная гипотеза сомелье (Ожидание перед глотком)» — карточка под
 * колесом ароматов (ТЗ v3 §3.3). Появляется, когда выбран хотя бы один
 * дескриптор: три аккуратные карточки — кислотность / танины / тело.
 * Это ПРЕДСКАЗАНИЕ: сомелье сначала угадывает, потом сверяет во «Рту».
 */
export function PalateHypothesisCard({ hypothesis }: { hypothesis: PalateHypothesis }) {
  useLang();
  const lines = [
    { key: 'acidity', icon: Zap, title: 'Кислотность', ...hypothesis.acidity },
    { key: 'tannin', icon: Columns3, title: 'Танины', ...hypothesis.tannin },
    { key: 'body', icon: Layers, title: 'Тело', ...hypothesis.body },
  ];

  return (
    <div
      className="rise-in mt-4 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4"
      role="region"
      aria-label={T('Сенсорная гипотеза сомелье')}
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-gold-soft">
          <Sparkles size={14} className="text-gold-soft" />
          {T('Сенсорная гипотеза сомелье')}
          <span className="font-medium text-ink-faint">{T('· ожидание перед глотком')}</span>
        </h3>
        {hypothesis.register && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-cellar-deep/60 px-2.5 py-1 text-[10.5px] font-semibold text-gold-soft"
            title={`${T(hypothesis.register.hint)} · Φ_fresh = ${hypothesis.register.phi.toFixed(2)}`}
          >
            {hypothesis.register.label}
            <span className="tnum opacity-70">Φ {hypothesis.register.phi.toFixed(2)}</span>
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-2.5">
        {lines.map(({ key, icon: Icon, title, tone, note }) => (
          <div key={key} className="rounded-xl border border-hairline bg-cellar-deep/60 p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-widest text-ink-faint mb-1.5">
              <Icon size={12} className="text-gold-soft/80" /> {T(title)}
              <Tooltip text={T(`Гипотеза по составу колеса: ${title.toLowerCase()} до глотка. Сверьте в разделе «Рот».`)} />
            </p>
            <p className="text-[13px] font-bold text-ink leading-snug">{T(tone)}</p>
            <p className="text-[11px] text-ink-faint mt-1 leading-snug">{T(note)}</p>
          </div>
        ))}
      </div>

      <p className="text-[10.5px] text-ink-faint mt-3 leading-snug">
        {T('Гипотеза выдвигается до пробы: отметьте ожидания, сделайте глоток и сверьте с фактом во «Рту» — расхождения ценнее совпадений.')}
      </p>
    </div>
  );
}
