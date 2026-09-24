import { useMemo } from 'react';
import { PenLine, ShieldAlert } from 'lucide-react';
import type { AromaFamily, AromaSelection } from '@/types/wset';
import type { FaultRecord, NoseCustomTag, NoseData, TastingRecord } from '@/types/tasting';
import type { FaultSeverity, FaultType } from '@/types/wset';
import {
  CONDITION_CUES,
  CONDITION_OPTS,
  DEVELOPMENT_CUES,
  DEVELOPMENT_OPTS,
  FAULT_SEVERITY_OPTS,
  FAULT_TYPE_OPTS,
  INTENSITY_CUES,
  INTENSITY_OPTS,
} from '@/lib/catalog';
import { faultAnalysisOf } from '@/engine/structuralProfile';
import { palateHypothesisOf } from '@/engine/palateHypothesis';
import { ChipGroup } from '@/components/common/Chip';
import { CleanSensoryRail, GuidePanel, GuideToggle } from '@/components/common/CleanSensoryRail';
import { SectionCard } from '@/components/common/SectionCard';
import { Tooltip } from '@/components/common/Tooltip';
import { AromaWheel } from '@/components/visualizers/AromaWheel';
import { PalateHypothesisCard } from '@/components/visualizers/PalateHypothesisCard';
import { useTasting } from '@/state/TastingProvider';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';
import { Tb } from '@/components/common/Tb';
import { useState } from 'react';

/** Содержание инлайн-шпаргалки «Анатомия аромата» (бывшая модалка — ТЗ v4 §6). */
function NoseWheelGuideContent() {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-bold text-gold-soft mb-1">{T('1. Психофизический якорь (P F)')}</h4>
        <p>
          <Tb s="Если в вине есть одна вишня на ••• (3 балла), базовое ощущение фрукта уже высокое (7.6/10). Появление табака или кожи <b>не вычитает баллы из фрукта</b>, а добавляет комплексности. Ощущение растёт по Веберу–Фехнеру (логарифм), а не делится по остаточному принципу." />
        </p>
      </div>
      <div>
        <h4 className="font-bold text-gold-soft mb-1">{T('2. Регистр свежести (Φ fresh)')}</h4>
        <p>
          <b>{T('Primary Crunch (≥0.70):')}</b> {T('свежие цитрусы, зеленые яблоки и ягоды.')}
          <br />
          <b>{T('Tertiary Depth (<0.35):')}</b> {T('инжир, изюм, джем, сушеная слива. Они снимают колючую свежесть и сигнализируют о развитии вина.')}
        </p>
      </div>
      <div>
        <h4 className="font-bold text-gold-soft mb-1">{T('3. Энтропия Шеннона (Сложность BLIC)')}</h4>
        <p>
          {T('Считает баланс между семействами. Вино с одними фруктами = «Моно-фокус». Вино с Фруктами + Дубом + Кожей + Специями = «Комплексное (полифония)».')}
        </p>
      </div>
    </div>
  );
}

/**
 * Раздел «Нос» — чистое восприятие, никакой бухгалтерии.
 * Только: Чистота, Интенсивность, Развитие, живое колесо, заметки.
 * Все вычисления (оси радара, сложность, эволюция, страж пороков)
 * работают под капотом и раскрываются в «Сводке».
 */
export function NoseSection({
  record,
  onPatch,
  onToggleFault,
}: {
  record: TastingRecord;
  onPatch: (patch: Partial<NoseData>) => void;
  onToggleFault: (fault: FaultRecord) => void;
}) {
  const nose = record.nose;
  const { aromaLibrary, addCustomAroma, removeCustomAroma, isPro } = useTasting();
  const { t } = useLang();
  /* Инлайн-шпаргалка математики колеса (ТЗ v4 §6: аккордеон вместо модалки). */
  const [wheelGuideOpen, setWheelGuideOpen] = useState(false);
  /* Спойлер гипотезы: в экзаменационном режиме WSET свёрнут по умолчанию —
     студента не отвлекают предсказания до глотка (v10). */
  const [hypothesisOpen, setHypothesisOpen] = useState(false);
  const faultInfo = useMemo(() => faultAnalysisOf(record), [record]);
  /* Гипотеза перед глотком: пересчитывается на каждое изменение колеса. */
  const hypothesis = useMemo(() => palateHypothesisOf(record), [record]);
  const hasAromas = Object.keys(nose.aromas).length > 0;
  /* Модуляция сил колеса: нос → иначе вкус (ТЗ v3 §2.1 п.4). */
  const modulation = nose.intensity ?? record.palate.flavourIntensity ?? null;

  /* Свой дескриптор: в глобальную библиотеку (IndexedDB) + в карточку. */
  const addCustom = (family: AromaFamily, label: string): void => {
    void addCustomAroma(family, label);
  };
  /* Крестик: из глобальной библиотеки И из текущей карточки (ТЗ §1.3). */
  const removeCustom = (tagId: string): void => {
    void removeCustomAroma(tagId);
  };
  /* Первый тап по библиотечному тегу: прикрепить к карточке и дать •. */
  const useLibraryTag = (tag: NoseCustomTag): void => {
    onPatch({
      customTags: nose.customTags.some((t) => t.id === tag.id) ? nose.customTags : [...nose.customTags, tag],
      aromas: { ...nose.aromas, [tag.id]: 1 } as AromaSelection,
    });
  };

  const faultList = (type: FaultType): FaultSeverity | null =>
    nose.faults.find((f) => f.type === type)?.severity ?? null;

  return (
    <SectionCard
      title={t.sections.nose}
      subtitle="Чистота, состояние, ароматический профиль"
      badge={
        <Tooltip text="Колесо работает под капотом: семейства кормят оси «Фруктовость» и «Минеральность», сложность BLIC и индекс эволюции — всё это раскроется в «Сводке»." />
      }
    >
      <CleanSensoryRail
        label="Чистота"
        options={CONDITION_OPTS}
        value={nose.condition}
        onChange={(v) => onPatch({ condition: v })}
        cues={CONDITION_CUES}
        tone={nose.condition === 'unclean' ? 'garnet' : 'sage'}
      />

      {nose.condition === 'unclean' && (
        <div className="mb-4 rounded-xl border border-garnet/40 bg-garnet/10 p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#e8b3ac] mb-2.5">
            <ShieldAlert size={14} /> {T('Отметьте дефекты и их выраженность')}
          </p>
          <div className="space-y-2">
            {FAULT_TYPE_OPTS.map((ft) => (
              <div key={ft.value} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[13px] text-ink" title={T(ft.hint)}>
                  {T(ft.label)}
                </span>
                <ChipGroup
                  options={FAULT_SEVERITY_OPTS}
                  value={faultList(ft.value)}
                  onChange={(sev) => {
                    if (sev) onToggleFault({ type: ft.value, severity: sev });
                    else
                      onPatch({
                        faults: nose.faults.filter((f) => f.type !== ft.value),
                      });
                  }}
                  tone="garnet"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <CleanSensoryRail
        label="Интенсивность"
        options={INTENSITY_OPTS}
        value={nose.intensity}
        onChange={(v) => onPatch({ intensity: v })}
        cues={INTENSITY_CUES}
      />
      <CleanSensoryRail
        label="Развитие"
        options={DEVELOPMENT_OPTS}
        value={nose.development}
        onChange={(v) => onPatch({ development: v })}
        cues={DEVELOPMENT_CUES}
        tone="sage"
      />

      <div className="pb-4 mb-4 border-b border-hairline/60">
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <span className="text-[13px] font-semibold text-ink">{T('Колесо ароматов')}</span>
          {/* ТЗ v4 §6: шпаргалка — инлайн-аккордеон под блоком колеса, без модалок */}
          <GuideToggle open={wheelGuideOpen} onClick={() => setWheelGuideOpen(!wheelGuideOpen)} />
        </div>
        {wheelGuideOpen && (
          <GuidePanel className="mb-2.5">
            <NoseWheelGuideContent />
          </GuidePanel>
        )}
        <AromaWheel
          selection={nose.aromas}
          onChange={(aromas) => onPatch({ aromas })}
          faults={nose.faults}
          libraryTags={aromaLibrary}
          customTags={nose.customTags}
          onAddCustom={addCustom}
          onRemoveCustom={removeCustom}
          onUseLibraryTag={useLibraryTag}
          intensity={modulation}
          onFaultLevel={(type, level) => {
            const others = nose.faults.filter((f) => f.type !== type);
            if (level === null) {
              // Убрали последний дефект — возвращаем вину статус «чистое»
              onPatch({
                faults: others,
                ...(others.length === 0 && nose.condition === 'unclean' ? { condition: 'clean' as const } : {}),
              });
            } else {
              const severity: FaultSeverity = level === 1 ? 'light' : level === 2 ? 'distinct' : 'heavy';
              onPatch({ faults: [...others, { type, severity }], condition: 'unclean' });
            }
          }}
        />
        {/* ТЗ v3 §3.3 / v10: сенсорная гипотеза сомелье.
            Pro — живая гипотеза перед глотком развёрнута сразу.
            WSET L3 — аккуратный спойлер [+ Гипотеза сомелье (Pro)]. */}
        {hasAromas && isPro && <PalateHypothesisCard hypothesis={hypothesis} />}
        {hasAromas && !isPro && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setHypothesisOpen(!hypothesisOpen)}
              className="text-[11.5px] text-gold-soft hover:underline inline-flex items-center gap-1 transition"
            >
              <span>{hypothesisOpen ? `▲ ${t.spoiler.hypothesis}` : `[+ ${t.spoiler.hypothesis}]`}</span>
            </button>
            {hypothesisOpen && (
              <div className="mt-2">
                <PalateHypothesisCard hypothesis={hypothesis} />
              </div>
            )}
          </div>
        )}
        {/* Диагностика пороков видна только пока дефект реален (фатальный
            или стилистический 2–3 •); мягкая терруарная подсказка уходит
            в «Сводку», чтобы не ломать магию дегустации. */}
        {faultInfo.faultyMode && (
          <div className="mt-3 rounded-xl border border-garnet/40 bg-garnet/10 p-3.5">
            <p className="text-[12px] text-[#e8b3ac] leading-snug">
              <span className="font-semibold">{T('Режим дефекта активен.')}</span>{' '}
              {faultInfo.fatal.length > 0
                ? T('Фатальный порок: ')
                : T('Стилистический дефект 2–3 •: ')}
              {T('вердикт качества не выше «Acceptable» (принудительно «Faulty»), потенциал выдержки закрыт — «Не подходит для выдержки».')}
            </p>
          </div>
        )}
      </div>

      <label className="block">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
          <PenLine size={12} /> {T('Заметки по носу')}
        </span>
        <textarea
          value={nose.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          rows={2}
          placeholder={T('Кремень и сланец, мокрый камень…')}
          className="w-full px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
        />
      </label>
    </SectionCard>
  );
}
