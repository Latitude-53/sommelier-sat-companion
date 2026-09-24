/**
 * Движок структурного профиля «W34CALC» — чистая функция от карточки дегустации.
 *
 * Шесть осей 0–10: Кислотность, Танины, Тело, Фруктовость, Минеральность,
 * Ощущаемая сладость. Каждая ось собирается композитно: база + вклады смежных
 * пунктов (для отчётов выводится полный хвост вкладов).
 *
 * Ключевые энологические правила:
 *  • Сахар маскирует кислотность и сглаживает танины.
 *  • Высокая кислотность подчёркивает вяжущесть танинов.
 *  • «Сладкое с яркими фруктами не штрафуется»; «сахар без фруктового якоря» — дисбаланс.
 *  • Минеральность — полностью вычисляемая ось (кремень, сланец, TDN, йод, соль…).
 */
import { DESCRIPTORS_BY_ID, FINISH_OPTS, MINERAL_TEXT_KEYS, ACIDITY_OPTS, BODY_OPTS, ALCOHOL_OPTS, SWEETNESS_OPTS, DEVELOPMENT_OPTS, TANNIN_TEXTURE_OPTS } from '@/lib/catalog';
import { FRESH_REGISTER_LABELS } from '@/engine/aromaEngine';
import { faultAnalysisOf, computeAromaSpectrum, type AromaSpectrum, type ComplexityVerdict } from '@/engine/aromaEngine';
import type { TastingRecord } from '@/types/tasting';
import type { BalanceVerdict, BlicKey, BlicRating, QualityLevel, SatAlcohol } from '@/types/wset';

/** Страж пороков живёт в aromaEngine (единый источник с ТЗ §2.Е);
 *  реэкспорт сохраняет старые пути импорта. */
export { faultAnalysisOf };

/* ── Публичные типы ────────────────────────────────────────────────────────── */

export type ProfileAxisKey = 'acidity' | 'tannins' | 'body' | 'fruit' | 'minerality' | 'sweetness';

export interface AxisContribution {
  label: string;
  delta: number;
}

export interface ProfileAxis {
  key: ProfileAxisKey;
  label: string;
  /** Итог 0–10. */
  value: number;
  contributions: AxisContribution[];
}

export type BalanceComputed = 'harmonious' | 'debatable' | 'unbalanced';

export interface BalanceAnalysis {
  /** Явный выбор дегустатора — единственный источник для отчётов. */
  verdict: BalanceVerdict | null;
  /** Автоматический анализ движка. */
  computed: BalanceComputed;
  /** Фруктовый якорь под сладостью присутствует. */
  sugarAnchored: boolean;
  notes: string[];
}

export interface ComplexityAnalysis {
  families: number;
  familiesList: string[];
  label: string;
  /** Вердикт движка (энтропия Шеннона + K, v3): weak / adequate / strong. */
  verdict: ComplexityVerdict;
  /** Нормированная энтропия Шеннона H_norm (0…1). */
  entropy: number;
  /** Индекс концентрации Херфиндаля–Хиршмана (0.11…1) — справочный. */
  hhi: number;
  /** Доли семейств в спектре — для отчётов и дайджеста. */
  spectrum: AromaSpectrum['families'];
}

export interface StructuralProfile {
  axes: ProfileAxis[];
  balance: BalanceAnalysis;
  complexity: ComplexityAnalysis;
  /** Секунды послевкусия (замер или класс). */
  finishSeconds: number | null;
  /** Спектральный анализ носа (Ципф/Вебер-Фехнер/HHI) — источник осей
   *  Fruit/Minerality, сложности и эволюции. Виден в «Сводке». */
  spectrum: AromaSpectrum;
}

export const AXIS_LABELS: Record<ProfileAxisKey, string> = {
  acidity: 'Кислотность',
  tannins: 'Танины',
  body: 'Тело',
  fruit: 'Фруктовость',
  minerality: 'Минеральность',
  sweetness: 'Сладость (ощущ.)',
};

/** Короткие подписи для радара и легенд (без уточнений в скобках). */
export const AXIS_SHORT_RU: Record<ProfileAxisKey, string> = {
  acidity: 'Кислотность',
  tannins: 'Танины',
  body: 'Тело',
  fruit: 'Фруктовость',
  minerality: 'Минеральность',
  sweetness: 'Сладость',
};

/**
 * Делит оси на реально оценённые и пропущенные (v14).
 * Ось считается оценённой, если движок нашёл хоть один вклад (contributions):
 * сладость без выбранной шкалы и минеральность без минеральных дескрипторов/
 * финиша/слов дают value = 0 без вкладов — и раньше ломали паутину нулевыми
 * вершинами. Теперь такие оси исключаются из радара и явно перечисляются
 * в подписи «Не оценивалось: …» (в сводке, печати и автономном экспорте).
 */
export function splitAxesByAssessment(axes: ProfileAxis[]): {
  assessed: ProfileAxis[];
  missing: ProfileAxis[];
} {
  const assessed = axes.filter((a) => a.contributions.length > 0);
  const missing = axes.filter((a) => a.contributions.length === 0);
  return { assessed, missing };
}

/* ── Базовые калибровки ────────────────────────────────────────────────────── */

const SCALE_BASE: Record<string, number> = {
  low: 2.5,
  'medium-': 4,
  medium: 5.5,
  'medium+': 7,
  high: 8.5,
  pronounced: 8.5,
  light: 2.5,
  full: 8.5,
  short: 2,
  long: 8.5,
};

/* Сладость v4: каноническая 4-шаговая прогрессия (dry/off-dry/medium/sweet).
 * Легаси-ключи medium-dry/medium-sweet оставлены для совместимости
 * движка со старыми экспортами — UI и миграция при загрузке их уже не выдают. */
const SWEETNESS_PERCEIVED_BASE: Record<string, number> = {
  dry: 0.8,
  'off-dry': 2.8,
  medium: 5.8,
  sweet: 8.8,
  'medium-dry': 4.8,
  'medium-sweet': 6.8,
};

const SUGAR_BODY_LIFT: Record<string, number> = {
  dry: 0,
  'off-dry': 0.5,
  medium: 1.2,
  sweet: 2,
  'medium-dry': 1,
  'medium-sweet': 1.5,
};

const SUGAR_SMOOTHING: Record<string, number> = {
  dry: 0,
  'off-dry': -0.5,
  medium: -0.8,
  sweet: -1.2,
  'medium-dry': -0.7,
  'medium-sweet': -0.9,
};

const SUGAR_ACID_MASKING: Record<string, number> = {
  dry: 0,
  'off-dry': -0.5,
  medium: -1.2,
  sweet: -2,
  'medium-dry': -1,
  'medium-sweet': -1.5,
};

const ACIDITY_SHAPE_TILT: Record<string, number> = {
  linear: 0,
  'early-peak': 0.4,
  'mid-peak': 0,
  'late-peak': 0.2,
  flat: -0.8,
  'soft-wave': -0.3,
};

const TANNIN_TEXTURE_TILT: Record<string, number> = {
  silky: -1.2,
  chalky: -0.5,
  velvety: -1,
  grainy: 0.7,
  grippy: 0.4,
  rustic: 1.2,
};

const LEGS_BODY_LIFT: Record<string, number> = {
  watery: -0.5,
  thin: 0,
  medium: 0.5,
  thick: 1,
};

const DEV_FRUIT_TILT: Record<string, number> = {
  youthful: 0,
  developing: -0.3,
  'fully-developed': -1,
  tired: -2.5,
};

const clamp10 = (v: number): number => Math.round(Math.min(10, Math.max(0, v)) * 10) / 10;

const num = (v: number, sign: 1 | -1): AxisContribution | null =>
  v === 0 ? null : { label: '', delta: Math.round(v * 10 * sign) / 10 };

/* ── Вспомогательные значения ──────────────────────────────────────────────────── */

export function finishSecondsOf(record: TastingRecord): number | null {
  if (record.palate.caudalieSeconds !== null && record.palate.caudalieSeconds > 0) {
    return record.palate.caudalieSeconds;
  }
  const opt = FINISH_OPTS.find((o) => o.value === record.palate.finish);
  return opt ? opt.seconds : null;
}

/**
 * Алкоголь, с которым работает движок (v17 «Спиртомер»): если в карточке вина
 * указан ABV — калибр выводится из него автоматически (≤10.5% → низкий,
 * <14% → средний, 14%+ → высокий — те же пороги, что у детектора аномалий),
 * и процент больше не выбирается руками второй раз. Ручной выбор остаётся
 * только фолбэком для карточек без крепости.
 */
export function effectiveAlcoholOf(record: TastingRecord): SatAlcohol | null {
  const abv = record.identity.abv;
  if (abv !== null) return abv <= 10.5 ? 'low' : abv < 14 ? 'medium' : 'high';
  return record.palate.alcohol;
}

function collectMineralText(record: TastingRecord): string {
  return [
    record.nose.note,
    record.palate.note,
    record.media.notes,
    record.media.image,
    record.identity.name,
  ].join(' · ');
}

/** Мета дескриптора: статичный каталог (с легаси-алиасами) + теги карточки. */
export function descriptorMetaOf(
  id: string,
  record: TastingRecord,
): { label: string; family: string; mineral: boolean } | null {
  const staticMeta = DESCRIPTORS_BY_ID.get(id);
  if (staticMeta) return staticMeta;
  const tag = record.nose.customTags.find((t) => t.id === id);
  return tag ? { label: tag.label, family: tag.family, mineral: false } : null;
}

/* ── Главный расчёт ────────────────────────────────────────────────────────── */

/** Ярлык опции каталога по слагу (для человекочитаемых вкладов осей). */
const optLabel = (opts: { value: string; label: string }[], v: string): string =>
  opts.find((o) => o.value === v)?.label ?? v;

export function computeStructuralProfile(record: TastingRecord): StructuralProfile {
  const p = record.palate;
  const nose = record.nose;
  /* Спектральный анализ носа: Ципф+Вебер-Фехнер, HHI, фокус, оси, сложность */
  const spectrum = computeAromaSpectrum(record);

  /* — Кислотность ————————————————————————————————— */
  const acidContribs: AxisContribution[] = [];
  let acidity = 0;
  if (p.acidity) {
    acidity = SCALE_BASE[p.acidity] ?? 5;
    acidContribs.push({ label: `база: ${optLabel(ACIDITY_OPTS, p.acidity).toLowerCase()}`, delta: acidity });
    const mask = SUGAR_ACID_MASKING[p.sweetness ?? 'dry'] ?? 0;
    if (mask !== 0) {
      acidity += mask;
      acidContribs.push({ label: 'сахар маскирует', delta: mask });
    }
    const tilt = p.acidityShape ? (ACIDITY_SHAPE_TILT[p.acidityShape] ?? 0) : 0;
    if (tilt !== 0) {
      acidity += tilt;
      acidContribs.push({ label: 'форма волны', delta: tilt });
    }
  }

  /* — Танины ————————————————————————————————————— */
  const tanContribs: AxisContribution[] = [];
  let tannins = 0;
  if (p.tanninLevel) {
    tannins = SCALE_BASE[p.tanninLevel] ?? 5;
    tanContribs.push({ label: `количество: ${optLabel(ACIDITY_OPTS, p.tanninLevel).toLowerCase()}`, delta: tannins });
    if ((p.acidity ? SCALE_BASE[p.acidity] ?? 5 : 5) >= 7) {
      tannins += 0.5;
      tanContribs.push({ label: 'кислота подчёркивает вязкость', delta: 0.5 });
    }
    const smooth = SUGAR_SMOOTHING[p.sweetness ?? 'dry'] ?? 0;
    if (smooth !== 0) {
      tannins += smooth;
      tanContribs.push({ label: 'сахар сглаживает', delta: smooth });
    }
    const tex = p.tanninTexture ? (TANNIN_TEXTURE_TILT[p.tanninTexture] ?? 0) : 0;
    if (tex !== 0) {
      tannins += tex;
      tanContribs.push({ label: `текстура: ${optLabel(TANNIN_TEXTURE_OPTS, p.tanninTexture ?? "").toLowerCase()}`, delta: tex });
    }
  }

  /* — Тело ——————————————————————————————————————— */
  const bodyContribs: AxisContribution[] = [];
  let body = 0;
  if (p.body) {
    body = SCALE_BASE[p.body] ?? 5;
    bodyContribs.push({ label: `база: ${optLabel(BODY_OPTS, p.body).toLowerCase()}`, delta: body });
    const sugar = SUGAR_BODY_LIFT[p.sweetness ?? 'dry'] ?? 0;
    if (sugar !== 0) {
      body += sugar;
      bodyContribs.push({ label: 'сахар', delta: sugar });
    }
    let alcLift = 0;
    const effAlcohol = effectiveAlcoholOf(record);
    if (effAlcohol === 'high') alcLift = 1.5;
    else if (effAlcohol === 'medium') alcLift = 0.5;
    else if (effAlcohol === 'low') alcLift = -0.5;
    if (alcLift !== 0) {
      body += alcLift;
      bodyContribs.push({ label: `алкоголь: ${optLabel(ALCOHOL_OPTS, effAlcohol ?? "").toLowerCase()}`, delta: alcLift });
    }
    const legs = record.eye.legs ? (LEGS_BODY_LIFT[record.eye.legs] ?? 0) : 0;
    if (legs !== 0) {
      body += legs;
      bodyContribs.push({ label: 'глицерин / ножки', delta: legs });
    }
    const oakCount = Object.keys(nose.aromas).filter((id) => {
      const d = descriptorMetaOf(id, record);
      return d?.family === 'oak';
    }).length;
    if (oakCount >= 2) {
      body += 0.5;
      bodyContribs.push({ label: 'новый дуб', delta: 0.5 });
    }
    /* Спектр под капотом: дуб и ферментация добавляют плотность телу (ТЗ §1) */
    const fermentCount = Object.keys(nose.aromas).filter((id) => {
      const d = descriptorMetaOf(id, record);
      return d?.family === 'ferment';
    }).length;
    if (fermentCount >= 2) {
      body += 0.5;
      bodyContribs.push({ label: 'автолиз / МЛО-плотность', delta: 0.5 });
    }
  }

  /* — Фруктовость: сенсорная сила P_F фруктов напрямую (ТЗ v3 §2.1/§5 п.2) —
   *  БЕЗ штрафа деления на сумму ароматов: Санджовезе держит 7.6+, Риоха
   *  совмещает три столпа на максимуме. */
  const fruitContribs: AxisContribution[] = [];
  const fruitFam = spectrum.families.find((f) => f.key === 'fruit');
  let fruit = spectrum.fruitLevel;
  if (fruit > 0 && fruitFam) {
    fruitContribs.push({
      label: `сенсорная сила P_F: якорь ${fruitFam.maxLevel} ур. + разнообразие ${fruitFam.uniqueCount - 1} нот${spectrum.baseIntensitySource !== 'fallback' ? ` · громкость ${spectrum.baseIntensity.toFixed(1)}` : ''}`,
      delta: spectrum.fruitLevel,
    });
    if (spectrum.freshRegister) {
      fruitContribs.push({
        label: `регистр Φ_fresh ${(spectrum.phiFresh ?? 0).toFixed(2)}: ${FRESH_REGISTER_LABELS[spectrum.freshRegister]}`,
        delta: 0,
      });
    }
    const dev = DEV_FRUIT_TILT[nose.development ?? 'youthful'] ?? 0;
    if (dev !== 0) {
      fruit += dev;
      fruitContribs.push({ label: `развитие: ${optLabel(DEVELOPMENT_OPTS, nose.development ?? "").toLowerCase()}`, delta: dev });
    }
    const sec = finishSecondsOf(record);
    if (sec !== null && sec >= 8) {
      fruit += 0.5;
      fruitContribs.push({ label: 'финиш 8+ сек держит ядро', delta: 0.5 });
    }
  }
  fruit = Math.max(0, fruit);

  /* — Минеральность: P_F минералов + акцент финиша + маркеры текста — */
  const minContribs: AxisContribution[] = [];
  let minerality = spectrum.mineralLevel;
  if (spectrum.mineralLevel > 0) {
    minContribs.push({
      label: `сенсорная сила P_F «Минералов»${spectrum.baseIntensitySource !== 'fallback' ? ` · громкость ${spectrum.baseIntensity.toFixed(1)}` : ''}`,
      delta: spectrum.mineralLevel,
    });
  }
  if (p.finishAccent === 'mineral') {
    minerality += 2;
    minContribs.push({ label: 'финиш: минеральный', delta: 2 });
  }
  const text = collectMineralText(record);
  for (const key of MINERAL_TEXT_KEYS) {
    if (key.re.test(text)) {
      minerality += key.weight;
      minContribs.push({ label: `текст: ${key.label}`, delta: key.weight });
    }
  }

  /* — Ощущаемая сладость ——————————————————————————— */
  const sweetContribs: AxisContribution[] = [];
  let sweetness = 0;
  if (p.sweetness) {
    sweetness = SWEETNESS_PERCEIVED_BASE[p.sweetness] ?? 5;
    sweetContribs.push({ label: `сахар: ${optLabel(SWEETNESS_OPTS, p.sweetness).toLowerCase()}`, delta: sweetness });
    const acidBase = p.acidity ? SCALE_BASE[p.acidity] ?? 5 : 0;
    const acidMask = acidBase >= 8.5 ? -1.6 : acidBase >= 7 ? -1.2 : acidBase >= 5.5 ? -0.8 : -0.4;
    sweetness += acidMask;
    sweetContribs.push({ label: 'кислота сушит', delta: acidMask });
    const tanBase = p.tanninLevel ? SCALE_BASE[p.tanninLevel] ?? 5 : 0;
    const tanMask = tanBase >= 8.5 ? -1.2 : tanBase >= 7 ? -0.9 : tanBase >= 5.5 ? -0.5 : 0;
    if (tanMask !== 0) {
      sweetness += tanMask;
      sweetContribs.push({ label: 'танины сушат', delta: tanMask });
    }
  }

  /* — Баланс ————————————————————————————————————— */
  const balance = analyseBalance(record, clamp10(fruit), clamp10(acidity), clamp10(tannins));

  const profile: StructuralProfile = {
    axes: [
      { key: 'acidity', label: AXIS_LABELS.acidity, value: clamp10(acidity), contributions: acidContribs },
      { key: 'tannins', label: AXIS_LABELS.tannins, value: clamp10(tannins), contributions: tanContribs },
      { key: 'body', label: AXIS_LABELS.body, value: clamp10(body), contributions: bodyContribs },
      { key: 'fruit', label: AXIS_LABELS.fruit, value: clamp10(fruit), contributions: fruitContribs },
      { key: 'minerality', label: AXIS_LABELS.minerality, value: clamp10(minerality), contributions: minContribs },
      { key: 'sweetness', label: AXIS_LABELS.sweetness, value: clamp10(sweetness), contributions: sweetContribs },
    ],
    balance,
    complexity: analyseComplexity(record, spectrum),
    finishSeconds: finishSecondsOf(record),
    spectrum,
  };
  return profile;
}

/* ── Баланс: гармония сладость↔фрукты↔кислота↔танины ──────────────────────── */

export function analyseBalance(
  record: TastingRecord,
  fruit: number,
  acidity: number,
  tannins: number,
): BalanceAnalysis {
  const p = record.palate;
  const notes: string[] = [];

  const sweetnessVal = SWEETNESS_PERCEIVED_BASE[p.sweetness ?? 'dry'] ?? 0;
  const sugarAnchored = sweetnessVal >= 4.8 ? fruit >= 4 : true;

  if (sweetnessVal >= 4.8) {
    if (sugarAnchored) {
      notes.push('Сладкое с ярким фруктовым якорем — не штрафуется.');
    } else {
      notes.push('Сахар без фруктового якоря — классический дисбаланс.');
    }
  }
  if (acidity >= 8 && tannins >= 8 && sweetnessVal < 4.8) {
    notes.push('Кислота и танины одновременно давят — вино жёсткое.');
  }
  if (fruit <= 3 && acidity >= 6) {
    notes.push('Кислота обнажена: фруктового ядра мало.');
  }

  /* Субъективное восприятие алкоголя (v14): не меняет вердикт — комментирует.
     «Выпирает/Жгучий» — маркер горячести; «Спрятан/Вплетён» — признак интеграции. */
  if (p.alcoholFeel === 'protruding') {
    notes.push('Алкоголь выпирает: спиртовая волна перекрывает фрукт.');
  } else if (p.alcoholFeel === 'burning') {
    notes.push('Спирт жжёт: горячая волна давит на нёбо и глушит финиш.');
  } else if (p.alcoholFeel === 'hidden' || p.alcoholFeel === 'woven') {
    notes.push('Спирт интегрирован: тепло не выпирает над фруктом.');
  }

  const hardFlags = (!sugarAnchored && sweetnessVal >= 4.8 ? 1 : 0) + (acidity >= 8 && tannins >= 8 ? 1 : 0) + (fruit <= 3 && acidity >= 6 ? 1 : 0);
  const computed: BalanceComputed = hardFlags >= 1 ? 'unbalanced' : hardFlags === 0 && sweetnessVal >= 4.8 ? 'harmonious' : fruit > 0 || acidity > 0 ? 'debatable' : 'harmonious';

  // Пользовательские причины учитываются только при явном «несбалансированное»
  const userIssues = p.balance.verdict === 'unbalanced' ? p.balance.issues.length : 0;
  const finalComputed: BalanceComputed =
    p.balance.verdict === 'unbalanced' || computed === 'unbalanced' || userIssues > 0
      ? 'unbalanced'
      : p.balance.verdict === 'balanced'
        ? 'harmonious'
        : computed;

  return { verdict: p.balance.verdict, computed: finalComputed, sugarAnchored, notes };
}

/* ── Сложность: энтропия Шеннона (ТЗ v3 §2.3) + справочный HHI ─────────── */

export function analyseComplexity(record: TastingRecord, spectrum?: AromaSpectrum): ComplexityAnalysis {
  const sp = spectrum ?? computeAromaSpectrum(record);
  const label = sp.activeFamilies === 0 ? '—' : COMPLEXITY_RU[sp.complexity];
  return {
    families: sp.activeFamilies,
    familiesList: sp.familiesList,
    label,
    verdict: sp.complexity,
    entropy: sp.entropy,
    hhi: sp.hhi,
    spectrum: sp.families,
  };
}

const COMPLEXITY_RU: Record<ComplexityVerdict, string> = {
  weak: 'Простое / моно-фокус',
  adequate: 'Многослойное',
  strong: 'Комплексное',
};

/* ── Автоподсказки BLIC и вердикта ─────────────────────────────────────────── */

export function suggestBlic(record: TastingRecord, profile: StructuralProfile): Partial<Record<BlicKey, BlicRating>> {
  const sec = profile.finishSeconds ?? 0;
  const result: Partial<Record<BlicKey, BlicRating>> = {};

  result.balance =
    profile.balance.computed === 'harmonious'
      ? 'strong'
      : profile.balance.computed === 'unbalanced'
        ? 'weak'
        : 'adequate';
  result.length = sec >= 8 ? 'strong' : sec >= 4 ? 'adequate' : sec > 0 ? 'weak' : 'adequate';
  const intensity = record.nose.intensity ?? record.palate.flavourIntensity;
  result.intensity =
    intensity === 'pronounced' || intensity === 'medium+'
      ? 'strong'
      : intensity === 'medium'
        ? 'adequate'
        : intensity
          ? 'weak'
          : 'adequate';
  result.complexity = profile.complexity.verdict;
  return result;
}

/** Взвешенные очки BLIC (ТЗ v6 §«Справедливый расчёт Q2»):
 *  Strong = 1.0, Adequate = 0.5, Weak = 0.0 — максимум 4.0 балла.
 *  • 4.0  → все 4 опоры сильные           → Outstanding;
 *  • 3.0+ → 3 сильные или 2С+2А           → Very good;
 *  • 2.0+ → 2 сильные или 4 средние       → Good;
 *  • 1.0+ → 1 сильная или 2 средние       → Acceptable;
 *  • <1   → Слабое. */
export function suggestQuality(
  blic: Partial<Record<BlicKey, BlicRating>>,
  hasFault: boolean,
): QualityLevel | null {
  if (hasFault) return 'faulty';
  const keys: BlicKey[] = ['balance', 'length', 'intensity', 'complexity'];
  if (keys.some((k) => blic[k] === undefined)) return null;
  const score = keys.reduce((acc, k) => {
    const val = blic[k];
    return acc + (val === 'strong' ? 1 : val === 'adequate' ? 0.5 : 0);
  }, 0);
  if (score >= 4.0) return 'outstanding';
  if (score >= 3.0) return 'very-good';
  if (score >= 2.0) return 'good';
  if (score >= 1.0) return 'acceptable';
  return 'poor';
}

/** Канонические диапазоны пересчёта вердикта WSET L3 в 100-балльную шкалу
 *  (Parker / CMS). 100-балльный ползунок жёстко зажат в коридор выбранного
 *  вердикта: «Хорошее» → 85–89 (медиана 87), «Выдающееся» → 95–100 (96) и т.д.
 *  Логическая дыра «Good = 96» больше невозможна по построению. */
export const WSET_TO_100_RANGES: Record<QualityLevel, { min: number; max: number; def: number; label: string }> = {
  faulty: { min: 50, max: 69, def: 60, label: 'Дефектное (50–69)' },
  poor: { min: 70, max: 79, def: 74, label: 'Слабое (70–79)' },
  acceptable: { min: 80, max: 84, def: 82, label: 'Приемлемое (80–84)' },
  good: { min: 85, max: 89, def: 87, label: 'Хорошее (85–89)' },
  'very-good': { min: 90, max: 94, def: 92, label: 'Очень хорошее (90–94)' },
  outstanding: { min: 95, max: 100, def: 96, label: 'Выдающееся (95–100)' },
};

/** Предложение 100-балльной шкалы из вердикта — медиана канонического коридора. */
export function suggestScore100(quality: QualityLevel | null): number | null {
  return quality ? (WSET_TO_100_RANGES[quality]?.def ?? null) : null;
}

/** Форматированный хвост вкладов оси (для тултипов и экспортов). */
export function formatContributions(axis: ProfileAxis): string[] {
  const parts: string[] = [];
  for (const c of axis.contributions) {
    const sign = c.delta > 0 ? '+' : '';
    parts.push(`${c.label} ${sign}${c.delta.toFixed(1)}`);
  }
  const total = num(axis.value, 1);
  parts.push(`= ${total ? total.delta.toFixed(1) : '0.0'}`);
  return parts;
}
