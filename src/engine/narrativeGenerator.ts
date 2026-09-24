/**
 * МАСТЕР-ГЕНЕРАТОР ДЕГУСТАЦИОННЫХ ЗАМЕТОК (v11) — 4 регистра + конфигуратор
 * + ДВУЯЗЫЧНЫЕ ШАБЛОНЫ (RU/EN) с одинаковыми фактами.
 *
 * Один и тот же дайджест данных даёт один и тот же текст: сид = стабильный хеш
 * имени + винтажа + производителя + стиля. Кнопка «Перефразировать» подмешивает
 * variant к сиду — меняется синонимический ряд и метафоры, но НЕ факты:
 * вариативны только те узлы, которые выбираются через rng (pick).
 *
 * Регистры:
 *  • academic  — сухой экзаменационный отчёт WSET (APPEARANCE/NOSE/PALATE/BLIC/
 *                CONCLUSION), без метафор и без 100-балльной шкалы;
 *  • sommelier — благородный сомелье-сторителлинг: текстура, эволюция,
 *                зрелость, подача, окно питья;
 *  • shelf     — ёмкая продающая выжимка для ценника/сайта винотеки;
 *  • social    — Telegram-дайджест с эмодзи-тегами и гастропарами.
 *
 * Язык берётся из глобального слоя tr.ts (getTrLang) — синхронизируется
 * LangProvider'ом до первого рендера и при каждом переключении.
 */
import { DESCRIPTORS_BY_ID } from '@/lib/catalog';
import {
  ACIDITY_OPTS,
  ALCOHOL_OPTS,
  BALANCE_ISSUE_OPTS,
  BLIC_KEYS,
  BODY_OPTS,
  DEVELOPMENT_OPTS,
  FINISH_OPTS,
  INTENSITY_OPTS,
  QUALITY_OPTS,
  READINESS_OPTS,
  SWEETNESS_OPTS,
  WINE_COLOR_META,
  TANNIN_TEXTURE_OPTS,
  CLARITY_OPTS,
  VISUAL_INTENSITY_OPTS,
  CONDITION_OPTS,
} from '@/lib/catalog';
import type { TastingRecord } from '@/types/tasting';
import { getTrLang, T, type TrLang } from '@/lib/tr';
import { computeStructuralProfile, effectiveAlcoholOf, type StructuralProfile } from './structuralProfile';
import { adviseServing } from './servingAdvisor';
import { calculateWineLifeArc } from './wineLifeArc';

/* ── Публичные типы конфигуратора ─────────────────────────────────────────── */

/** Регистр стиля заметки. */
export type NoteStyle = 'academic' | 'sommelier' | 'shelf' | 'social';

/** Иконки регистров (для UI-кнопок). */
export const NOTE_STYLE_ICONS: Record<NoteStyle, string> = {
  academic: '🎓',
  sommelier: '🍷',
  shelf: '🏷️',
  social: '📱',
};

/** Порядок регистров в UI. */
export const NOTE_STYLE_ORDER: NoteStyle[] = ['academic', 'sommelier', 'shelf', 'social'];

/** Комплектация заметки: какие модули входят в текст. */
export interface NoteOptions {
  /** Баллы / вердикт. */
  score: boolean;
  /** Окно питья. */
  window: boolean;
  /** Подача и бокал (советник). */
  serving: boolean;
  /** Гастрономические пары. */
  gastro: boolean;
}

export const DEFAULT_NOTE_OPTIONS: NoteOptions = { serving: true, gastro: true, window: true, score: true };

/* ── Детерминированный RNG (сид + variant для «Перефразировать») ──────────── */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, variants: readonly T[]): T {
  const idx = Math.floor(rng() * variants.length) % variants.length;
  return variants[idx] as T;
}

/* ── Языковой пак: строки/порядки слов, зависящие от языка ─────────────────── */

const PACK = {
  ru: {
    and: (items: string[]): string => (items.length === 0 ? '' : items.length === 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} и ${items[items.length - 1] ?? ''}`),
    year: (v: string): string => `${v} г.`,
    window: (f: string | number, t: string | number): string => `${f}–${t} гг.`,
    seconds: (s: number | string): string => `${s} с`,
    secondsApprox: (s: number): string => `около ${s} с`,
    finishHold: 'уверенно и долго',
    fromRegion: (region: string): string => `из региона ${region}`,
    terroir: 'терруара',
    yearOf: (v: string | number): string => `${v} года`,
    /* Цвет-категория согласуется со словом «цвет» (м. р.): «гранатовый цвет». */
    displays: (color: string): string => `демонстрирует ${color} цвет`,
    colorMasc: {
      'lemon-green': 'лимонно-зелёный',
      lemon: 'лимонный',
      gold: 'золотой',
      amber: 'янтарный',
      brown: 'коричневый',
      pink: 'розовый',
      salmon: 'лососевый',
      'orange-rose': 'апельсиновый',
      purple: 'пурпурный',
      ruby: 'рубиновый',
      garnet: 'гранатовый',
      tawny: 'рыжеватый',
    } as Record<string, string>,
    defaultColor: 'чистый',
    varietal: 'сортовой букет',
    defaultTexture: 'выглаженные',
    lively: 'бодрящей',
    /* Кислотность в творительном падеже: «с высокой кислотностью». */
    acidInstr: {
      low: 'низкой',
      'medium-': 'средней−',
      medium: 'средней',
      'medium+': 'средней+',
      high: 'высокой',
    } as Record<string, string>,
    attack: ['На нёбе раскрывается', 'Во рту разворачивается', 'Первый глоток открывает'],
    wine: 'Вино',
    terrUar: 'Терруар',
    cuvee: 'Купаж',
    inDevelopment: 'в развитии',
    hooks: ['Дегустационная заметка', 'Свежий бокал в блокноте', 'Новая бутылка разобрана по нотам'],
    hashtags: (country: string): string => `#дегустация #${country} #сомелье`,
    unAired: 'НЕ ВЫСТАВЛЕН',
  },
  en: {
    and: (items: string[]): string => (items.length === 0 ? '' : items.length === 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`),
    year: (v: string): string => v,
    window: (f: string | number, t: string | number): string => `${f}–${t}`,
    seconds: (s: number | string): string => `${s} s`,
    secondsApprox: (s: number): string => `about ${s} s`,
    finishHold: 'confidently and long',
    fromRegion: (region: string): string => (region === 'its terroir' ? 'from its terroir' : `from the ${region} region`),
    terroir: 'its terroir',
    yearOf: (v: string | number): string => `${v} vintage`,
    displays: (color: string): string => `shows a ${color} colour`,
    colorMasc: {} as Record<string, string>,
    defaultColor: 'clean',
    varietal: 'the varietal bouquet',
    defaultTexture: 'polished',
    lively: 'lively',
    acidInstr: {} as Record<string, string>,
    attack: ['The palate opens with', 'The mouth unfolds with', 'The first sip reveals'],
    wine: 'Wine',
    terrUar: 'Terroir',
    cuvee: 'Blend',
    inDevelopment: 'still developing',
    hooks: ['A tasting note', 'A fresh glass in the notebook', 'A new bottle taken apart note by note'],
    hashtags: (country: string): string => `#tasting #${country} #sommelier`,
    unAired: 'NOT SET',
  },
} as const;

const pack = (lang: TrLang) => (lang === 'en' ? PACK.en : PACK.ru);

/* ── Вспомогательные сборщики ──────────────────────────────────────────────── */

interface AromaMention {
  label: string;
  family: string;
  level: number;
}

function topAromas(record: TastingRecord, limit: number, lang: TrLang): AromaMention[] {
  const out: AromaMention[] = [];
  for (const [id, level] of Object.entries(record.nose.aromas)) {
    const d = DESCRIPTORS_BY_ID.get(id);
    if (d) out.push({ label: T(d.label).toLowerCase(), family: d.family, level });
  }
  void lang;
  return out.sort((a, b) => b.level - a.level).slice(0, limit);
}

/** Заголовок вина: «Producer · Name, vintage». */
function wineTitleOf(record: TastingRecord, lang: TrLang): string {
  const meta = record.identity;
  return [meta.producer, meta.name].filter(Boolean).join(' · ') || pack(lang).wine;
}

/** Подзаголовок: «vintage г. · region · country · grapes».
 *  Известные приложению топонимы/сорта переводятся, пользовательский текст — как есть. */
function wineSubOf(record: TastingRecord, lang: TrLang): string {
  const meta = record.identity;
  const p = pack(lang);
  return [
    meta.vintage ? p.year(meta.vintage) : null,
    meta.region ? T(meta.region) : null,
    meta.country ? T(meta.country) : null,
    meta.grapes ? T(meta.grapes) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Вердикт качества подписью (или null, если не выставлен). */
function qualityLabelOf(record: TastingRecord): string | null {
  return record.conclusion.quality
    ? T(QUALITY_OPTS.find((q) => q.value === record.conclusion.quality)?.label ?? '') || null
    : null;
}

/** Окно питья строкой «2030–2045 гг.» (или пустая строка). */
function windowStrOf(record: TastingRecord, lang: TrLang): string {
  const c = record.conclusion;
  const p = pack(lang);
  return c.windowFrom && c.windowTo ? p.window(c.windowFrom, c.windowTo) : '';
}

/** Балл 100-шкалы легитимен только в режиме Сомелье Pro. */
function score100Of(record: TastingRecord): number | null {
  return record.mode === 'sommelier-pro' ? record.conclusion.score100 : null;
}

const COLOR_METAPHORS: Record<string, string[]> = {
  lemon: ['лимонная бледность|lemon paleness', 'светоносный лимонный тон|a light-bearing lemon tone'],
  'lemon-green': ['зеленоватая лимонная кромка|a greenish lemon edge', 'юная лимонная зелень|young lemony green'],
  gold: ['золото старой страницы|the gold of an old page', 'медовое золото|honeyed gold'],
  amber: ['янтарная глубина|amber depth', 'тонированный янтарь|tinted amber'],
  ruby: ['рубиновое ядро|a ruby core', 'рубин под свечой|ruby under candlelight'],
  garnet: ['гранатовая глубина|garnet depth', 'гранат у кромки стекла|garnet at the glass edge'],
  purple: ['тёмный пурпур|dark purple', 'чернильный пурпур|inky purple'],
  tawny: ['рыжеватая тесьма|a tawny braid', 'тавн-оттенок старых библиотек|the tawny shade of old libraries'],
  pink: ['нежно-розовая шелковистость|a delicate pink silkiness', 'лепестковый розовый|petal pink'],
  salmon: ['лососевый отблеск|a salmon sheen', 'лососевая кайма|a salmon rim'],
  'orange-rose': ['апельсиновая цедра в цвете|orange zest in colour', 'закатный оранж|sunset orange'],
  brown: ['кирпично-коричневый тон|a brick-brown tone', 'браун граней|the brown of facets'],
};

/** Метафора цвета: RU|EN пары, выбор по языку. */
function colorMetaphorOf(color: string | undefined, record: TastingRecord, lang: TrLang, rng: () => number): string | null {
  if (!color) return null;
  const pool = COLOR_METAPHORS[color];
  if (!pool) return record.eye.color ? (WINE_COLOR_META[record.eye.color]?.label ?? null) : null;
  const picked = pick(rng, pool);
  const idx = picked.indexOf('|');
  return idx === -1 ? picked : lang === 'en' ? picked.slice(idx + 1) : picked.slice(0, idx);
}

/* ── Регистр 1: АКАДЕМИЧЕСКИЙ WSET (чистый протокол экзамена) ─────────────── */

function buildAcademic(record: TastingRecord, profile: StructuralProfile, options: NoteOptions, lang: TrLang): string {
  const L = <T_ extends string>(opts: { value: T_; label: string }[], v: T_ | null): string =>
    v ? (T(opts.find((o) => o.value === v)?.label ?? '') || v) : '—';
  const p = pack(lang);
  const sec = profile.finishSeconds;

  const eyeStr = [
    record.eye.clarity ? L(CLARITY_OPTS, record.eye.clarity) : null,
    record.eye.intensity ? L(VISUAL_INTENSITY_OPTS, record.eye.intensity) : null,
    record.eye.color ? T(WINE_COLOR_META[record.eye.color]?.label ?? '') || null : null,
  ]
    .filter(Boolean)
    .join(', ');

  const noseParts: string[] = [];
  if (record.nose.condition) noseParts.push(L(CONDITION_OPTS, record.nose.condition));
  if (record.nose.intensity) noseParts.push(lang === 'en' ? `intensity ${L(INTENSITY_OPTS, record.nose.intensity).toLowerCase()}` : `интенсивность ${L(INTENSITY_OPTS, record.nose.intensity).toLowerCase()}`);
  if (record.nose.development) noseParts.push(L(DEVELOPMENT_OPTS, record.nose.development));
  const aromas = topAromas(record, 8, lang).map((a) => a.label);
  if (aromas.length) noseParts.push(lang === 'en' ? `aromas: ${p.and(aromas)}` : `ароматы: ${p.and(aromas)}`);
  const noseStr = noseParts.join('; ');

  const palateParts: string[] = [];
  if (record.palate.sweetness) palateParts.push(L(SWEETNESS_OPTS, record.palate.sweetness));
  if (record.palate.acidity) palateParts.push(lang === 'en' ? `acidity ${L(ACIDITY_OPTS, record.palate.acidity).toLowerCase()}` : `кислотность ${L(ACIDITY_OPTS, record.palate.acidity).toLowerCase()}`);
  if (record.palate.tanninLevel) palateParts.push(lang === 'en' ? `tannins ${L(ACIDITY_OPTS, record.palate.tanninLevel).toLowerCase()}` : `танины ${L(ACIDITY_OPTS, record.palate.tanninLevel).toLowerCase()}`);
  if (effectiveAlcoholOf(record)) palateParts.push(lang === 'en' ? `alcohol ${L(ALCOHOL_OPTS, effectiveAlcoholOf(record)).toLowerCase()}` : `алкоголь ${L(ALCOHOL_OPTS, effectiveAlcoholOf(record)).toLowerCase()}`);
  if (record.palate.body) palateParts.push(lang === 'en' ? `body ${L(BODY_OPTS, record.palate.body).toLowerCase()}` : `тело ${L(BODY_OPTS, record.palate.body).toLowerCase()}`);
  if (record.palate.finish)
    palateParts.push(
      lang === 'en'
        ? `finish ${L(FINISH_OPTS, record.palate.finish).toLowerCase()}${sec && sec > 0 ? ` (≈${p.seconds(sec)})` : ''}`
        : `послевкусие ${L(FINISH_OPTS, record.palate.finish).toLowerCase()}${sec && sec > 0 ? ` (≈${p.seconds(sec)})` : ''}`,
    );

  /* BLIC: все четыре опоры с оценками. */
  const blicStr = BLIC_KEYS.map((b) => {
    const r = record.conclusion.blic[b.key];
    if (!r) return `${T(b.label)}: —`;
    const rate = r === 'strong' ? 'сильно' : r === 'adequate' ? 'достаточно' : 'слабо';
    return `${T(b.label)}: ${T(rate)}`;
  }).join('; ');

  const qualityLabel = qualityLabelOf(record);
  const readiness = record.conclusion.readiness
    ? T(READINESS_OPTS.find((o) => o.value === record.conclusion.readiness)?.label ?? '') || null
    : null;
  const windowStr = windowStrOf(record, lang);

  const head = lang === 'en'
    ? ['APPEARANCE', 'NOSE', 'PALATE', 'CONCLUSION (BLIC)', 'VERDICT']
    : ['ВИД', 'НОС', 'РОТ', 'ИТОГ (BLIC)', 'ВЕРДИКТ'];

  return [
    `${wineTitleOf(record, lang)}${wineSubOf(record, lang) ? ` (${wineSubOf(record, lang)})` : ''}.`,
    `${head[0]}: ${eyeStr || '—'}.`,
    `${head[1]}: ${noseStr || '—'}.`,
    `${head[2]}: ${palateParts.length ? palateParts.join(', ') : '—'}.`,
    `${head[3]}: ${blicStr}.`,
    /* WSET запрещает численные баллы — только вердикт качества. */
    `${head[4]}: ${qualityLabel ? qualityLabel.toUpperCase() : p.unAired}.${
      options.window && windowStr ? ` ${lang === 'en' ? `Drinking window: ${windowStr}.` : `Окно питья: ${windowStr}.`}` : ''
    }${readiness ? ` ${lang === 'en' ? `Readiness: ${readiness.toLowerCase()}.` : `Готовность: ${readiness.toLowerCase()}.`}` : ''}`,
  ].join('\n\n');
}

/* ── Регистр 2: РЕСТОРАННЫЙ СОМЕЛЬЕ (глубокий сторителлинг) ───────────────── */

function buildSommelier(record: TastingRecord, profile: StructuralProfile, options: NoteOptions, lang: TrLang, rng: () => number): string {
  const meta = record.identity;
  const p = pack(lang);
  const title = wineTitleOf(record, lang);
  const colorDesc = record.eye.color ? (p.colorMasc[record.eye.color] ?? (T(WINE_COLOR_META[record.eye.color]?.label ?? '').toLowerCase() || p.defaultColor)) : p.defaultColor;
  const aromas = topAromas(record, 6, lang).map((a) => a.label);
  const aromaChain = aromas.length ? p.and(aromas) : p.varietal;
  const textureFeel = record.palate.tanninTexture
    ? (T(TANNIN_TEXTURE_OPTS.find((t) => t.value === record.palate.tanninTexture)?.label ?? '').toLowerCase() || p.defaultTexture)
    : p.defaultTexture;
  const sec = profile.finishSeconds;
  const serving = adviseServing(record, profile);
  const arc = calculateWineLifeArc(record, profile);

  const metaphor = colorMetaphorOf(record.eye.color ?? undefined, record, lang, rng);
  const attack = pick(rng, p.attack);

  const p1 = lang === 'en'
    ? `${title}${meta.vintage ? `, ${p.yearOf(meta.vintage)}` : ''}, ${p.fromRegion(T(meta.region || '') || p.terroir)}, ${p.displays(colorDesc)}${metaphor ? ` — ${metaphor}` : ''}. In the glass sounds ${aromaChain}.`
    : `${title}${meta.vintage ? ` ${p.yearOf(meta.vintage)}` : ''} ${p.fromRegion(meta.region || p.terroir)} ${p.displays(colorDesc)}${metaphor ? ` — ${metaphor}` : ''}. В бокале звучит ${aromaChain}.`;

  const bodyWord = record.palate.body ? (T(BODY_OPTS.find((b) => b.value === record.palate.body)?.label ?? '').toLowerCase() || '') : '';
  const bodyPhrase = lang === 'en'
    ? bodyWord ? `${bodyWord} body` : 'a body'
    : bodyWord ? `${record.palate.body ? (BODY_OPTS.find((b) => b.value === record.palate.body)?.label ?? '') : ''} тело` : 'тело';
  const acidPhrase = lang === 'en'
    ? (record.palate.acidity ? (T(ACIDITY_OPTS.find((a) => a.value === record.palate.acidity)?.label ?? '').toLowerCase() || p.lively) : p.lively)
    : (record.palate.acidity ? (p.acidInstr[record.palate.acidity] ?? p.lively) : p.lively);

  const p2 = lang === 'en'
    ? `${attack} ${bodyPhrase} with ${acidPhrase} acidity. The tannins are ${textureFeel}, building a confident vertical. The finish holds ${sec ? p.secondsApprox(sec) : p.finishHold}, leaving a juicy trail.`
    : `${attack} ${bodyPhrase} с ${acidPhrase} кислотностью. Танины — ${textureFeel}, выстраивают уверенную вертикаль. Финиш держится ${sec ? p.secondsApprox(sec) : p.finishHold}, оставляя сочный след.`;

  /* Конфигурируемые модули: баллы, окно, подача, гастрономия. */
  const extras: string[] = [];
  if (options.score) {
    const qualityLabel = qualityLabelOf(record);
    const score100 = score100Of(record);
    if (qualityLabel) extras.push(lang === 'en' ? `Assessment: ${qualityLabel}${score100 !== null ? ` (${score100}/100)` : ''}.` : `Оценка: ${qualityLabel}${score100 !== null ? ` (${score100}/100)` : ''}.`);
  }
  if (options.window) {
    const windowStr = windowStrOf(record, lang);
    if (windowStr) extras.push(lang === 'en' ? `Maturity window: ${windowStr} (the wine is now ${T(arc.phaseShort).toLowerCase()}).` : `Окно зрелости: ${windowStr} (сейчас вино ${arc.phaseShort.toLowerCase()}).`);
  }
  if (options.serving) extras.push(lang === 'en' ? `Serving: ${T(serving.temperature)}, glass — ${T(serving.glass)}.` : `Подача: ${T(serving.temperature)}, бокал — ${T(serving.glass)}.`);
  if (options.gastro && record.media.gastronomy.length)
    extras.push(lang === 'en' ? `Food pairings: ${p.and(record.media.gastronomy.map((g) => T(g)))}.` : `Гастрономические пары: ${p.and(record.media.gastronomy.map((g) => g.toLowerCase()))}.`);

  const balanceNote =
    profile.balance.computed === 'harmonious'
      ? lang === 'en' ? 'The balance is harmonious: every element pulls in the same harness.' : 'Баланс гармоничный: все элементы тянут одну упряжку.'
      : profile.balance.computed === 'unbalanced'
        ? lang === 'en'
          ? `Unbalanced${record.palate.balance.issues.length ? ` (${record.palate.balance.issues.map((i) => T(BALANCE_ISSUE_OPTS.find((o) => o.value === i)?.label ?? '').toLowerCase() || i).join(', ')})` : ''} — not yet together.`
          : `Дисбаланс${record.palate.balance.issues.length ? ` (${record.palate.balance.issues.map((i) => BALANCE_ISSUE_OPTS.find((o) => o.value === i)?.label.toLowerCase() ?? i).join(', ')})` : ''} — пока не собрался.`
        : '';

  return [[p1, p2].join(' '), balanceNote, extras.join('\n')].filter(Boolean).join('\n\n');
}

/* ── Регистр 3: ШЕЛФ-ТОКЕР БУТИКА (продающая карточка полки) ──────────────── */

function buildShelf(record: TastingRecord, _profile: StructuralProfile, options: NoteOptions, lang: TrLang, rng: () => number): string {
  const meta = record.identity;
  const p = pack(lang);
  const keyNotes = topAromas(record, 3, lang).map((a) => a.label).join(' • ');
  const qualityLabel = qualityLabelOf(record);
  const score100 = score100Of(record);
  const windowStr = windowStrOf(record, lang);

  const opener = pick(rng, lang === 'en'
    ? ['An elegant specimen', 'A characterful wine', 'A precise terroir statement']
    : ['Элегантный образец', 'Характерное вино', 'Точный терруарный стиль']);

  const bodyWord = record.palate.body ? (T(BODY_OPTS.find((b) => b.value === record.palate.body)?.label ?? '').toLowerCase() || '—') : '—';
  const acidWord = record.palate.acidity ? (T(ACIDITY_OPTS.find((a) => a.value === record.palate.acidity)?.label ?? '').toLowerCase() || '—') : '—';

  const lines: (string | null)[] = [
    `🏷️ ${wineTitleOf(record, lang).toUpperCase()}${meta.vintage ? ` · ${meta.vintage}` : ''}`,
    `📍 ${[meta.region, meta.country].filter(Boolean).map((v) => T(v)).join(', ') || (lang === 'en' ? p.terrUar : 'Терруар')} | ${meta.grapes ? T(meta.grapes) : (lang === 'en' ? p.cuvee : 'Купаж')}`,
    `💎 ${lang === 'en' ? 'Profile' : 'Профиль'}: ${keyNotes || opener}`,
    lang === 'en'
      ? `👅 Taste: ${bodyWord} body, ${acidWord} acidity`
      : `👅 Вкус: ${bodyWord} тело, ${acidWord} кислотность`,
    options.score && qualityLabel ? `⭐ ${lang === 'en' ? 'Verdict' : 'Вердикт'}: ${qualityLabel}${score100 !== null ? ` (${score100}/100)` : ''}` : null,
    options.window && windowStr ? `⏳ ${lang === 'en' ? 'Drink' : 'Пить'}: ${windowStr}` : null,
    options.gastro && record.media.gastronomy.length
      ? lang === 'en' ? `🍽 Perfect with: ${record.media.gastronomy.slice(0, 3).join(', ')}` : `🍽️ Идеально к: ${record.media.gastronomy.slice(0, 3).join(', ')}`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

/* ── Регистр 4: TELEGRAM / СОЦСЕТИ (стильный дайджест) ────────────────────── */

function buildSocial(record: TastingRecord, profile: StructuralProfile, options: NoteOptions, lang: TrLang, rng: () => number): string {
  const meta = record.identity;
  const p = pack(lang);
  const emojis = record.media.emojis.length ? record.media.emojis.join(' ') : '🍷';
  const aromas = topAromas(record, 5, lang).map((a) => a.label);
  const qualityLabel = qualityLabelOf(record);
  const score100 = score100Of(record);
  const windowStr = windowStrOf(record, lang);
  const serving = adviseServing(record, profile);

  const hook = pick(rng, p.hooks);

  const acidWord = record.palate.acidity ? (T(ACIDITY_OPTS.find((a) => a.value === record.palate.acidity)?.label ?? '').toLowerCase() || '—') : '—';
  const tanWord = record.palate.tanninLevel ? (T(ACIDITY_OPTS.find((a) => a.value === record.palate.tanninLevel)?.label ?? '').toLowerCase() || '—') : '—';
  const bodyWord = record.palate.body ? (T(BODY_OPTS.find((b) => b.value === record.palate.body)?.label ?? '').toLowerCase() || '—') : '—';

  const lines: (string | null)[] = [
    `${emojis} **${wineTitleOf(record, lang)}** ${meta.vintage ? `(${meta.vintage})` : ''}`,
    `_${wineSubOf(record, lang) || hook}_`,
    '',
    `👃 **${lang === 'en' ? 'Aromas' : 'Ароматы'}:** ${aromas.join(', ') || p.inDevelopment}`,
    lang === 'en'
      ? `👅 **Structure:** acidity ${acidWord}, tannins ${tanWord}, body ${bodyWord}`
      : `👅 **Структура:** кислотность ${acidWord}, танины ${tanWord}, тело ${bodyWord}`,
    options.score && qualityLabel ? `🏆 **${lang === 'en' ? 'Verdict' : 'Вердикт'}:** ${qualityLabel}${score100 !== null ? ` (${score100} pts)` : ''}` : null,
    options.window && windowStr ? `📅 **${lang === 'en' ? 'Drinking window' : 'Окно питья'}:** ${windowStr}` : null,
    options.serving ? `🌡️ **${lang === 'en' ? 'Serving' : 'Подача'}:** ${T(serving.temperature)}` : null,
    options.gastro && record.media.gastronomy.length ? `🍴 **${lang === 'en' ? 'To the table' : 'К столу'}:** ${record.media.gastronomy.join(', ')}` : null,
    '',
    p.hashtags((meta.country || 'wine').replace(/\s+/g, '_')),
  ];
  return lines.filter((l) => l !== null).join('\n');
}

/* ── Публичный API ─────────────────────────────────────────────────────────── */

/**
 * Мастер-генератор заметки.
 *
 * @param record      карточка дегустации (единственный источник фактов)
 * @param profile     структурный профиль (вычислится, если не передан)
 * @param style       регистр: academic | sommelier | shelf | social
 * @param options     комплектация модулями (баллы/окно/подача/гастрономия)
 * @param variant     счётчик «Перефразировать»: меняет метафоры, не факты
 */
export function buildCustomNote(
  record: TastingRecord,
  profileInput?: StructuralProfile,
  style: NoteStyle = 'sommelier',
  options: NoteOptions = DEFAULT_NOTE_OPTIONS,
  variant = 0,
): string {
  const lang = getTrLang();
  const profile = profileInput ?? computeStructuralProfile(record);
  /* variant подмешивается к сиду: каждый клик 🎲 открывает новый синонимический
     ряд, но факты (шкалы, ароматы, вердикт, окно) остаются неизменными. */
  const rng = mulberry32(hashString(`${record.identity.name}|${record.identity.producer}|${record.identity.vintage}|${style}`) ^ (variant * 0x9e3779b1));
  switch (style) {
    case 'academic':
      /* Экзаменационный протокол детерминирован: синонимов нет по канону. */
      return buildAcademic(record, profile, options, lang);
    case 'sommelier':
      return buildSommelier(record, profile, options, lang, rng);
    case 'shelf':
      return buildShelf(record, profile, options, lang, rng);
    case 'social':
      return buildSocial(record, profile, options, lang, rng);
  }
}

/** Сид заметки — используется для «постоянной ссылки» на текст. */
export const narrativeSeedOf = (record: TastingRecord, style: NoteStyle): string =>
  String(hashString(`${record.identity.name}|${record.identity.producer}|${record.identity.vintage}|${style}`));

/** Совместимость со старыми вызовами: полная комплектация, вариант 0. */
export function generateNarrative(record: TastingRecord, style: NoteStyle, profileInput?: StructuralProfile): string {
  return buildCustomNote(record, profileInput, style, DEFAULT_NOTE_OPTIONS, 0);
}
