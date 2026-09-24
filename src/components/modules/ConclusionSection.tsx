import { Award, Sparkles, PenLine } from 'lucide-react';
import { useState } from 'react';
import type { BlicRating } from '@/types/wset';
import type { ConclusionData, TastingRecord } from '@/types/tasting';
import { BLIC_KEYS, BLIC_RATING_OPTS, QUALITY_OPTS, READINESS_OPTS } from '@/lib/catalog';
import { Badge } from '@/components/common/Badge';
import { ChipGroup, ScaleRow } from '@/components/common/Chip';
import { SectionCard } from '@/components/common/SectionCard';
import { Tooltip } from '@/components/common/Tooltip';
import { suggestBlic, suggestQuality, faultAnalysisOf, WSET_TO_100_RANGES } from '@/engine/structuralProfile';
import { computeStructuralProfile } from '@/engine/structuralProfile';
import { useTasting } from '@/state/TastingProvider';
import { useToast } from '@/components/common/Toast';
import { WineLifeArcCard } from '@/components/visualizers/WineLifeArcCard';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

const QUALITY_TONE: Record<string, 'garnet' | 'gold' | 'sage' | 'neutral' | 'danger'> = {
  faulty: 'danger',
  poor: 'danger',
  acceptable: 'neutral',
  good: 'gold',
  'very-good': 'gold',
  outstanding: 'sage',
};

const CHIP_TONE = { gold: 'gold', sage: 'sage', garnet: 'garnet', neutral: 'gold', danger: 'garnet' } as const;

/** Раздел «Итог»: BLIC, вердикт качества, готовность, окно питья, 100-балльная (Pro). */
export function ConclusionSection({ record }: { record: TastingRecord }) {
  const { dispatch, isPro, profile } = useTasting();
  const { t } = useLang();
  const toast = useToast();
  /* Дуга жизни: в экзаменационном режиме WSET свёрнута в спойлер — студент
     сначала видит стандартные поля BLIC и вердикта (v10). */
  const [showLifeArc, setShowLifeArc] = useState(false);
  const c = record.conclusion;
  const onPatch = (patch: Partial<ConclusionData>): void => dispatch({ type: 'patch-conclusion', patch });

  const hasFault = record.nose.faults.length > 0 && record.nose.condition === 'unclean';

  const autoBlic = (): void => {
    const suggestion = suggestBlic(record, computeStructuralProfile(record));
    onPatch({ blic: suggestion });
    toast(T('BLIC заполнен по данным дегустации'), 'info');
  };

  const autoQuality = (): void => {
    const q = suggestQuality(c.blic, hasFault);
    if (!q) {
      toast(T('Сначала заполните все 4 компонента BLIC'), 'warn');
      return;
    }
    /* Жёсткая связка (БЛОК 1): вердикт сам ставит балл на медиану коридора. */
    const range = WSET_TO_100_RANGES[q];
    if (isPro) onPatch({ quality: q, score100: range.def });
    else onPatch({ quality: q });
    toast(`${T('Предложено')}: ${T(QUALITY_OPTS.find((o) => o.value === q)?.label ?? '')}${isPro ? ` · ${range.def}/100` : ''}`, 'ok');
  };

  return (
    <SectionCard
      title={t.sections.conclusion}
      subtitle="Модель BLIC и вердикт качества"
      badge={<Tooltip text={T('WSET L3: качество оценивается строго по BLIC без численных очков. 100-балльная шкала доступна только в режиме Сомелье Pro.')} />}
    >
      {/* BLIC */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
            <Award size={15} className="text-gold-soft" /> {T('BLIC — четыре опоры')}
          </span>
          <button
            type="button"
            onClick={autoBlic}
            className="flex items-center gap-1 text-[11px] text-gold-soft hover:text-ink transition"
          >
            <Sparkles size={12} /> {T('автозаполнить')}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {BLIC_KEYS.map((b) => (
            <div key={b.key} className="rounded-xl border border-hairline bg-cellar-deep/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-ink">{T(b.label)}</span>
                <Tooltip text={T(b.tooltip)} />
              </div>
              <ChipGroup<BlicRating>
                options={BLIC_RATING_OPTS}
                value={c.blic[b.key] ?? null}
                onChange={(v) => onPatch({ blic: { ...c.blic, [b.key]: v ?? undefined } })}
                tone={c.blic[b.key] === 'strong' ? 'sage' : c.blic[b.key] === 'weak' ? 'garnet' : 'gold'}
              />
              {b.key === 'complexity' && (
                <p className="text-[11px] text-ink-faint mt-2">
                  {T('Автоподсчёт по семействам: ')}{profile.complexity.families} → {T(profile.complexity.label)}
                </p>
              )}
              {b.key === 'length' && profile.finishSeconds !== null && (
                <p className="text-[11px] text-ink-faint mt-2 tnum">{T('Послевкусие')}: ≈ {profile.finishSeconds} {T('с')}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Вердикт качества */}
      <div className="pb-4 mb-4 border-b border-hairline/60">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-semibold text-ink">{T('Вердикт качества (WSET)')}</span>
          <button type="button" onClick={autoQuality} className="flex items-center gap-1 text-[11px] text-gold-soft hover:text-ink transition">
            <Sparkles size={12} /> {T('по BLIC')}
          </button>
        </div>
        <ChipGroup
          options={QUALITY_OPTS}
          value={c.quality}
          onChange={(v) => {
            /* Жёсткая связка (БЛОК 1): смена вердикта сама ставит ползунок
               100-балльной шкалы на медиану канонического коридора. */
            const range = v ? WSET_TO_100_RANGES[v] : undefined;
            if (v && isPro && range) onPatch({ quality: v, score100: range.def });
            else onPatch({ quality: v });
          }}
          tone={c.quality ? (CHIP_TONE[QUALITY_TONE[c.quality] ?? 'gold']) : 'gold'}
        />
        {c.quality && (
          <div className="mt-2">
            <Badge tone={QUALITY_TONE[c.quality] ?? 'neutral'}>
              {c.quality === 'outstanding' ? 'Outstanding' : c.quality === 'very-good' ? 'Very good' : c.quality === 'good' ? 'Good' : c.quality === 'acceptable' ? 'Acceptable' : c.quality === 'poor' ? 'Poor' : 'Faulty'}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Кривая жизни вина (ТЗ v4 §7 / v10): Pro — живая параметрическая дуга
             сразу; WSET L3 — под спойлером, чтобы экзаменационный бланк был
             кристально чистым. 100-балльная шкала в WSET скрыта намертво ниже. ── */}
      {isPro ? (
        <WineLifeArcCard record={record} profile={profile} faultyMode={faultAnalysisOf(record).faultyMode} />
      ) : (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowLifeArc(!showLifeArc)}
            className="text-[11.5px] text-gold-soft hover:underline inline-flex items-center gap-1 transition"
          >
            <span>{showLifeArc ? `▲ ${t.spoiler.lifeArcHide}` : `▼ ${t.spoiler.lifeArc}`}</span>
          </button>
          {showLifeArc && (
            <div className="mt-2">
              <WineLifeArcCard record={record} profile={profile} faultyMode={faultAnalysisOf(record).faultyMode} />
            </div>
          )}
        </div>
      )}

      <ScaleRow label="Готовность к употреблению" options={READINESS_OPTS} value={c.readiness} onChange={(v) => onPatch({ readiness: v })} tone="sage" />

      {faultAnalysisOf(record).faultyMode && (
        <div className="mt-3 rounded-xl border border-garnet/40 bg-garnet/10 p-3.5">
          <p className="text-[12px] text-[#e8b3ac] leading-snug">
            <span className="font-semibold">{T('Не подходит для выдержки.')}</span>{' '}
            {faultAnalysisOf(record).fatal.length > 0
              ? T('Фатальный порок (винификация/хранение убили вино)')
              : T('Стилистический дефект 2–3 •')}
            {' '}{T('→ вердикт принудительно «Faulty», готовность — «Пить сейчас», окно питья зажато текущим годом.')}
            {isPro ? T(' Балл 100-балльной шкалы следует коридору вердикта (дефектное: 50–69).') : ''}
          </p>
        </div>
      )}

      {/* Окно питья */}
      <div className="pb-4 mb-4 border-b border-hairline/60 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">{T('Окно питья: с')}</span>
          <input
            type="number"
            value={c.windowFrom ?? ''}
            placeholder={String(new Date().getFullYear())}
            onChange={(e) => onPatch({ windowFrom: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full h-11 px-3.5 rounded-xl bg-cellar-deep border border-hairline text-sm tnum focus:border-gold focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">{T('до')}</span>
          <input
            type="number"
            value={c.windowTo ?? ''}
            placeholder="2035"
            onChange={(e) => onPatch({ windowTo: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full h-11 px-3.5 rounded-xl bg-cellar-deep border border-hairline text-sm tnum focus:border-gold focus:outline-none"
          />
        </label>
      </div>

      {/* 100-балльная шкала с коридором вердикта (динамический ограничитель) — только Pro */}
      {isPro && (
        <div className="mb-4 rounded-xl border border-garnet/30 bg-garnet/5 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[13px] font-semibold text-ink">{T('100-балльная шкала (Parker / CMS)')}</span>
            {c.quality && (
              <span className="text-[11px] font-semibold text-gold-soft tnum">
                {T('Коридор вердикта')}: {WSET_TO_100_RANGES[c.quality]?.min}–{WSET_TO_100_RANGES[c.quality]?.max}
              </span>
            )}
          </div>

          {(() => {
            const currentRange = c.quality ? WSET_TO_100_RANGES[c.quality] : { min: 50, max: 100, def: 85 };
            /* Устаревший балл вне нового коридора показываем зажатым в границы. */
            const currentScore = Math.min(currentRange.max, Math.max(currentRange.min, c.score100 ?? currentRange.def));
            const fillPercent = ((currentScore - currentRange.min) / (currentRange.max - currentRange.min || 1)) * 100;

            return (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="tnum text-xs text-ink-faint w-6 text-right">{currentRange.min}</span>
                  <input
                    type="range"
                    className="sommelier-range flex-1"
                    style={{ ['--fill' as string]: `${Math.max(0, Math.min(100, fillPercent))}%` }}
                    min={currentRange.min}
                    max={currentRange.max}
                    value={currentScore}
                    onChange={(e) => onPatch({ score100: Number(e.target.value) })}
                    aria-label={T('Балл 100-шкалы')}
                  />
                  <span className="tnum text-xs text-ink-faint w-6">{currentRange.max}</span>
                  <span className="tnum text-3xl font-bold text-gold-soft w-[64px] text-right">{currentScore}</span>
                </div>
                <p className="text-[10px] text-ink-faint flex items-center justify-between flex-wrap gap-x-3">
                  <span>
                    {c.quality
                      ? `${T('Шкала строго зафиксирована в рамках вердикта')} «${T(QUALITY_OPTS.find((x) => x.value === c.quality)?.label ?? '—')}».`
                      : T('Сначала выберите вердикт качества — шкала встанет в его коридор.')}
                  </span>
                  <span>{T('Медиана')}: {currentRange.def}</span>
                </p>
              </div>
            );
          })()}
          <p className="text-[10px] text-ink-faint mt-1">{T('В режиме WSET эта шкала скрыта принципиально.')}</p>
        </div>
      )}

      <label className="block">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
          <PenLine size={12} /> {T('Заключение')}
        </span>
        <textarea
          value={c.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          rows={3}
          placeholder={T('Финальный аккорд дегустации…')}
          className="w-full px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
        />
      </label>
    </SectionCard>
  );
}
