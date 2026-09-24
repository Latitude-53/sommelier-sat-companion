/**
 * Единый дайджест дегустации — единственный источник данных для всех экспортов
 * (PDF/печать, автономный HTML, Markdown-карточка, TXT).
 *
 * Урок аудита монолита: экспорты собирают поля из актуальной карточки и
 * вычисляемых движков (профиль, BLIC, советы). Stale-state невозможен:
 * verdict='balanced' гарантированно даёт issues=[] (инвариант в типах и редьюсере).
 */
import { computeStructuralProfile, descriptorMetaOf, effectiveAlcoholOf, type StructuralProfile } from '@/engine/structuralProfile';
import { adviseServing, type ServingAdvice } from '@/engine/servingAdvisor';
import {
  ACIDITY_OPTS,
  ALCOHOL_OPTS,
  BALANCE_ISSUE_OPTS,
  BLIC_KEYS,
  BODY_OPTS,
  CLARITY_OPTS,
  CONDITION_OPTS,
  DEVELOPMENT_OPTS,
  FAULT_TYPE_OPTS,
  FINISH_ACCENT_OPTS,
  FINISH_OPTS,
  INTENSITY_OPTS,
  MODE_LABELS,
  QUALITY_OPTS,
  READINESS_OPTS,
  SWEETNESS_OPTS,
  TANNIN_TEXTURE_OPTS,
  VISUAL_INTENSITY_OPTS,
  WINE_COLOR_META,
  styleFullLabel,
  ACIDITY_SHAPE_OPTS,
} from '@/lib/catalog';
import type { TastingRecord } from '@/types/tasting';
import { T } from '@/lib/tr';

const label = (opts: { value: string; label: string }[], v: string | null): string =>
  v ? (opts.find((o) => o.value === v)?.label ?? v) : '—';

export interface Digest {
  title: string;
  subtitle: string;
  meta: [string, string][];
  eye: [string, string][];
  nose: [string, string][];
  palate: [string, string][];
  conclusion: [string, string][];
  media: [string, string][];
  profile: StructuralProfile;
  serving: ServingAdvice;
  /** Осмысленные строки для текстовых экспортов. */
  profileLines: string[];
}

function aromasLine(record: TastingRecord): string {
  const entries = Object.entries(record.nose.aromas).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '—';
  return entries
    .map(([id, lvl]) => {
      /* Свои теги не лежат в каталоге — подпись берём из customTags карточки. */
      const d = descriptorMetaOf(id, record);
      const dots = '•'.repeat(lvl);
      return d ? `${T(d.label)} ${dots}` : id;
    })
    .join(', ');
}

export function buildDigest(record: TastingRecord): Digest {
  const profile = computeStructuralProfile(record);
  const serving = adviseServing(record, profile);
  const id = record.identity;
  const eye = record.eye;
  const nose = record.nose;
  const p = record.palate;
  const c = record.conclusion;

  const title = [id.producer, id.name].filter(Boolean).join(' · ') || T('Дегустация без названия');
  const subtitle = [
    id.vintage ? T(`${id.vintage} г.`) : null,
    T(styleFullLabel(id) ?? ''),
    [id.region ? T(id.region) : null, id.country ? T(id.country) : null].filter(Boolean).join(', ') || null,
    id.abv !== null ? T(`${id.abv}% об.`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const meta: [string, string][] = [
    ['Дата дегустации', id.dateTasted || '—'],
    ['Сомелье', id.taster || '—'],
    ['Режим', T(MODE_LABELS[record.mode])],
    ['Сорта', id.grapes ? T(id.grapes) : '—'],
  ];
  /* v19: цена и советник подачи — Pro-поверхности. В WSET-проходе их
     в файлах быть не должно (одобрено на Релиз-пакете). */
  if (record.mode === 'sommelier-pro') {
    meta.push(['Цена', id.price || '—']);
    meta.push(['Температура подачи (советник)', T(serving.temperature)]);
  }

  const balanceLine =
    p.balance.verdict === 'balanced'
      ? T('Сбалансированное')
      : p.balance.verdict === 'unbalanced'
        ? `${T('Несбалансированное')}${p.balance.issues.length ? `: ${p.balance.issues.map((i) => T(label(BALANCE_ISSUE_OPTS, i))).join(', ')}` : ''}`
        : '—';

  const eyePairs: [string, string][] = [
    ['Прозрачность', T(label(CLARITY_OPTS, eye.clarity))],
    ['Интенсивность', T(label(VISUAL_INTENSITY_OPTS, eye.intensity))],
    ['Цвет', eye.color ? T(WINE_COLOR_META[eye.color].label) : '—'],
  ];
  if (eye.coreHex || eye.rimHex) {
    eyePairs.push([
      'Диск (ядро/кайма)',
      `${eye.coreHex ? eye.coreHex.toUpperCase() : '—'} / ${eye.rimHex ? eye.rimHex.toUpperCase() : '—'}`,
    ]);
  }
  if (eye.rimWidth) {
    eyePairs.push(['Кайма (ширина)', T(({ none: 'нет', narrow: 'узкая', medium: 'средняя', wide: 'широкая' } as const)[eye.rimWidth])]);
  }
  if (record.mode === 'sommelier-pro') {
    if (eye.legs) eyePairs.push(['Ножки', T(({ watery: 'водянистые', thin: 'тонкие', medium: 'средние', thick: 'плотные' } as const)[eye.legs])]);
  }
  if (eye.perlage) {
    eyePairs.push([
      'Перляж',
      [
        eye.perlage.intensity ? T(({ delicate: 'деликатный', medium: 'средний', vigorous: 'энергичный' } as const)[eye.perlage.intensity]) : null,
        eye.perlage.bubbleSize ? T(({ fine: 'мелкие пузырьки', medium: 'средние пузырьки', coarse: 'крупные пузырьки' } as const)[eye.perlage.bubbleSize]) : null,
        eye.perlage.mousse ? T(({ creamy: 'сливочный мусс', light: 'лёгкий мусс', aggressive: 'агрессивный мусс' } as const)[eye.perlage.mousse]) : null,
      ]
        .filter(Boolean)
        .join(', ') || '—',
    ]);
  }
  if (eye.note) eyePairs.push(['Заметки', eye.note]);

  const nosePairs: [string, string][] = [
    ['Чистота', T(label(CONDITION_OPTS, nose.condition))],
    ...(nose.faults.length > 0
      ? ([['Дефекты', nose.faults.map((f) => `${T(label(FAULT_TYPE_OPTS, f.type))} (${f.severity === 'light' ? '1 •' : f.severity === 'distinct' ? '2 ••' : '3 •••'})`).join(', ')]] as [string, string][])
      : []),
    ['Интенсивность', T(label(INTENSITY_OPTS, nose.intensity))],
    ['Развитие', T(label(DEVELOPMENT_OPTS, nose.development))],
    ['Ароматы', aromasLine(record)],
    ['Фруктовость (сенсорная сила P_F)', `${profile.axes.find((a) => a.key === 'fruit')?.value ?? 0}/10`],
    ['Минеральность (сенсорная сила P_F)', `${profile.axes.find((a) => a.key === 'minerality')?.value ?? 0}/10`],
    ['Сложность (энтропия Шеннона)', `H=${profile.complexity.entropy.toFixed(2)} · ${profile.complexity.families} ${T('сем.')} — ${T(profile.complexity.label)}`],
  ];
  if (nose.note) nosePairs.push(['Заметки', nose.note]);

  const palatePairs: [string, string][] = [
    ['Сладость', T(label(SWEETNESS_OPTS, p.sweetness))],
    ...(record.mode === 'sommelier-pro' && p.acidityShape
      ? ([['Форма кислотности', T(label(ACIDITY_SHAPE_OPTS, p.acidityShape))]] as [string, string][])
      : []),
    ['Кислотность', T(label(ACIDITY_OPTS, p.acidity))],
    ['Танины', T(label(ACIDITY_OPTS, p.tanninLevel)) + (record.mode === 'sommelier-pro' && p.tanninTexture ? `, ${T(label(TANNIN_TEXTURE_OPTS, p.tanninTexture)).toLowerCase()}` : '')],
    ['Алкоголь', T(label(ALCOHOL_OPTS, effectiveAlcoholOf(record)))],
    ['Тело', T(label(BODY_OPTS, p.body))],
    ['Интенсивность вкуса', T(label(INTENSITY_OPTS, p.flavourIntensity))],
    ['Послевкусие', T(label(FINISH_OPTS, p.finish)) + (profile.finishSeconds ? ` (≈${profile.finishSeconds} ${T('с')})` : '')],
    ['Акцент финиша', T(label(FINISH_ACCENT_OPTS, p.finishAccent))],
    ['Баланс', balanceLine],
  ];
  if (p.balance.note) palatePairs.push(['Комментарий к балансу', p.balance.note]);
  if (p.note) palatePairs.push(['Заметки', p.note]);

  const conclusionPairs: [string, string][] = [
    [
      'BLIC',
      BLIC_KEYS.map((b) => {
        const r = c.blic[b.key];
        return `${T(b.label)}: ${r ? T(({ strong: 'сильно', adequate: 'достаточно', weak: 'слабо' } as const)[r]) : '—'}`;
      }).join(' · '),
    ],
    ['Вердикт качества', T(label(QUALITY_OPTS, c.quality))],
    ['Готовность', T(label(READINESS_OPTS, c.readiness))],
    [
      'Окно питья',
      c.windowFrom && c.windowTo
        ? `${c.windowFrom}–${c.windowTo}`
        : record.mode === 'sommelier-pro'
          ? T(serving.window)
          : '—',
    ],
  ];
  if (record.mode === 'sommelier-pro' && c.score100 !== null) conclusionPairs.push(['100-балльная шкала', `${c.score100}/100`]);
  if (c.note) conclusionPairs.push(['Заключение', c.note]);

  const mediaPairs: [string, string][] = [];
  if (record.media.image) mediaPairs.push(['Образ', record.media.image]);
  if (record.media.emojis.length) mediaPairs.push(['Эмодзи', record.media.emojis.join(' ')]);
  if (record.media.gastronomy.length) mediaPairs.push(['Гастрономия', record.media.gastronomy.join(', ')]);
  if (record.media.notes) mediaPairs.push(['Заметки', record.media.notes]);

  const profileLines = profile.axes.map((a) => `${T(a.label)}: ${a.value.toFixed(1)}/10 (${formatContribs(profile, a.key)})`);

  return { title, subtitle, meta, eye: eyePairs, nose: nosePairs, palate: palatePairs, conclusion: conclusionPairs, media: mediaPairs, profile, serving, profileLines };
}

function formatContribs(profile: StructuralProfile, key: string): string {
  const axis = profile.axes.find((a) => a.key === key);
  if (!axis) return '';
  return axis.contributions.map((c) => `${T(c.label)} ${c.delta >= 0 ? '+' : ''}${c.delta}`).join(' · ') || T('база');
}
