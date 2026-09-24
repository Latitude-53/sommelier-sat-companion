/**
 * AromaEngine — «спектральный анализатор» носа (ТЗ «Нос и Колесо ароматов»).
 *
 * Нос — это чистое восприятие: никаких плашек и осей в разделе «Нос».
 * Все отмеченные на колесе семейства работают под капотом единым спектром,
 * а результаты видны только в «Сводке»: оси Fruit/Minerality радара,
 * авто-Complexity для BLIC, индекс эволюции и страж пороков.
 *
 * Математика v3 (сенсорный процессор, ТЗ §2):
 *  • Сенсорная сила семейства P_F — независимая шкала 0–10 БЕЗ штрафа за
 *    сложность: P_F = min(10, round₁((A(w_max) + 1.18·ln(1+0.82·Σ_rest))·M)),
 *    якоря A(1)=3.4 / A(2)=5.6 / A(3)=7.6, M — модуляция интенсивностью.
 *  • Геометрия колеса: закон Ципфа L₁+0.5·L₂+0.25·L₃+0.1·хвост,
 *    Energy = √Raw·1.5, Weight = 1 + Energy + 0.65·√UniqueCount,
 *    θᵢ = (Weightᵢ/ΣWeight)·360°; экструзия 16px (•••) / 8px (••) / 0.
 *  • Регистр фрукта Φ_fresh = Σw_fresh/(Σw_fresh+Σw_dense+ε):
 *    ≥0.70 Primary Crunch · 0.35…0.70 Ripe Balance · <0.35 Tertiary Depth.
 *  • Сложность — нормированная энтропия Шеннона H_norm по распределению
 *    сил: K≥4 и H≥0.75 → strong; K≥2 и H≥0.5 → adequate; иначе weak.
 *  • Эволюция (пирамида P/S/T): EvolutionIndex = (0.5·S + T)/(P + S + T).
 */

import { DESCRIPTORS_BY_ID, faultBehavior } from '@/lib/catalog';
import type { FaultRecord, TastingRecord } from '@/types/tasting';
import type { Development, SatIntensity } from '@/types/wset';

/** Карта семейств статичного каталога: id дескриптора → семейство. */
const STATIC_FAMILY: ReadonlyMap<string, string> = new Map(
  [...DESCRIPTORS_BY_ID.entries()].map(([id, meta]) => [id, meta.family]),
);

/* ── Публичные типы ────────────────────────────────────────────────────────── */

export type ComplexityVerdict = 'weak' | 'adequate' | 'strong';

/** Энергетика одного семейства колеса. */
export interface FamilyEnergy {
  /** Ключ семейства (fruit…tertiary, faults). */
  key: string;
  /** Закон Ципфа: L₁ + 0.5·L₂ + 0.25·L₃ + 0.1·Σ(k≥4). */
  rawScore: number;
  /** Вебер–Фехнер: √RawScore · 1.5. */
  energy: number;
  /** Визуальный вес для угла колеса: 1 + Energy + 0.65·√UniqueCount. */
  weight: number;
  /** Число уникальных дескрипторов. */
  uniqueCount: number;
  /** Максимальный уровень в семействе (0…3). */
  maxLevel: 0 | 1 | 2 | 3;
  /** Экструзия наружу: ••• → 16px, •• → 8px, иначе 0. */
  extrusionPx: number;
  /** Доля в общем спектре pᵢ = Energyᵢ/ΣEnergy (0…1). */
  share: number;
  /** Коэффициент фокуса солирующего семейства. */
  focusBonus: number;
  /** Угол сектора в градусах. */
  spanDeg: number;
  /** Сенсорная сила семейства P_F (0…10, ТЗ v3 §2.1) — независимая
   *  психофизическая шкала без штрафа за сложность. */
  power: number;
}

/** Регистр зрелости фрукта Φ_fresh (ТЗ v3 §2.2). */
export type FreshRegister = 'primary-crunch' | 'ripe-balance' | 'tertiary-depth';

/** Полный спектральный анализ носа. Чистая функция от карточки. */
export interface AromaSpectrum {
  /** Энергетика всех задействованных семейств (в порядке колеса). */
  families: FamilyEnergy[];
  /** ΣEnergy — суммарная громкость букета. */
  totalEnergy: number;
  /** Индекс Херфиндаля–Хиршмана Σpᵢ²: 1 — моно-фокус, ближе к 1/K — рассеяние. */
  hhi: number;
  /** Число задействованных благородных семейств K. */
  activeFamilies: number;
  /** Список задействованных семейств. */
  familiesList: string[];
  /** Базовая громкость вина (Интенсивность вкуса, иначе носа, иначе 5.5). */
  baseIntensity: number;
  /** Источник базовой громкости — для отчётов. */
  baseIntensitySource: 'palate' | 'nose' | 'fallback';
  /** Ось Fruit радара: сенсорная сила P_F фруктов (ТЗ v3 §2.1, без штрафа за сложность). */
  fruitLevel: number;
  /** Ось Minerality радара: P_F минералов. */
  mineralLevel: number;
  /** Доли семейств фруктов и минералов (для подписей вкладов). */
  fruitShare: number;
  mineralShare: number;
  /** Регистр зрелости фрукта Φ_fresh (0…1) или null, если фруктов нет. */
  phiFresh: number | null;
  /** Регистр фрукта для подписей. */
  freshRegister: FreshRegister | null;
  /** Нормированная энтропия Шеннона H_norm (0…1, ТЗ v3 §2.3). */
  entropy: number;
  /** Авторасчёт Сложности для BLIC (энтропия Шеннона + K). */
  complexity: ComplexityVerdict;
  /** Человекочитаемая метка сложности. */
  complexityLabel: string;
  /** Пирамида P/S/T (суммы RawScore). */
  pyramid: { primary: number; secondary: number; tertiary: number };
  /** Индекс эволюции (0…1): (0.5·S + T)/(P + S + T). */
  evolutionIndex: number;
  /** Согласован индекса с полем «Развитие». */
  evolutionMatch: 'match' | 'mismatch' | 'unknown';
  /** Страж пороков. */
  faults: {
    fatal: FaultRecord[];
    stylisticHeavy: FaultRecord[];
    stylisticLight: FaultRecord[];
    faultyMode: boolean;
    terroirStyle: boolean;
    hasAnyFault: boolean;
  };
}

/* ── Сенсорный процессор v3 (ТЗ §2): сила, свежесть, энтропия ─────────────── */

/** Базовые якоря психофизической шкалы: A(1)=3.4, A(2)=5.6, A(3)=7.6. */
export const POWER_ANCHORS: Record<1 | 2 | 3, number> = { 1: 3.4, 2: 5.6, 3: 7.6 };

/** Модуляция глобальной интенсивностью (ТЗ §2.1 п.4); не выбрана → 1.0. */
export function intensityMultiplierOf(intensity: SatIntensity | null | undefined): number {
  switch (intensity) {
    case 'low':
      return 0.85;
    case 'medium-':
      return 0.92;
    case 'medium':
      return 1.0;
    case 'medium+':
      return 1.08;
    case 'pronounced':
      return 1.15;
    default:
      return 1.0;
  }
}

/**
 * Сенсорная сила семейства P_F (ТЗ v3 §2.1) — независимая шкала 0–10 без
 * штрафа за сложность: якорь по максимальной ноте + логарифмическое
 * насыщение Вебера–Фехнера за разнообразие × модуляция интенсивностью.
 * P_F = min(10, round₁((A(w_max) + 1.18·ln(1 + 0.82·Σ_rest)) · M)).
 */
export function sensoryPowerOf(levels: number[], intensity: SatIntensity | null | undefined): number {
  if (levels.length === 0) return 0;
  const wMax = Math.max(...levels) as 1 | 2 | 3;
  const anchor = POWER_ANCHORS[wMax] ?? 0;
  const sumRest = levels.reduce((s, l) => s + l, 0) - wMax;
  const diversity = 1.18 * Math.log(1 + 0.82 * Math.max(0, sumRest));
  const modulated = (anchor + diversity) * intensityMultiplierOf(intensity);
  return Math.min(10, Math.round(modulated * 10) / 10);
}

/** Плотные/уваренные фруктовые дескрипторы (ТЗ v3 §2.2, Dense/Tertiary). */
export const DENSE_FRUIT_IDS: ReadonlySet<string> = new Set([
  'fig',
  'prune',
  'raisin',
  'dates',
  'jam',
  'baked-apple',
]);

/** Ключевые слова плотных/вяленых тонов для своих тегов (эвристика по подписи). */
const DENSE_LABEL_RE = /(инжир|чернослив|изюм|финик|джем|варень|печён|печен|вялен|увар|сухофрукт|fig|prune|raisin|date|jam|baked|dried|cooked)/i;

/** Плотный ли фруктовый дескриптор: каталог по id, свои теги — по подписи. */
export function isDenseFruit(id: string, label: string | null): boolean {
  if (DENSE_FRUIT_IDS.has(id)) return true;
  if (id === 'cooked-strawberry') return true; // легаси-алиас джема
  return label ? DENSE_LABEL_RE.test(label) : false;
}

/** Регистр фрукта по Φ_fresh (ТЗ v3 §2.2). */
export function freshRegisterOf(phi: number): FreshRegister {
  if (phi >= 0.7) return 'primary-crunch';
  if (phi >= 0.35) return 'ripe-balance';
  return 'tertiary-depth';
}

export const FRESH_REGISTER_LABELS: Record<FreshRegister, string> = {
  'primary-crunch': 'Primary Crunch',
  'ripe-balance': 'Ripe Balance',
  'tertiary-depth': 'Tertiary Depth',
};

export const FRESH_REGISTER_HINTS: Record<FreshRegister, string> = {
  'primary-crunch': 'свежий, хрустящий первичный сок',
  'ripe-balance': 'сочная, округлая спелость',
  'tertiary-depth': 'уваренный, вяленый, ликёрный тон выдержки',
};

/**
 * Нормированная энтропия Шеннона распределения сенсорных сил (ТЗ v3 §2.3):
 * p_F = P_F/ΣP_k, H_norm = −Σ p·ln(p) / ln(N). 1 — идеальная полифония,
 * 0 — моно-фокус.
 */
export function shannonEntropyOf(powers: number[]): number {
  const active = powers.filter((p) => p > 0);
  const n = active.length;
  if (n <= 1) return 0;
  const total = active.reduce((s, p) => s + p, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const p of active) {
    const share = p / total;
    h -= share * Math.log(share);
  }
  return h / Math.log(n);
}

/** Вердикт сложности по энтропии и числу активных семейств (ТЗ v3 §2.3). */
export function complexityFromEntropy(k: number, hNorm: number): ComplexityVerdict {
  if (k >= 4 && hNorm >= 0.75) return 'strong';
  if (k >= 2 && hNorm >= 0.5) return 'adequate';
  return 'weak';
}

/* ── Чистые формулы (используются и колесом) ───────────────────────────────── */

/** Закон Ципфа: уровни сортируются по убыванию, вклад хвоста гаснет (0.5 → 0.25 → 0.1). */
export function zipfRawScore(levels: number[]): number {
  const sorted = [...levels].sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const w = i === 0 ? 1 : i === 1 ? 0.5 : i === 2 ? 0.25 : 0.1;
    sum += (sorted[i] ?? 0) * w;
  }
  return sum;
}

/** Вебер–Фехнер: ощущение растёт как корень из стимула. */
export function energyOf(rawScore: number): number {
  return rawScore > 0 ? Math.sqrt(rawScore) * 1.5 : 0;
}

/** Визуальный вес сектора: у пустого семейства — скромная единица. */
export function weightOf(energy: number, uniqueCount: number): number {
  return 1 + energy + 0.65 * Math.sqrt(uniqueCount);
}

/** Экструзия наружу: ••• → 16px, •• → 8px, иначе 0. */
export function extrusionOf(maxLevel: 0 | 1 | 2 | 3): number {
  return maxLevel === 3 ? 16 : maxLevel === 2 ? 8 : 0;
}

/** Базовая громкость вина: Интенсивность вкуса → иначе нос → иначе 5.5. */
const INTENSITY_BASE: Record<SatIntensity, number> = {
  low: 2.5,
  'medium-': 4.0,
  medium: 5.5,
  'medium+': 7.0,
  pronounced: 8.5,
};

export function baseIntensityOf(record: TastingRecord): { value: number; source: 'palate' | 'nose' | 'fallback' } {
  if (record.palate.flavourIntensity) {
    return { value: INTENSITY_BASE[record.palate.flavourIntensity] ?? 5.5, source: 'palate' };
  }
  if (record.nose.intensity) {
    return { value: INTENSITY_BASE[record.nose.intensity] ?? 5.5, source: 'nose' };
  }
  return { value: 5.5, source: 'fallback' };
}

/** Уровни дескрипторов семейства из карты выбора (в т.ч. свои теги). */
function levelsForFamily(family: string, record: TastingRecord): number[] {
  const levels: number[] = [];
  for (const [id, lvl] of Object.entries(record.nose.aromas)) {
    if (!lvl || lvl <= 0) continue;
    const meta = descriptorFamilyOf(id, record);
    if (meta === family) levels.push(lvl);
  }
  return levels;
}

/** Семейство дескриптора: статичный каталог → свои теги карточки. */
function descriptorFamilyOf(id: string, record: TastingRecord): string | null {
  const tag = record.nose.customTags.find((t) => t.id === id);
  if (tag) return tag.family;
  return STATIC_FAMILY.get(id) ?? null;
}

/* ── Сложность и эволюция ──────────────────────────────────────────────────── */

/** Верdict сложности по HHI и числу семейств — LEGACY v42 (ТЗ Engine §2.Г).
 *  С v3 сложность считается по энтропии Шеннона (complexityFromEntropy);
 *  оставлен для совместимости. */
export function complexityVerdictOf(k: number, hhi: number): ComplexityVerdict {
  if (k <= 2 || hhi >= 0.65) return 'weak';
  if (k >= 5 && hhi < 0.35) return 'strong';
  return 'adequate';
}

export const COMPLEXITY_LABELS: Record<ComplexityVerdict, string> = {
  weak: 'Простое / моно-фокус',
  adequate: 'Многослойное',
  strong: 'Комплексное',
};

/** Пирамида эволюции: P (первичные) / S (вторичные) / T (третичные+терруар). */
function pyramidScores(record: TastingRecord): { p: number; s: number; t: number } {
  const byFamily = new Map<string, number>();
  for (const [id, lvl] of Object.entries(record.nose.aromas)) {
    if (!lvl || lvl <= 0) continue;
    const fam = descriptorFamilyOf(id, record);
    if (!fam) continue;
    byFamily.set(fam, (byFamily.get(fam) ?? 0) + lvl);
  }
  const sum = (...fams: string[]): number => fams.reduce((acc, f) => acc + (byFamily.get(f) ?? 0), 0);
  return {
    p: sum('fruit', 'floral', 'herbal'),
    s: sum('oak', 'ferment'),
    t: sum('tertiary', 'mineral'),
  };
}

/** Детектор аномалий эволюции: индекс против поля «Развитие» (ТЗ §2.Д). */
export function evolutionMatchOf(index: number, development: Development | null): 'match' | 'mismatch' | 'unknown' {
  if (development === null) return 'unknown';
  if (development === 'youthful' || development === 'tired') {
    // Молодое: третичных быть не должно (index → 0); увядшее: обязаны быть.
    return development === 'youthful' ? (index < 0.2 ? 'match' : 'mismatch') : index >= 0.35 ? 'match' : 'mismatch';
  }
  // Developing / Fully developed: ожидаем заметный третичный вклад.
  return index >= 0.15 ? 'match' : 'mismatch';
}

/* ── Страж пороков (ТЗ §2.Е) ───────────────────────────────────────────────── */

export interface FaultAnalysis {
  /** Фатальные пороки (TCA, сероводород/редукция, VA) — любого уровня. */
  fatal: FaultRecord[];
  /** Стилистические дефекты уровня 2–3 • — режим дефекта. */
  stylisticHeavy: FaultRecord[];
  /** Стилистические дефекты уровня 1 • — нейтральная терруарная стилистика. */
  stylisticLight: FaultRecord[];
  /** Режим дефекта: качество выше Acceptable заблокировано, вердикт — Faulty,
   *  потенциал выдержки недоступен. */
  faultyMode: boolean;
  /** Только слабые стилистические тона — нейтральное предупреждение. */
  terroirStyle: boolean;
  hasAnyFault: boolean;
}

/** Анализ списка дефектов карточки: что блокирует качество и выдержку.
 *  Фатальные (TCA, H2S, VA) — любого уровня; стилистические (бретт, SO2,
 *  оксидация, резина) — 1 • мягкая подсказка, 2–3 •• режим дефекта. */
export function faultAnalysisOf(record: TastingRecord): FaultAnalysis {
  const faults = record.nose.faults;
  const fatal: FaultRecord[] = [];
  const stylistic: FaultRecord[] = [];
  for (const f of faults) (faultBehavior(f.type) === 'fatal' ? fatal : stylistic).push(f);
  const stylisticHeavy = stylistic.filter((f) => f.severity !== 'light');
  const stylisticLight = stylistic.filter((f) => f.severity === 'light');
  const faultyMode = fatal.length > 0 || stylisticHeavy.length > 0;
  return {
    fatal,
    stylisticHeavy,
    stylisticLight,
    faultyMode,
    terroirStyle: !faultyMode && stylisticLight.length > 0,
    hasAnyFault: faults.length > 0,
  };
}

/* ── Главный расчёт ────────────────────────────────────────────────────────── */

/** Округление до 0.1 с клэмпом 0…10. */
export const clamp10 = (v: number): number => Math.round(Math.min(10, Math.max(0, v)) * 10) / 10;

/** Полный спектральный анализ носа — единый источник для «Сводки». */
export function computeAromaSpectrum(record: TastingRecord): AromaSpectrum {
  const NOBLE_ORDER = ['fruit', 'floral', 'herbal', 'spice', 'oak', 'ferment', 'mineral', 'tertiary'];

  /* Модуляция интенсивностью: нос → иначе вкус → иначе 1.0 (ТЗ v3 §2.1 п.4) */
  const modulation = record.nose.intensity ?? record.palate.flavourIntensity ?? null;

  /* Энергетика семейств */
  const energies: FamilyEnergy[] = [];
  for (const key of NOBLE_ORDER) {
    const levels = levelsForFamily(key, record);
    if (levels.length === 0) continue;
    const rawScore = zipfRawScore(levels);
    const energy = energyOf(rawScore);
    const maxLevel = Math.max(...levels) as 0 | 1 | 2 | 3;
    energies.push({
      key,
      rawScore,
      energy,
      weight: weightOf(energy, levels.length),
      uniqueCount: levels.length,
      maxLevel,
      extrusionPx: extrusionOf(maxLevel),
      share: 0, // заполняется ниже
      focusBonus: 1,
      spanDeg: 0,
      power: sensoryPowerOf(levels, modulation),
    });
  }

  const totalEnergy = energies.reduce((s, f) => s + f.energy, 0);

  /* Доли, HHI, фокус, углы */
  let hhi = 0;
  if (totalEnergy > 0) {
    for (const f of energies) {
      f.share = f.energy / totalEnergy;
      hhi += f.share * f.share;
    }
    for (const f of energies) f.focusBonus = 1 + 0.35 * (f.share * hhi);
    const totalWeight = energies.reduce((s, f) => s + f.weight, 0);
    for (const f of energies) f.spanDeg = (f.weight / totalWeight) * 360;
  }

  /* Оси радара v3: сенсорная сила P_F напрямую — БЕЗ штрафа деления на
   * сумму ароматов (ТЗ v3 §1, §5 п.2). Строгий ноль при пустом семействе. */
  const base = baseIntensityOf(record);
  const powerOf = (key: string): { value: number; share: number } => {
    const f = energies.find((e) => e.key === key);
    if (!f || f.power <= 0) return { value: 0, share: f?.share ?? 0 };
    return { value: f.power, share: f.share };
  };
  const fruit = powerOf('fruit');
  const mineral = powerOf('mineral');

  /* Регистр зрелости фрукта Φ_fresh (ТЗ v3 §2.2) */
  let freshW = 0;
  let denseW = 0;
  for (const [id, lvl] of Object.entries(record.nose.aromas)) {
    if (!lvl || lvl <= 0) continue;
    if (descriptorFamilyOf(id, record) !== 'fruit') continue;
    const label =
      record.nose.customTags.find((t) => t.id === id)?.label ??
      DESCRIPTORS_BY_ID.get(id)?.label ??
      null;
    if (isDenseFruit(id, label)) denseW += lvl;
    else freshW += lvl;
  }
  const hasFruit = freshW + denseW > 0;
  const phiFresh = hasFruit ? freshW / (freshW + denseW + 0.0001) : null;
  const freshRegister = phiFresh !== null ? freshRegisterOf(phiFresh) : null;

  /* Сложность v3: энтропия Шеннона по распределению сил (ТЗ v3 §2.3) */
  const familiesList = energies.map((e) => e.key);
  const entropy = shannonEntropyOf(energies.map((e) => e.power));
  const complexity = complexityFromEntropy(familiesList.length, entropy);

  /* Пирамида и эволюция */
  const pyr = pyramidScores(record);
  const denom = pyr.p + pyr.s + pyr.t;
  const evolutionIndex = denom > 0 ? (0.5 * pyr.s + pyr.t) / denom : 0;

  /* Страж пороков */
  const faults = faultAnalysisOf(record);

  return {
    families: energies,
    totalEnergy,
    hhi,
    activeFamilies: familiesList.length,
    familiesList,
    baseIntensity: base.value,
    baseIntensitySource: base.source,
    fruitLevel: fruit.value,
    mineralLevel: mineral.value,
    fruitShare: fruit.share,
    mineralShare: mineral.share,
    phiFresh,
    freshRegister,
    entropy,
    complexity,
    complexityLabel: COMPLEXITY_LABELS[complexity],
    pyramid: { primary: pyr.p, secondary: pyr.s, tertiary: pyr.t },
    evolutionIndex,
    evolutionMatch: evolutionMatchOf(evolutionIndex, record.nose.development),
    faults,
  };
}
