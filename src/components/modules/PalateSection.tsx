import { useEffect, useRef, useState } from 'react';
import { PenLine, Timer, Undo2 } from 'lucide-react';
import type { PalateData, TastingRecord } from '@/types/tasting';
import {
  ACIDITY_CUES,
  ACIDITY_OPTS,
  ALCOHOL_CUES,
  ALCOHOL_FEEL_OPTS,
  ALCOHOL_OPTS,
  ALCOHOL_PERCEPTION_OPTS,
  BALANCE_ISSUE_OPTS,
  BODY_CUES,
  BODY_OPTS,
  FINISH_ACCENT_CUES,
  FINISH_ACCENT_OPTS,
  FINISH_CUES,
  FINISH_OPTS,
  INTENSITY_CUES,
  INTENSITY_OPTS,
  SWEETNESS_CUES,
  SWEETNESS_OPTS,
  TANNIN_CUES,
} from '@/lib/catalog';
import { Badge } from '@/components/common/Badge';
import { Chip } from '@/components/common/Chip';
import { CleanSensoryRail } from '@/components/common/CleanSensoryRail';
import { SectionCard } from '@/components/common/SectionCard';
import { Tooltip } from '@/components/common/Tooltip';
import { Tb } from '@/components/common/Tb';
import { AcidityCurvePicker } from '@/components/visualizers/AcidityCurve';
import { TanninTextureSelector } from '@/components/visualizers/TanninTextureSelector';
import { vibrate } from '@/lib/haptics';
import { useTasting } from '@/state/TastingProvider';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/* ── Инлайн-шпаргалки калибровки (ТЗ v4 §6: аккордеоны вместо модалок) ────── */

function AcidityGuideContent() {
  return (
    <div className="space-y-2.5">
      <div>
        <h4 className="font-bold text-gold-soft mb-1">{T('Калибровка кислотности')}</h4>
        <p>
          <Tb s="• <b>Низкая:</b> плоское, как тёплая вода без лимона." />
          <br /><Tb s="• <b>Средняя:</b> спелое яблоко или персик — слюна собирается естественно." />
          <br /><Tb s="• <b>Высокая:</b> раскусить дольку лимона — челюсти сводит, слюна течёт ручьём по бокам языка." />
        </p>
      </div>
      <p className="text-ink-faint">
        {T('Кислотность — «скелет» вина: она же поднимает волну на осциллографе выше (Высокая = ×1.35 амплитуды).')}
      </p>
    </div>
  );
}

function TanninGuideContent() {
  return (
    <div className="space-y-2.5">
      <div>
        <h4 className="font-bold text-gold-soft mb-1">{T('Калибровка танинов: тест десны')}</h4>
        <p>
          {T('Через 5 секунд после глотка проведите языком по дёснам над передними зубами. Гладкая поверхность — танины низкие. Десна прилипает к губе, как замша, — танины высокие.')}
        </p>
      </div>
      <div>
        <h4 className="font-bold text-gold-soft mb-1">{T('Танины дуба vs танины винограда')}</h4>
        <p>
          <Tb s="<b>Дуб (бочка):</b> приходит «с приправой» — ваниль, тост, кокос, гвоздика; вяжет аккуратно, чаще нёбо и передние десны." />
          <br />
          <Tb s="<b>Виноград (кожица, семена, гребни):</b> суше и горче, вяжет всю полость, горчинка чувствуется в финише." />
          <br />
          {T('Быстрый тест: если в аромате ваниль/дым/тост — часть танинов принесла бочка.')}
        </p>
      </div>
    </div>
  );
}

/** Спиртомер (v17, макет «Алкоголь-переработка», вариант B): один прибор вместо
 *  рейки «Алкоголь» и шапки интеграции. Калибр подсоединяется к ABV из Титула
 *  автоматически (те же пороги, что у детектора аномалий: ≤10.5% → низкий,
 *  <14% → средний, 14%+ → высокий) — процент больше не выбирается руками
 *  второй раз; ручной выбор остаётся только для карточек без крепости.
 *  Интеграция спирта — пять сегментов-градиент от шалфея к гранату (тап по
 *  сегменту), ощущения — под катом как необязательный слой. */
function SpirtoMeter({
  record,
  onPatch,
}: {
  record: TastingRecord;
  onPatch: (patch: Partial<PalateData>) => void;
}) {
  const abv = record.identity.abv;
  const auto: 'low' | 'medium' | 'high' | null =
    abv !== null ? (abv <= 10.5 ? 'low' : abv < 14 ? 'medium' : 'high') : null;
  const feel = record.palate.alcoholFeel;
  const notes = record.palate.alcoholNotes;
  const [foldOpen, setFoldOpen] = useState(false);
  const active = ALCOHOL_FEEL_OPTS.find((o) => o.value === feel);
  const toggleNote = (key: string): void => {
    vibrate(6);
    onPatch({
      alcoholNotes: notes.includes(key) ? notes.filter((n) => n !== key) : [...notes, key].slice(0, 6),
    });
  };
  return (
    <div className="pb-4 mb-4 border-b border-hairline/60">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <span className="text-[13px] font-semibold text-ink">{T('Алкоголь')}</span>
        <span className="text-[11px] text-ink-faint">
          {abv !== null ? T('калибр из ABV Титула') : T('ABV не указан — калибр вручную')}
        </span>
      </div>
      <div className="rounded-xl border border-hairline bg-cellar-deep/40 p-3.5">
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <div className="shrink-0 min-w-[86px]">
            <div className="tnum text-[30px] leading-none font-extrabold text-gold-soft">
              {abv !== null ? `${abv}%` : '—%'}
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.08em] text-ink-faint mt-1">
              {T('% об. · из Титула')}
            </div>
          </div>
          <div className="flex-1 min-w-[230px]">
            {auto ? (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[15px] font-bold text-ink">
                  {T(ALCOHOL_OPTS.find((o) => o.value === auto)?.label ?? '')}
                </span>
                <span className="text-[9.5px] uppercase tracking-[0.07em] text-sage-juicy border border-sage-juicy/35 rounded-full px-2 py-px">
                  {T('авто по ABV')}
                </span>
              </div>
            ) : (
              /* Фолбэк: ABV в карточке нет — калибр выбирается вручную. */
              <div className="flex items-center gap-1.5 flex-wrap mb-2" role="group" aria-label={T('Алкоголь')}>
                {ALCOHOL_OPTS.map((o) => {
                  const on = record.palate.alcohol === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        vibrate(6);
                        onPatch({ alcohol: o.value });
                      }}
                      className={`min-h-[36px] px-3 rounded-xl text-[12px] border transition-all active:scale-[0.96] ${
                        on
                          ? 'border-gold bg-gold/15 text-gold-soft font-semibold'
                          : 'border-hairline bg-surface text-ink-dim hover:text-ink'
                      }`}
                    >
                      {T(o.label)}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Пять сегментов-градиент: шалфей → золото → гранат (в духе матрицы текстуры) */}
            <div className="flex gap-1" role="group" aria-label={T('Восприятие алкоголя')}>
              {ALCOHOL_FEEL_OPTS.map((o, i) => {
                const on = feel === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={T(o.label)}
                    title={T(o.label)}
                    onClick={() => {
                      vibrate(6);
                      onPatch({ alcoholFeel: on ? null : o.value });
                    }}
                    className="flex-1 min-h-[15px] rounded-[5px] border transition-all active:scale-[0.97]"
                    style={
                      on
                        ? {
                            background: `linear-gradient(90deg, ${ALCOHOL_FEEL_OPTS[i - 1]?.hue ?? o.hue}, ${o.hue})`,
                            borderColor: 'transparent',
                            boxShadow: `0 0 10px -2px ${o.hue}88`,
                          }
                        : { background: `${o.hue}24`, borderColor: '#2b3d30' }
                    }
                  />
                );
              })}
            </div>
            <div className="flex justify-between gap-1 flex-wrap text-[9px] text-ink-faint mt-1.5">
              {ALCOHOL_FEEL_OPTS.map((o) => (
                <span key={o.value} className={feel === o.value ? 'text-gold-soft font-semibold' : undefined}>
                  {T(o.label)}
                </span>
              ))}
            </div>
            {/* Живая фраза-микрокопия под активным сегментом */}
            <p className="text-[11.5px] text-ink-dim mt-2 leading-snug min-h-[16px]">
              {active ? T(active.phrase) : T('Как спирт ведёт себя в бокале: спрятан в плоде или вылезает горячей волной?')}
            </p>
          </div>
        </div>
        {/* Физиологический ориентир калибра (CUES из каталога) */}
        {auto && (
          <p className="text-[10.5px] text-ink-faint mt-2.5 leading-snug">
            ↳ {T(ALCOHOL_CUES[auto] ?? '')}
          </p>
        )}
        {/* Ощущения спирта — под катом: опциональный слой «где именно спирт проявляется» */}
        <div className="mt-3 rounded-lg border border-hairline overflow-hidden">
          <button
            type="button"
            onClick={() => setFoldOpen((v) => !v)}
            aria-expanded={foldOpen}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11.5px] text-ink-dim hover:bg-white/[0.02] transition-colors"
          >
            <b className="font-semibold text-ink">{T('Ощущения спирта')}</b>
            <span className="text-ink-faint">· {T('необязательно')}</span>
            <span className="tnum text-[10px] text-gold-soft border border-gold/35 rounded-full px-2 py-px">
              {notes.length} / {ALCOHOL_PERCEPTION_OPTS.length}
            </span>
            <span className="ml-auto text-ink-faint text-[10px]">{foldOpen ? '▾' : '▸'}</span>
          </button>
          {foldOpen && (
            <div className="px-3 pb-2.5 pt-2 border-t border-dashed border-hairline/70 flex flex-wrap gap-1.5">
              {ALCOHOL_PERCEPTION_OPTS.map((o) => (
                <Chip key={o.value} active={notes.includes(o.value)} tone="gold" onClick={() => toggleNote(o.value)}>
                  {T(o.label)}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Каудалиемер: секундомер послевкусия (Pro-режим). */
function Caudaliemeter({
  seconds,
  onDone,
}: {
  seconds: number | null;
  onDone: (s: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => {
        setElapsed((Date.now() - startRef.current) / 1000);
      }, 100);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  const stop = (): void => {
    setRunning(false);
    onDone(Math.round(elapsed));
    vibrate([15, 40, 15]);
  };

  const classOf = (s: number): { label: string; tone: 'gold' | 'sage' | 'neutral' } =>
    s >= 8 ? { label: T('класс: 8+ секунд'), tone: 'sage' } : s >= 5 ? { label: T('достойно'), tone: 'gold' } : { label: T('коротко'), tone: 'neutral' };

  return (
    <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-gold-soft" />
          <span className="text-[13px] font-semibold text-ink">{T('Каудалиемер')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="tnum text-2xl font-bold text-gold-soft min-w-[72px] text-right">
            {running || elapsed > 0 ? `${elapsed.toFixed(1)} ${T('с')}` : seconds !== null ? `${seconds} ${T('с')}` : '—'}
          </span>
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="min-h-[44px] px-4 rounded-xl bg-garnet text-[#f6efe3] text-sm font-semibold active:scale-[0.97]"
            >
              {T('Стоп')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                vibrate(8);
                setElapsed(0);
                startRef.current = Date.now();
                setRunning(true);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-gold text-[#1a1408] text-sm font-semibold active:scale-[0.97]"
            >
              {T('Замерить')}
            </button>
          )}
        </div>
      </div>
      {!running && seconds !== null && seconds > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Badge tone={classOf(seconds).tone}>{classOf(seconds).label}</Badge>
        </div>
      )}
      <p className="text-[10px] text-ink-faint mt-1.5">{T('Глотнуть, проглотить, запустить секундомер — до полного исчезновения вкуса.')}</p>
    </div>
  );
}

/** Раздел «Рот»: рейки SAT, форма кислотности, текстура танинов, баланс. */
export function PalateSection({ record }: { record: TastingRecord }) {
  const { dispatch, isPro, profile } = useTasting();
  const { t } = useLang();
  const p = record.palate;
  const onPatch = (patch: Partial<PalateData>): void => dispatch({ type: 'patch-palate', patch });
  const balanceNoteRef = useRef<HTMLTextAreaElement>(null);

  const balanceAnalysis = profile.balance;

  return (
    <SectionCard
      title={t.sections.palate}
      subtitle="Шкалы SAT, структура и баланс"
      badge={<Tooltip text="Баланс (B из BLIC): сладость ↔ фрукты ↔ кислотность ↔ танины. Сладкое с ярким фруктовым якорем не штрафуется; сахар без якоря — дисбаланс." />}
    >
      <CleanSensoryRail
        label="Сладость"
        hint="границы сахара в г/л"
        options={SWEETNESS_OPTS}
        value={p.sweetness}
        onChange={(v) => onPatch({ sweetness: v })}
        cues={SWEETNESS_CUES}
      />

      {/* Форма волны кислотности — ТОЛЬКО в режиме Сомелье Pro (v10):
          экзаменационный лист WSET не содержит визуализаций волны. */}
      {isPro && (
        <div className="pb-4 mb-4 border-b border-hairline/60">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-ink">{T('Форма волны кислотности')}</span>
            <span className="text-[11px] text-ink-faint">{T('авторская фича Pro')}</span>
          </div>
          {/* ТЗ v4 §3: волна реактивно связана с уровнем кислотности. */}
          <AcidityCurvePicker value={p.acidityShape} onChange={(acidityShape) => onPatch({ acidityShape })} acidityLevel={p.acidity} />
        </div>
      )}

      <CleanSensoryRail
        label="Кислотность"
        options={ACIDITY_OPTS}
        value={p.acidity}
        onChange={(v) => onPatch({ acidity: v })}
        cues={ACIDITY_CUES}
        guideContent={<AcidityGuideContent />}
      />
      <CleanSensoryRail
        label="Танины (количество)"
        options={ACIDITY_OPTS}
        value={p.tanninLevel}
        onChange={(v) => onPatch({ tanninLevel: v })}
        cues={TANNIN_CUES}
        guideContent={<TanninGuideContent />}
      />

      {/* ТЗ §БЛОК 3: сенсорная матрица текстуры танинов с тактильными
          паттернами и анатомической локализацией вязкости. */}
      {isPro && (
        <div className="pb-4 mb-4 border-b border-hairline/60">
          <div className="flex items-baseline justify-between gap-2 mb-2.5">
            <span className="text-[13px] font-semibold text-ink">{T('Текстура танинов')}</span>
            <span className="text-[11px] text-ink-faint">{T('тактильная матрица: зерно и локализация')}</span>
          </div>
          <TanninTextureSelector value={p.tanninTexture} onChange={(tanninTexture) => onPatch({ tanninTexture })} />
        </div>
      )}

      {/* Спиртомер (v17): калибр — авто из ABV Титула, интеграция — шкала
          сегментов, ощущения — под катом. Ручная рейка «Алкоголь» исчезла. */}
      <SpirtoMeter record={record} onPatch={onPatch} />
      <CleanSensoryRail
        label="Тело"
        options={BODY_OPTS}
        value={p.body}
        onChange={(v) => onPatch({ body: v })}
        cues={BODY_CUES}
      />
      <CleanSensoryRail
        label="Интенсивность вкуса"
        options={INTENSITY_OPTS}
        value={p.flavourIntensity}
        onChange={(v) => onPatch({ flavourIntensity: v })}
        cues={INTENSITY_CUES}
      />

      {isPro && (
        <div className="pb-4 mb-4 border-b border-hairline/60">
          <Caudaliemeter seconds={p.caudalieSeconds} onDone={(s) => onPatch({ caudalieSeconds: s })} />
        </div>
      )}

      <CleanSensoryRail
        label="Длина послевкусия"
        hint={isPro ? 'или замерьте каудалиеметром' : undefined}
        options={FINISH_OPTS.map(({ value, label }) => ({ value, label }))}
        value={p.finish}
        onChange={(v) => onPatch({ finish: v })}
        cues={FINISH_CUES}
      />
      {/* Доминирующий акцент финиша — только Pro (v10): ось «Минеральность»
          и так считается из минеральных дескрипторов колеса. */}
      {isPro && (
        <CleanSensoryRail
          label="Доминирующий акцент финиша"
          options={FINISH_ACCENT_OPTS}
          value={p.finishAccent}
          onChange={(v) => onPatch({ finishAccent: v })}
          cues={FINISH_ACCENT_CUES}
          tone="sage"
        />
      )}

      {/* ── БАЛАНС: единый источник истины, без stale-state ── */}
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[13px] font-bold text-gold-soft">{T('Баланс')}</h3>
          <Tooltip text="Выберите вердикт. При «Сбалансированное» список причин автоматически очищается — в отчёт уйдёт только актуальное состояние." />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Chip
            active={p.balance.verdict === 'balanced'}
            tone="sage"
            onClick={() => dispatch({ type: 'set-balance-verdict', verdict: 'balanced' })}
          >
            {T('Сбалансированное')}
          </Chip>
          <Chip
            active={p.balance.verdict === 'unbalanced'}
            tone="garnet"
            onClick={() => dispatch({ type: 'set-balance-verdict', verdict: 'unbalanced' })}
          >
            {T('Несбалансированное')}
          </Chip>
          {p.balance.verdict !== null && (
            <Chip active={false} onClick={() => dispatch({ type: 'set-balance-verdict', verdict: null })}>
              <Undo2 size={14} />
            </Chip>
          )}
        </div>

        {p.balance.verdict === 'unbalanced' && (
          <div className="rise-in mb-3">
            <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-2">{T('Причины дисбаланса')}</p>
            <div className="flex flex-wrap gap-2">
              {BALANCE_ISSUE_OPTS.map((o) => (
                <Chip
                  key={o.value}
                  tone="garnet"
                  active={p.balance.issues.includes(o.value)}
                  onClick={() => dispatch({ type: 'toggle-balance-issue', issue: o.value })}
                >
                  {T(o.label)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Живой анализ движка */}
        {balanceAnalysis.notes.length > 0 && (
          <ul className="space-y-1 mb-3">
            {balanceAnalysis.notes.map((n) => (
              <li key={n} className="text-[12px] text-ink-dim flex gap-2">
                <span aria-hidden>—</span>
                {T(n)}
              </li>
            ))}
          </ul>
        )}
        <Badge tone={balanceAnalysis.computed === 'harmonious' ? 'sage' : balanceAnalysis.computed === 'unbalanced' ? 'garnet' : 'gold'}>
          {T('Движок: ')}{balanceAnalysis.computed === 'harmonious' ? T('гармонично') : balanceAnalysis.computed === 'unbalanced' ? T('спорно') : T('на грани')}
        </Badge>

        <textarea
          ref={balanceNoteRef}
          value={p.balance.note}
          onChange={(e) => onPatch({ balance: { ...p.balance, note: e.target.value } })}
          rows={2}
          placeholder={T('Комментарий к балансу…')}
          className="mt-3 w-full px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
        />
      </div>

      <label className="mt-4 block">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
          <PenLine size={12} /> {T('Заметки по рту')}
        </span>
        <textarea
          value={p.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          rows={2}
          placeholder={T('Эволюция вкуса во рту, сольность, тире…')}
          className="w-full px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
        />
      </label>
    </SectionCard>
  );
}
