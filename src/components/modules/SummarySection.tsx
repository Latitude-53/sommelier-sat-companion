import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCopy, Dices, Info, Radar, Thermometer, Wine } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { SectionCard } from '@/components/common/SectionCard';
import { Tooltip } from '@/components/common/Tooltip';
import { RingGauge, rankAxesForDisplay, MISSING_HINTS } from '@/components/visualizers/RingGauge';
import { useTasting } from '@/state/TastingProvider';
import { useToast } from '@/components/common/Toast';
import {
  buildCustomNote,
  DEFAULT_NOTE_OPTIONS,
  NOTE_STYLE_ICONS,
  NOTE_STYLE_ORDER,
  type NoteOptions,
  type NoteStyle,
} from '@/engine/narrativeGenerator';
import { calculateWineLifeArc } from '@/engine/wineLifeArc';
import { splitAxesByAssessment, AXIS_SHORT_RU, type ProfileAxis, type ProfileAxisKey } from '@/engine/structuralProfile';
import { FRESH_REGISTER_HINTS, FRESH_REGISTER_LABELS } from '@/engine/aromaEngine';
import { FAULT_TYPE_OPTS, BLIC_KEYS, QUALITY_OPTS } from '@/lib/catalog';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/** Строки расчёта (v17, вариант C «Силуэт+расчёт»): тот же ранжированный
 *  порядок, что у кольца — сильнейшая ось сверху, честный 0.0 и «н/о» внизу.
 *  Тап по оценённой строке раскрывает золотой хвост вкладов движка. */
function ProfileRows({ axes }: { axes: ProfileAxis[] }) {
  useLang();
  const [openKey, setOpenKey] = useState<ProfileAxisKey | null>(null);
  const slots = rankAxesForDisplay(axes);
  return (
    <div className="flex flex-col justify-center">
      {slots.map((s) => {
        const a = s.axis;
        return (
          <div key={a.key}>
            <button
              type="button"
              onClick={() => s.assessed && setOpenKey(openKey === a.key ? null : a.key)}
              aria-expanded={s.assessed ? openKey === a.key : undefined}
              className={`w-full grid grid-cols-[106px_1fr_56px] items-center gap-2.5 py-[7px] text-left ${s.assessed ? 'cursor-pointer rounded-lg hover:bg-white/[0.025] transition-colors' : 'cursor-default'}`}
            >
              <span
                className={`text-[12.5px] font-semibold truncate flex items-center gap-1 ${s.assessed ? 'text-ink' : 'text-ink-faint'}`}
                title={T(a.label)}
              >
                {T(AXIS_SHORT_RU[a.key] ?? a.label)}
                {s.assessed && <Tooltip text={axisHint(a.key)} />}
              </span>
              <span
                className={`relative h-[10px] rounded-full block ${
                  s.dead
                    ? 'border border-dashed border-hairline bg-transparent'
                    : 'bg-surface-2 border border-hairline'
                }`}
                title={s.assessed ? undefined : T('не оценивалось')}
              >
                {!s.dead && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-garnet to-gold transition-all duration-700"
                    style={{ width: `${Math.min(10, Math.max(0, a.value)) * 10}%` }}
                  />
                )}
                {!s.dead && (
                  <span
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ background: 'repeating-linear-gradient(90deg, rgba(237,231,219,.14) 0 1px, transparent 1px 10%)' }}
                    aria-hidden
                  />
                )}
              </span>
              <span className="text-right leading-tight">
                {s.dead ? (
                  <i
                    className={`text-[11px] italic ${s.assessed ? 'text-[#8a9284] font-semibold' : 'text-ink-faint'}`}
                    title={s.assessed ? undefined : T(MISSING_HINTS[a.key] ?? 'шкала во «Рте»')}
                  >
                    {s.tag ?? T('н/о')}
                  </i>
                ) : (
                  <b className="tnum text-[13.5px] font-bold text-gold-soft">{s.tag}</b>
                )}
              </span>
            </button>
            {openKey === a.key && s.assessed && (
              <div className="flex flex-wrap gap-1.5 pb-2.5 pl-[2px]">
                {a.contributions.map((c, i) => (
                  <span
                    key={`${c.label}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] bg-surface border border-hairline text-ink-dim"
                  >
                    {T(c.label)}
                    <b className={`tnum font-semibold ${c.delta >= 0 ? 'text-sage-juicy' : 'text-[#e8b3ac]'}`}>
                      {c.delta >= 0 ? '+' : ''}
                      {c.delta.toFixed(1)}
                    </b>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Русские подписи семейств спектра. */
const FAMILY_RU: Record<string, string> = {
  fruit: 'Фрукты',
  floral: 'Цветы',
  herbal: 'Травы',
  spice: 'Специи',
  oak: 'Дуб',
  ferment: 'Ферментация',
  mineral: 'Минералы',
  tertiary: 'Выдержка',
};
const FAMILY_HUE: Record<string, string> = {
  fruit: '#c59b4e',
  floral: '#e5c179',
  herbal: '#759a72',
  spice: '#9a4a44',
  oak: '#8a623c',
  ferment: '#b39f78',
  mineral: '#638291',
  tertiary: '#69554a',
};

/** Карточка «Спектр аромата»: всё, что колесо посчитало под капотом. */
function SpectrumCard() {
  const { record, profile } = useTasting();
  useLang();
  const sp = profile.spectrum;
  const evolutionPct = Math.round(sp.evolutionIndex * 100);
  const pyr = sp.pyramid;
  const pyrTotal = pyr.primary + pyr.secondary + pyr.tertiary || 1;

  return (
    <SectionCard
      title="Спектр аромата"
      subtitle="Всё, что колесо посчитало под капотом носа"
      badge={<Tooltip text="Закон Ципфа и Вебер–Фехнер считают энергию семейств, индекс Херфиндаля–Хиршмана — концентрацию букета, пирамида P/S/T — эволюцию. Здесь магия становится цифрами." />}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">{T('HHI · концентрация')}</p>
          <p className="text-xl font-bold text-gold-soft tnum">{sp.hhi.toFixed(2)}</p>
          <p className="text-[11px] text-ink-faint mt-1">{sp.hhi >= 0.65 ? T('моно-фокус') : sp.hhi >= 0.35 ? T('выраженный профиль') : T('рассеянный букет')}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">{T('Сложность (BLIC)')}</p>
          <p className="text-xl font-bold text-gold-soft">{profile.complexity.verdict === 'strong' ? T('Комплексное (полифония)') : profile.complexity.verdict === 'adequate' ? T('Многослойное') : sp.activeFamilies === 0 ? '—' : T('Моно-фокус / простое')}</p>
          <p className="text-[11px] text-ink-faint mt-1 tnum">H={sp.entropy.toFixed(2)} · K={sp.activeFamilies} {T('сем.')} · {T('энтропия Шеннона')}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">{T('Эволюция (P/S/T)')}</p>
          <p className="text-xl font-bold text-gold-soft tnum">{evolutionPct}%</p>
          <p className="text-[11px] text-ink-faint mt-1">
            {sp.evolutionMatch === 'match' ? T('согласна с «Развитием»') : sp.evolutionMatch === 'mismatch' ? T('расходится с «Развитием»') : T('выберите «Развитие»')}
          </p>
        </div>
        <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">{T('Громкость букета')}</p>
          <p className="text-xl font-bold text-gold-soft tnum">{sp.totalEnergy.toFixed(1)}</p>
          <p className="text-[11px] text-ink-faint mt-1">{T('база')}: {sp.baseIntensity.toFixed(1)}{sp.baseIntensitySource === 'nose' ? ` ${T('(нос)')}` : sp.baseIntensitySource === 'fallback' ? ` ${T('(по умолч.)')}` : ''}</p>
        </div>
      </div>

      {/* Доли семейств + пирамида */}
      <div className="grid md:grid-cols-[1fr_260px] gap-4 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-2 flex items-center gap-1.5"><Radar size={12} /> {T('Доли семейств в спектре')}</p>
          {sp.families.length === 0 ? (
            <p className="text-[12.5px] text-ink-faint">{T('Отметьте дескрипторы на колесе «Носа» — спектр построится сам.')}</p>
          ) : (
            <div className="space-y-1.5">
              {sp.families.map((f) => (
                <div key={f.key} className="flex items-center gap-2.5">
                  <span className="w-[92px] shrink-0 text-[12px] text-ink-dim truncate" title={T(FAMILY_RU[f.key] ?? f.key)}>{T(FAMILY_RU[f.key] ?? f.key)}</span>
                  <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(2, f.share * 100)}%`, backgroundColor: FAMILY_HUE[f.key] ?? '#888' }} />
                  </div>
                  <span className="w-[86px] shrink-0 text-right text-[11.5px] text-ink-faint tnum">
                    P {f.power.toFixed(1)} · {Math.round(f.share * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* ТЗ v3 §2.2: регистр зрелости фрукта */}
          {sp.freshRegister && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2">
              <span className="text-[10.5px] uppercase tracking-widest text-ink-faint">{T('Регистр фрукта')}</span>
              <span className="text-[12px] font-bold text-gold-soft">{FRESH_REGISTER_LABELS[sp.freshRegister]}</span>
              <span className="text-[11px] text-ink-faint tnum">Φ_fresh = {(sp.phiFresh ?? 0).toFixed(2)} · {T(FRESH_REGISTER_HINTS[sp.freshRegister])}</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-2">{T('Пирамида P/S/T')}</p>
          <div className="flex h-3.5 rounded-full overflow-hidden border border-hairline">
            <div className="h-full bg-[#c59b4e]" style={{ width: `${(pyr.primary / pyrTotal) * 100}%` }} title={T('Первичные (фрукты, цветы, травы)')} />
            <div className="h-full bg-[#8a623c]" style={{ width: `${(pyr.secondary / pyrTotal) * 100}%` }} title={T('Вторичные (дуб, ферментация)')} />
            <div className="h-full bg-[#638291]" style={{ width: `${(pyr.tertiary / pyrTotal) * 100}%` }} title={T('Третичные + минералы')} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10.5px] text-ink-faint tnum">
            <span>P {pyr.primary}</span>
            <span>S {pyr.secondary}</span>
            <span>T {pyr.tertiary}</span>
          </div>
          <p className="text-[11px] text-ink-faint mt-2 leading-snug">
            {T('Индекс = (0.5·S + T) / (P + S + T). Сверяется с пунктом «Развитие»: трюфели в молодом вине сработают детектором аномалий.')}
          </p>
        </div>
      </div>

      {/* Статус пороков */}
      {record.nose.faults.length > 0 && (
        <div className={`mt-4 rounded-xl border p-3.5 ${sp.faults.faultyMode ? 'border-garnet/40 bg-garnet/10' : 'border-hairline bg-surface/40'}`}>
          <p className="text-[12.5px] leading-snug">
            <span className="font-semibold text-ink">{T('Пороки в спектре:')}</span>{' '}
            <span className="text-ink-dim">
              {record.nose.faults
                .map((f) => `${T(FAULT_TYPE_OPTS.find((o) => o.value === f.type)?.label ?? f.type)} (${f.severity === 'light' ? '1 •' : f.severity === 'distinct' ? '2 ••' : '3 •••'})`)
                .join(', ')}
            </span>
          </p>
          {sp.faults.faultyMode ? (
            <p className="text-[12px] text-[#e8b3ac] mt-1.5">{T('Вино больное: качество срезано до «Acceptable»/«Faulty», окно питья закрыто справа.')}</p>
          ) : (
            <p className="text-[12px] text-ink-dim mt-1.5">{T('Лёгкие тона на 1 • — возможная терруарная стилистика: вердикт не блокируется.')}</p>
          )}
        </div>
      )}
    </SectionCard>
  );}

/**
 * «Бланк к сдаче» (v19) — чек-лист SAT-полей для WSET-прохода.
 * Советник подачи в экзаменационной поверхности не живёт (одобрено на
 * Релиз-пакете), вместо него — честная карта готовности бланка:
 * 100% → «готов к сдаче».
 */
function SubmissionSheet() {
  const { record } = useTasting();
  useLang();
  const e = record.eye;
  const n = record.nose;
  const p = record.palate;
  const c = record.conclusion;

  const groups: { title: string; items: [string, boolean][] }[] = [
    {
      title: T('Глаз'),
      items: [
        [T('Прозрачность'), e.clarity !== null],
        [T('Интенсивность'), e.intensity !== null],
        [T('Цвет'), e.color !== null],
      ],
    },
    {
      title: T('Нос'),
      items: [
        [T('Чистота'), n.condition !== null],
        [T('Интенсивность'), n.intensity !== null],
        [T('Развитие'), n.development !== null],
        [T('Ароматы'), Object.keys(n.aromas).length > 0],
      ],
    },
    {
      title: T('Рот'),
      items: [
        [T('Сладость'), p.sweetness !== null],
        [T('Кислотность'), p.acidity !== null],
        [T('Танины'), p.tanninLevel !== null],
        [T('Алкоголь'), p.alcohol !== null],
        [T('Тело'), p.body !== null],
        [T('Интенсивность вкуса'), p.flavourIntensity !== null],
        [T('Послевкусие'), p.finish !== null],
        [T('Баланс'), p.balance.verdict !== null],
      ],
    },
    {
      title: T('Итог · BLIC'),
      items: [
        ...BLIC_KEYS.map((b): [string, boolean] => [T(b.label), c.blic[b.key] !== undefined]),
        [T('Вердикт качества'), c.quality !== null],
        [T('Готовность'), c.readiness !== null],
      ],
    },
  ];

  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const done = groups.reduce((a, g) => a + g.items.filter(([, ok]) => ok).length, 0);
  const pct = Math.round((done / total) * 100);
  const ready = pct === 100;

  return (
    <SectionCard
      title={T('Бланк к сдаче')}
      subtitle={T('Чек-лист SAT-полей — быстрый проход перед сдачей')}
      badge={
        <Badge tone={ready ? 'sage' : 'gold'}>
          {ready ? T('готов к сдаче') : `${pct}%`}
        </Badge>
      }
    >
      <div className="h-2 rounded-full bg-hairline overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${ready ? 'bg-sage-juicy' : 'bg-gold'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[10.5px] uppercase tracking-widest text-ink-faint mb-1.5">{g.title}</p>
            <ul className="space-y-1">
              {g.items.map(([label, ok]) => (
                <li key={`${g.title}-${label}`} className="flex items-center gap-2 text-[12.5px]">
                  <span
                    aria-hidden
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      ok ? 'bg-sage-juicy/20 text-sage-juicy' : 'border border-hairline text-ink-faint'
                    }`}
                  >
                    {ok ? '✓' : ''}
                  </span>
                  <span className={ok ? 'text-ink-dim' : 'text-ink-faint'}>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-faint mt-3.5">
        {ready
          ? T('Все SAT-поля заполнены — бланк можно сдавать.')
          : T('Заполните отмеченные поля в разделах — бланк дособерётся сам.')}
      </p>
    </SectionCard>
  );
}

/** Итоговый дашборд: радар, вклады осей, BLIC, нарратив, аномалии, советы. */
export function SummarySection() {
  const { record, profile, anomalies, serving, storageKb, isPro } = useTasting();

  const { lang, t } = useLang();
  const toast = useToast();

  /* ── Мастер-генератор заметок (v10): 4 стиля + тумблеры + перефразировка.
     По умолчанию: WSET — академический регистр, Pro — сомелье. */
  const [noteStyle, setNoteStyle] = useState<NoteStyle>(isPro ? 'sommelier' : 'academic');
  const [noteOpts, setNoteOpts] = useState<NoteOptions>(DEFAULT_NOTE_OPTIONS);
  const [variant, setVariant] = useState(0);
  const [editableNote, setEditableNote] = useState('');

  /* Авто-синхронизация текста при смене стиля/комплектации/варианта.
     Ручные правки живут до следующего переключения — так и задумано:
     «подправить пару слов перед копированием». */
  useEffect(() => {
    setEditableNote(buildCustomNote(record, profile, noteStyle, noteOpts, variant));
  }, [record, profile, noteStyle, noteOpts, variant, lang]);

  const quality = record.conclusion.quality;

  /* Двойной балл «сегодня → зенит» (v17: зенит живёт только здесь —
     кольцо показывает «сейчас», контур зенита ушёл вместе с лентой). */
  const arc = useMemo(() => calculateWineLifeArc(record, profile), [record, profile]);

  /* Сенсорная лента (v15): оси без вкладов движка («Сладость» без шкалы,
     «Минеральность» без минеральных дескрипторов) рисуются честными
     пунктирными прочерками «не оценивалось» — прямо на своих строках. */
  const { assessed: assessedAxes } = useMemo(
    () => splitAxesByAssessment(profile.axes),
    [profile.axes],
  );

  const errors = anomalies.filter((a) => a.severity === 'error');
  const warnings = anomalies.filter((a) => a.severity === 'warning');
  const infos = anomalies.filter((a) => a.severity === 'info');

  return (
    <div className="space-y-4">
      {/* Радар + вклады осей */}
      <SectionCard title={isPro ? 'Живой структурный профиль' : 'Структурный профиль'} subtitle="Шесть осей 0–10 · композитный расчёт из всех разделов">
        {/* Двойной балл Паркера: сегодня → зенит — только Сомелье Pro (v10).
            WSET запрещает численные баллы на экзамене. */}
        {isPro && (
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl border border-gold/20 bg-gold/5 px-3.5 py-2.5 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-faint">{T('Балл сегодня:')}</span>
              <b className="text-ink font-bold tnum">{arc.scoreToday} / 100</b>
              <span className="hidden sm:inline text-ink-faint text-[10.5px]">· {T(arc.phaseShort).toLowerCase()}</span>
            </div>
            <span className="text-gold-soft font-mono" aria-hidden>────►</span>
            <div className="flex items-center gap-1.5">
              <span className="text-ink-faint">{T('Потенциал в зените:')}</span>
              <b className="text-gold-soft font-bold tnum">{arc.scoreZenith} / 100</b>
              {arc.scoreZenith > arc.scoreToday && (
                <span className="text-sage-juicy font-semibold tnum">+{arc.scoreZenith - arc.scoreToday}</span>
              )}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          {/* v17 «Кольцо баланса» (макет «Профиль-доводка»): сенсорная лента и
              бар «Полнота профиля» уступают место кольцу — ранжированные дуги
              аркой сверху, пунктирные прорези (0.0 и н/о) стекают вниз, центр
              пустой (счётчик «N / 6 осей» убран: в белом вине он звучал как
              диагноз). Записки ⚖︎ о балансе остаются под кольцом. */}
          <div className="flex flex-col items-stretch gap-3">
            <div className="flex-1 flex flex-col rounded-2xl border border-hairline bg-[#141d17] px-3 pt-3 pb-3.5">
              <span className="text-[10.5px] uppercase tracking-[0.09em] text-ink-faint text-center">
                {T('Кольцо баланса')}
              </span>
              <div className="flex-1 flex items-center justify-center py-2">
                <RingGauge axes={profile.axes} size={136} />
              </div>
              <p className="text-[10px] text-ink-faint text-center leading-snug px-2">
                {T('Сильнейшие оси — сверху, прорези — внизу: ноль или н/о')}
              </p>
            </div>
            {assessedAxes.length === 0 && (
              <p className="text-[12px] text-ink-dim leading-snug text-center">
                {T('Кольцо заполнится, когда будут оценены оси — заполните разделы «Нос» и «Рот».')}
              </p>
            )}
            {/* Вердикт о балансе (с v16 живёт в левой колонке профиля). */}
            {profile.balance.notes.length > 0 && (
              <div className="rounded-xl border border-gold/25 bg-gold/5 p-3">
                {profile.balance.notes.map((n) => (
                  <p key={n} className="text-[12.5px] text-ink-dim">
                    ⚖︎ {T(n)}
                  </p>
                ))}
              </div>
            )}
          </div>
          {/* Строки расчёта: ранжированный список осей с раскрывающимися вкладами. */}
          <ProfileRows axes={profile.axes} />
        </div>
      </SectionCard>

      {/* Спектр аромата: магия колеса под капотом */}
      <SpectrumCard />

      {/* ── МАСТЕР-ГЕНЕРАТОР ЗАМЕТОК (v10): 4 регистра + тумблеры + 🎲 + живое
          редактирование. WSET по умолчанию — академический протокол. ── */}
      <SectionCard title={t.noteGen.title} subtitle={t.noteGen.subtitle}>
        {/* Выбор стиля */}
        <div className="flex flex-wrap gap-2 mb-3">
          {NOTE_STYLE_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setNoteStyle(s)}
              className={`min-h-[40px] px-3.5 rounded-xl text-[12.5px] border flex items-center gap-1.5 transition ${
                noteStyle === s
                  ? 'border-gold bg-gold/15 text-gold-soft font-semibold shadow-sm'
                  : 'border-hairline text-ink-dim hover:text-ink'
              }`}
            >
              <span aria-hidden>{NOTE_STYLE_ICONS[s]}</span>
              {t.noteGen.styles[s]}
            </button>
          ))}
        </div>

        {/* Тумблеры комплектации */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-cellar-deep/50 border border-hairline mb-3 text-[11.5px]">
          <span className="text-ink-faint mr-1">{t.noteGen.includeLabel}</span>
          {([
            { key: 'score' as const, label: t.noteGen.optScore },
            { key: 'window' as const, label: t.noteGen.optWindow },
            { key: 'serving' as const, label: t.noteGen.optServing },
            { key: 'gastro' as const, label: t.noteGen.optGastro },
          ]).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setNoteOpts((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
              className={`px-2.5 py-1 rounded-lg border transition ${
                noteOpts[opt.key]
                  ? 'border-gold/50 bg-gold/10 text-gold-soft font-medium'
                  : 'border-hairline text-ink-faint opacity-60'
              }`}
            >
              {noteOpts[opt.key] ? '✓ ' : ''}{opt.label}
            </button>
          ))}
          {/* Перефразировать: синонимический ряд и метафоры — факты неизменны */}
          <button
            type="button"
            onClick={() => setVariant((v) => v + 1)}
            title={T('Меняет метафоры, не факты')}
            className="px-2.5 py-1 rounded-lg border border-hairline text-ink-dim hover:text-ink hover:border-gold/50 transition ml-auto inline-flex items-center gap-1"
          >
            <Dices size={13} /> {t.noteGen.rephrase}
          </button>
        </div>

        {/* Живое редактируемое поле заметки */}
        <textarea
          value={editableNote}
          onChange={(e) => setEditableNote(e.target.value)}
          rows={9}
          spellCheck={false}
          className="w-full rounded-xl border border-hairline bg-cellar-deep p-4 text-[13.5px] leading-relaxed text-ink font-serif focus:border-gold focus:outline-none transition resize-y"
        />

        {/* Копирование */}
        <div className="mt-3 flex justify-between items-center gap-3 flex-wrap">
          <span className="text-[11px] text-ink-faint">{t.noteGen.editableHint}</span>
          <Button
            variant="gold"
            size="sm"
            icon={<ClipboardCopy size={14} />}
            onClick={() => {
              void navigator.clipboard.writeText(editableNote).then(() => toast(t.noteGen.copied, 'ok'));
            }}
          >
            {t.noteGen.copy}
          </Button>
        </div>
      </SectionCard>

      {/* Аномалии */}
      <SectionCard title="Проверка логики" subtitle="Детектор противоречий дегустации">
        {anomalies.length === 0 ? (
          <p className="text-[13px] text-sage-juicy flex items-center gap-2">
            <Info size={15} /> {T('Противоречий не найдено — дегустация внутренне непротиворечива.')}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {[...errors, ...warnings, ...infos].map((a) => (
              <li key={a.id} className="flex gap-3 rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
                <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${a.severity === 'error' ? 'text-[#f0a49b]' : a.severity === 'warning' ? 'text-gold-soft' : 'text-ink-faint'}`} />
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    {T(a.title)}
                    <span className="ml-2 align-middle">
                      <Badge tone={a.severity === 'error' ? 'danger' : a.severity === 'warning' ? 'gold' : 'neutral'}>
                        {a.severity === 'error' ? T('ошибка') : a.severity === 'warning' ? T('внимание') : T('совет')}
                      </Badge>
                    </span>
                  </p>
                  <p className="text-[12px] text-ink-dim mt-1">{T(a.hint)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Советник подачи — Pro-поверхность (v19): в WSET-проходе вместо него «Бланк к сдаче». */}
      {isPro ? (
      <SectionCard title="Советник подачи" subtitle="Температура, декантация, бокал">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
              <Thermometer size={12} /> {T('Температура')}
            </p>
            <p className="text-[15px] font-semibold text-gold-soft">{T(serving.temperature)}</p>
          </div>
          <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
            <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">{T('Декантация')}</p>
            <p className="text-[13px] text-ink">{T(serving.decant)}</p>
          </div>
          <div className="rounded-xl border border-hairline bg-cellar-deep/50 p-3.5">
            <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">{T('Бокал')}</p>
            <p className="text-[13px] text-ink">{T(serving.glass)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="sage">{T('Окно питья')}: {T(serving.window)}</Badge>
          {serving.notes.map((n) => (
            <Badge key={n} tone="neutral">
              {T(n)}
            </Badge>
          ))}
        </div>
      </SectionCard>
      ) : (
        <SubmissionSheet />
      )}

      {/* Мини-карточка: шелф-токер — инструмент винотеки, только Pro (v10) */}
      {isPro && (
      <SectionCard title="Карточка для полки" subtitle="Шелф-токер + вердикт">
        <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-surface-2 to-cellar-deep p-5">
          <p className="display text-xl text-gold-soft mb-1">
            {record.identity.name || T('Безымянное вино')}
            {record.identity.vintage ? `, ${record.identity.vintage}` : ''}
          </p>
          <p className="text-[12px] text-ink-faint mb-3">
            {[record.identity.producer, record.identity.region ? T(record.identity.region) : '', record.identity.country ? T(record.identity.country) : ''].filter(Boolean).join(' · ')}
          </p>
          {quality && (
            <Badge tone="sage" className="mb-3">
              {T(QUALITY_OPTS.find((q) => q.value === quality)?.label ?? '')}
              {record.conclusion.score100 !== null && record.mode === 'sommelier-pro' ? ` · ${record.conclusion.score100}/100` : ''}
            </Badge>
          )}
          <div className="mt-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<Wine size={14} />}
              onClick={() => {
                const mini = `${record.identity.name || T('Вино')}${record.identity.vintage ? ` ${record.identity.vintage}` : ''} — ${T(profile.complexity.label).toLowerCase()}, ${T(serving.window)}`;
                void navigator.clipboard.writeText(mini).then(() => toast(T('Карточка скопирована')));
              }}
            >
              {T('скопировать кратко')}
            </Button>
          </div>
        </div>
        <p className="text-[10.5px] text-ink-faint mt-2">
          {T('Карта дегустации')}: {storageKb} KB {T('· фото сжаты автоматически. Данные хранятся локально (IndexedDB) и переживают перезагрузки.')}
        </p>
      </SectionCard>
      )}
    </div>
  );
}

const AXIS_HINTS: Record<string, string> = {
  acidity: 'База из пункта «Кислотность»; сахар маскирует (−0.5…−2.0); форма волны даёт динамическую поправку.',
  tannins: 'База — количество; высокая кислота подчёркивает вязкость (+0.5); сахар сглаживает; текстура корректирует.',
  body: 'База + вклады сахара, алкоголя, глицерина/ножек, нового дуба и МЛО-плотности (ферментация).',
  fruit: 'Сенсорная сила P_F фруктов (ТЗ v3): якорь по максимальной ноте (3.4/5.6/7.6) + логарифмическое разнообразие × громкость — БЕЗ штрафа за сложность. Увядание снижает, финиш 8+ сек держит ядро.',
  minerality: 'Сенсорная сила P_F минералов; плюс минеральный финиш и каменистые слова из заметок.',
  sweetness: 'Ощущаемая сладость: высокая кислотность и танины «высушивают» даже 8 г/л сахара.',
};

const axisHint = (key: string): string => AXIS_HINTS[key] ?? '';
