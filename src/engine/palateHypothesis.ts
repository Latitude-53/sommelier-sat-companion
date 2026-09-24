/**
 * Сенсорная гипотеза сомелье — «ожидание перед глотком» (ТЗ v3 §3.3).
 *
 * Чистая функция от карточки и спектра носа: по составу колеса предсказывает,
 * ЧТО язык почувствует в «Рту» — кислотность, танины, тело. Гипотеза
 * выдвигается ДО пробы и сверки с фактом; в отчёт не навязывается.
 */

import { computeAromaSpectrum, FRESH_REGISTER_HINTS, FRESH_REGISTER_LABELS, isDenseFruit, type AromaSpectrum } from '@/engine/aromaEngine';
import type { TastingRecord } from '@/types/tasting';

/** Цитрусы и зелёные плоды — маркеры вибрирующей кислотности. */
const CRISP_FRUIT_IDS: ReadonlySet<string> = new Set([
  'lemon',
  'lime',
  'grapefruit',
  'orange-peel',
  'mandarin',
  'green-apple',
  'gooseberry',
]);

/** Травяная свежесть (семейство herbal полностью). */
const HERBAL_IDS: ReadonlySet<string> = new Set([
  'bell-pepper',
  'cut-grass',
  'blackcurrant-leaf',
  'tomato-leaf',
  'asparagus',
  'green-peas',
  'eucalyptus',
  'mint',
  'fennel',
  'lemongrass',
  'sage',
  'thyme',
  'rosemary',
  'dill',
]);

/** Тёмные ягоды — предвестники плотного танинного каркаса. */
const DARK_BERRY_IDS: ReadonlySet<string> = new Set([
  'blackcurrant',
  'blackberry',
  'blueberry',
  'black-cherry',
  'black-plum',
]);

/** Новый дуб (кедр, тост и спутники бочки). */
const NEW_OAK_IDS: ReadonlySet<string> = new Set([
  'cedar',
  'toast',
  'vanilla',
  'coconut',
  'sandalwood',
  'pine-resin',
  'charred-wood',
  'smoke',
  'coffee',
  'chocolate',
]);

/** Третичность (кожа, табак и возрастные тона). */
const TERTIARY_IDS: ReadonlySet<string> = new Set([
  'leather',
  'tobacco',
  'cigar-box',
  'game',
  'forest-floor',
  'mushroom',
  'truffle',
  'damp-earth',
  'tea',
]);

/** МЛО / автолиз: сливки, масло, кремовая текстура. */
const MLO_IDS: ReadonlySet<string> = new Set(['butter', 'cream', 'yogurt', 'cheese-rind']);

export interface HypothesisLine {
  /** Короткий вердикт (жирная строка карточки). */
  tone: string;
  /** Энологическая расшифровка. */
  note: string;
}

export interface PalateHypothesis {
  acidity: HypothesisLine;
  tannin: HypothesisLine;
  body: HypothesisLine;
  /** Регистр фрукта: подпись + подсказка (если фрукты выбраны). */
  register: { label: string; hint: string; phi: number } | null;
}

/** Уровень дескриптора в карточке (свой тег или каталог). */
function levelOf(id: string, record: TastingRecord): number {
  return record.nose.aromas[id] ?? 0;
}

/** Сумма уровней перечисленных дескрипторов. */
function sumIds(ids: Iterable<string>, record: TastingRecord): number {
  let s = 0;
  for (const id of ids) s += levelOf(id, record);
  return s;
}

/** Есть ли среди дескрипторов хоть один с уровнем > 0 (или подходящий свой тег). */
function anyActive(ids: Iterable<string>, record: TastingRecord): boolean {
  for (const id of ids) if (levelOf(id, record) > 0) return true;
  return false;
}

/** Плотные фрукты с учётом своих тегов (эвристика по подписи). */
function denseWeight(record: TastingRecord): number {
  let w = 0;
  for (const [id, lvl] of Object.entries(record.nose.aromas)) {
    if (!lvl || lvl <= 0) continue;
    const tag = record.nose.customTags.find((t) => t.id === id);
    if (tag) {
      if (tag.family === 'fruit' && isDenseFruit(id, tag.label)) w += lvl;
      continue;
    }
    if (isDenseFruit(id, null)) w += lvl;
  }
  return w;
}

/** Главная гипотеза: что почувствуется во «Рту» до глотка. */
export function palateHypothesisOf(record: TastingRecord, spectrum?: AromaSpectrum): PalateHypothesis {
  const sp = spectrum ?? computeAromaSpectrum(record);
  const style = record.identity.style;

  /* — Регистр фрукта — */
  const register = sp.freshRegister
    ? {
        label: FRESH_REGISTER_LABELS[sp.freshRegister],
        hint: FRESH_REGISTER_HINTS[sp.freshRegister],
        phi: sp.phiFresh ?? 0,
      }
    : null;

  /* — Ожидаемая кислотность (ТЗ §3.3 п.1) — */
  const crispW =
    sumIds(CRISP_FRUIT_IDS, record) + sumIds(HERBAL_IDS, record) + (sp.families.find((f) => f.key === 'mineral')?.power ?? 0) * 1.2;
  const denseW = denseWeight(record);
  const phi = sp.phiFresh;
  let acidity: HypothesisLine;
  if (phi !== null && phi >= 0.7 && crispW >= 2) {
    acidity = {
      tone: 'Высокая, вибрирующая, острая атака',
      note: 'Цитрусы, зелень и минералы при свежем регистре фрукта — слюна побежит сразу.',
    };
  } else if ((phi !== null && phi < 0.35) || denseW > crispW) {
    acidity = {
      tone: 'Сглаженная, купольная, мягкая',
      note: 'Вяленый фрукт и джем гасят остриё: ожидаем округлую арку без резкой атаки.',
    };
  } else if (sp.families.length === 0) {
    acidity = { tone: '—', note: 'Отметьте дескрипторы на колесе — гипотеза соберётся сама.' };
  } else {
    acidity = {
      tone: 'Сбалансированная, умеренная',
      note: 'Состав букета без явного крена в свежесть или уваренность — ровная кислотность.',
    };
  }

  /* — Ожидаемый танин (ТЗ §3.3 п.2) — */
  const darkOrStructure =
    anyActive(DARK_BERRY_IDS, record) || anyActive(NEW_OAK_IDS, record) || anyActive(TERTIARY_IDS, record);
  const oakPower = sp.families.find((f) => f.key === 'oak')?.power ?? 0;
  const floralOnly =
    (sp.families.find((f) => f.key === 'floral')?.power ?? 0) > 0 && !darkOrStructure;
  const lightStyle = style === 'white' || style === 'rose';
  let tannin: HypothesisLine;
  if (darkOrStructure || oakPower >= 5.6) {
    tannin = {
      tone: 'Плотный, структурный каркас',
      note: 'Тёмные ягоды, новый дуб или третичность — ожидаем Medium+ / High и держащий скелет.',
    };
  } else if (lightStyle || floralOnly) {
    tannin = {
      tone: 'Шелковистый, низкий или бесшовный',
      note: lightStyle
        ? 'Белое/розе без структурных маркеров — танины почти неощутимы.'
        : 'Лёгкая цветочность — текстура скользкая, без вяжущего скелета.',
    };
  } else {
    tannin = {
      tone: 'Умеренный, округлый',
      note: 'Без явных структурных якорей — ожидаем мягкую подложку без жёсткости.',
    };
  }

  /* — Ожидаемое тело (ТЗ §3.3 п.3) — */
  const mloActive = anyActive(MLO_IDS, record);
  const fermentPower = sp.families.find((f) => f.key === 'ferment')?.power ?? 0;
  const mineralPower = sp.families.find((f) => f.key === 'mineral')?.power ?? 0;
  let body: HypothesisLine;
  if (oakPower >= 5.6 || mloActive || denseW >= 2 || fermentPower >= 5.6) {
    body = {
      tone: 'Плотное, кремовое, обволакивающее',
      note: 'Дуб, МЛО-тоны или сухофрукты дают вес: экстракт держит середину нёба.',
    };
  } else if (mineralPower > 0 && lightStyle && (phi === null || phi >= 0.7)) {
    body = {
      tone: 'Лёгкое, линейное, хрустящее',
      note: 'Свежий минеральный профиль — тонкая вертикаль без лишней плотности.',
    };
  } else if (sp.families.length === 0) {
    body = { tone: '—', note: 'Пока колесо пусто — гипотезе не на что опереться.' };
  } else {
    body = {
      tone: 'Среднее, аккуратное',
      note: 'Умеренный экстракт: ожидаем точную середину без провалов и напора.',
    };
  }

  return { acidity, tannin, body, register };
}
