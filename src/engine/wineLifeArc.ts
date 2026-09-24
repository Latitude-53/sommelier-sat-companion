/**
 * «Кривая жизни вина» v9 — ПАРАМЕТРИЧЕСКАЯ КИНЕТИКА + ДВОЙНОЙ БАЛЛ.
 * (Universal Enological Kinetics Engine, редакция «В мире нет двух одинаковых бутылок»).
 *
 * Вместо дерева «if вино такое-то → шаблон» — единая непрерывная математическая
 * модель, в которой форма кривой физически изгибается от каждого клика
 * дегустатора: молодое Кьянти в стали и Кьянти Гран Селецьоне с 30 месяцами
 * дуба рисуют принципиально разные траектории, потому что сомелье отметил
 * разную текстуру танина, разную форму волны и разный финиш.
 *
 *   [1. Химический щит консервации P_pres]  — танины (только red/orange!),
 *       кислотный хребет, сахар в десертных концентрациях, спирт ≥ крепления
 *       и ТЕКСТУРНЫЙ МОДИФИКАТОР: шелковистый танин стареет благороднее,
 *       грубый (rustic) быстро высыхает.
 *        ↓
 *   [2. Топливный буфер экстракта Fuel] — «вино не может прожить дольше,
 *       чем живёт его фруктовое ядро». Лёгкое свежее вино (isLightFresh)
 *       живёт в честном коридоре 1.5–4.5 года — фантазии о 45 годах отсечены.
 *        ↓
 *   L = clamp(…, 2.0, 60) → параметрическая кривая Y(t):
 *       старт Y₀, подъём t_rise, Золотое плато t_plateau и
 *   [3. Dumb Phase Valley] — провал закрытости, глубина которого зависит
 *       от текстуры танина: «хваткий/зернистый» → яма глубже и дольше,
 *       «шелковистый/бархатистый» → мягкая волна, вино раскрывается раньше.
 *        ↓
 *   [4. ДВОЙНОЙ БАЛЛ] — честная оценка текущего баланса в бокале
 *       (S_today, со штрафом за молодость/закрытость) и математический
 *       прогноз максимального балла на Золотом плато (S_zenith) — рост за
 *       счёт интеграции полифенолов, длины финиша и энтропии букета.
 *
 * Движок также выдаёт органолептический прогноз по любому году
 * (getTasteNoteAtYear) — «машина времени» для сканера осциллографа зрелости —
 * и проекцию осей на зенит (zenithAxesOf) для двухконтурного радара
 * «Настоящее ↔ Зенит» на вкладке «Сводка».
 */
import { faultAnalysisOf, finishSecondsOf, type StructuralProfile } from '@/engine/structuralProfile';
import type { TastingRecord } from '@/types/tasting';
import type { QualityLevel, Readiness, TanninTexture } from '@/types/wset';

/* ── Публичные типы ────────────────────────────────────────────────────────── */

export type LifePhase = 'rising' | 'dumb' | 'peak' | 'declining';

/**
 * Непрерывная классификация траектории — производная от физики модели
 * (щит × топливо × Y₀ × текстура), а не вход дерева шаблонов.
 */
export type LifeArchetype =
  | 'immediate'
  | 'classic'
  | 'grand-cru'
  | 'sweet-immortal'
  | 'oxidative';

export type ArchetypeTone = 'gold' | 'sage' | 'garnet' | 'neutral';

export interface WineLifeArc {
  vintage: number;
  currentYear: number;
  /** Реальный срок жизни в годах от винтажа. */
  lifespan: number;
  peakFrom: number;
  peakTo: number;
  /** Последний год жизни вина. */
  lifeEnd: number;
  /** Позиция текущего года на дуге: 0…100%. */
  currentPercent: number;
  phase: LifePhase;
  phaseLabel: string;
  phaseShort: string;
  /** Готовность, которую дуга предлагает карточке. */
  readiness: Readiness;
  archetype: LifeArchetype;
  archetypeLabel: string;
  archetypeTone: ArchetypeTone;
  /** Есть ли фаза закрытости: структурный танин у некреплёного не-свежего вина. */
  hasDumbPhase: boolean;
  /** Глубина провала закрытости (доля от амплитуды): зависит от текстуры танина. */
  dumbDepth: number;
  /** Стартовая готовность Y(0) ∈ [0.28, 0.95] — «сколько вина уже в бокале на релизе». */
  y0: number;
  /** Доля подъёма и плато в общей длине дуги (0…1). */
  riseRatio: number;
  plateauRatio: number;
  /** Предохранительный щит консервации P_pres (полифенолы+кислота+сахар+спирт+текстура). */
  pPres: number;
  /** Топливный буфер экстракта Fuel (фруктовое ядро ×1.3 + тело + каудалии). */
  fuel: number;
  /** Балл сегодня: текущий баланс в бокале со штрафом за молодость/закрытость. */
  scoreToday: number;
  /** Потенциал в зените: максимальный балл на Золотом плато. */
  scoreZenith: number;
  /** Органолептический прогноз состояния вина на нёбе в заданном году. */
  getTasteNoteAtYear: (year: number) => string;
}

const LIFESPAN_MAX = 60;
const LIFESPAN_MIN_LIGHT = 1.5;
const LIFESPAN_MIN_STRUCT = 2.0;

/** Базовые баллы вердиктов WSET (Parker-подобная шкала) — когда численный
 * балл не выставлен, двойная оценка отталкивается от вердикта BLIC. */
export const QUALITY_BASE_SCORE: Record<QualityLevel, number> = {
  faulty: 50,
  poor: 62,
  acceptable: 76,
  good: 87,
  'very-good': 91,
  outstanding: 96,
};

export function currentYearOf(): number {
  return new Date().getFullYear();
}

/** Разбор винтажа из свободной строки («2018», «NV», пусто). */
export function parseVintage(raw: string, fallback: number): number {
  const m = raw.match(/\d{4}/);
  const y = m ? Number(m[0]) : NaN;
  if (!Number.isFinite(y) || y < 1900 || y > currentYearOf() + 1) return fallback;
  return y;
}

const r1 = (v: number): number => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* ── Универсальный расчёт ──────────────────────────────────────────────────── */

export function calculateWineLifeArc(record: TastingRecord, profile: StructuralProfile): WineLifeArc {
  const currentYear = currentYearOf();
  const vintage = parseVintage(record.identity.vintage.trim(), currentYear - 1);

  const axisOf = (key: string): number => profile.axes.find((a) => a.key === key)?.value ?? 0;
  const acid = axisOf('acidity');
  const tannin = axisOf('tannins');
  const fruit = axisOf('fruit');
  const body = axisOf('body');
  const finishSec = finishSecondsOf(record) ?? 4;

  const isFortified = record.identity.fortified === true;
  const sweetness = record.palate.sweetness ?? 'dry';
  const isSweet = sweetness === 'sweet' || sweetness === 'medium';
  const style = record.identity.style ?? 'red';
  const tanninTexture: TanninTexture | null = record.palate.tanninTexture ?? null;
  const freshRegister = profile.spectrum.freshRegister;
  const faults = faultAnalysisOf(record);
  const faultyMode = faults.faultyMode;

  /* 1. ФАКТОРЫ КОНСЕРВАЦИИ (ХИМИЧЕСКИЙ КАРКАС).
   * Танинный щит работает только для красных и оранжевых; кислота — ОВ-хребет;
   * сахар консервирует в десертных концентрациях; спирт крепления — барьер. */
  const tanninShield = style === 'red' || style === 'orange' ? Math.max(0, tannin - 3.5) : 0;
  const acidSpine = Math.max(0, acid - 4.2);
  const sugarShield = sweetness === 'sweet' ? 8 : sweetness === 'medium' ? 3.5 : sweetness === 'off-dry' ? 1.0 : 0;
  const alcoholShield = isFortified ? 14 : record.palate.alcohol === 'high' ? 1.2 : record.palate.alcohol === 'low' ? -1.0 : 0;

  /* Текстурный модификатор: шелковистый танин стареет благороднее,
   * грубый быстро высыхает. Зернистый/хваткий щит не добавляют, зато
   * углубляют яму закрытости (см. dumbDepth). */
  const textureBonus =
    tanninTexture === 'silky' ? 1.2 :
    tanninTexture === 'velvety' ? 0.8 :
    tanninTexture === 'chalky' ? 0.5 :
    tanninTexture === 'rustic' ? -1.5 : 0;

  const pPres = 1.5 * tanninShield + 1.2 * acidSpine + 1.4 * sugarShield + 1.6 * alcoholShield + textureBonus;

  /* Экстрактивное топливо: хватит ли фрукта и тела пережить собственный щит. */
  const finishBonus = Math.min(6, Math.max(0, finishSec) * 0.32);
  const fuel = (Math.max(1, fruit) * 1.3 + Math.max(1, body) + finishBonus) / 14;

  /* Биологический модификатор зрелости: первичный хруст добавляет запас,
   * третичная глубина — часть эволюции пройдена, пороки убивают потенциал. */
  let freshMod = 1.0;
  if (freshRegister === 'primary-crunch') freshMod = 1.15;
  else if (freshRegister === 'tertiary-depth') freshMod = 0.82;
  if (faultyMode) freshMod = 0.15;

  /* Лёгкое свежее вино (не креплёное, не сладкое, танин ≤ 3.5, кислота < 8)
   * живёт в честном коридоре 1.5–4.5 года — сколько живёт его фрукт. */
  const isLightFresh = !isFortified && !isSweet && tannin <= 3.5 && acid < 8;
  const lifespan = isLightFresh
    ? clamp(r1((2.0 + 0.4 * acidSpine + 0.3 * fruit) * freshMod), LIFESPAN_MIN_LIGHT, 4.5)
    : clamp(r1((2.5 + pPres * fuel) * freshMod), LIFESPAN_MIN_STRUCT, LIFESPAN_MAX);

  /* 2. ДИНАМИЧЕСКИЙ СТАРТ Y0 И ПАРАМЕТРЫ ФАЗ.
   * Свежее вино стартует почти с потолка (0.90 — пить прямо сейчас);
   * структурное опускается тем ниже, чем выше танинный щит и кислота. */
  const y0 = isLightFresh
    ? 0.9
    : clamp(0.95 - 0.09 * tanninShield - 0.04 * acidSpine + (isFortified ? 0.1 : 0) + (isSweet ? 0.05 : 0), 0.28, 0.95);

  /* Фаза закрытости: у структурного некреплёного вина с танинным щитом ≥ 2.5
   * и высокой кислотой или танином. У порочного вина «великого потенциала»
   * нет — порок закрывает и яму, и плато. */
  const hasDumbPhase =
    !isLightFresh && !isFortified && !faultyMode && tanninShield >= 2.5 && (acid >= 7 || tannin >= 7);

  /* Глубина ямы зависит от ТЕКСТУРЫ танина: хваткий/зернистый — суровое
   * закрытое вино на 3–5 лет; шелковистый — мягкая волна. Богатый фрукт
   * приподнимает дно (плод печётся сквозь закрытость). */
  const dumbDepth = hasDumbPhase
    ? clamp(
        0.35 +
          (tanninTexture === 'grippy' || tanninTexture === 'grainy' ? 0.15 : 0) -
          (fruit >= 7.5 ? 0.1 : 0),
        0.25,
        0.55,
      )
    : 0;

  const riseRatio = isLightFresh ? 0.06 : clamp(0.35 * (1 - y0) + (hasDumbPhase ? 0.08 : 0), 0.05, 0.38);
  const plateauRatio = isFortified ? 0.75 : isSweet ? 0.6 : clamp(0.38 + 0.02 * pPres, 0.3, 0.65);

  const peakFrom = Math.round(vintage + (y0 >= 0.85 ? 0 : lifespan * riseRatio));
  const peakTo = Math.round(peakFrom + lifespan * plateauRatio);
  const lifeEnd = Math.round(vintage + lifespan);

  /* 3. ТЕКУЩАЯ ТОЧКА И ФАЗА. */
  const age = Math.max(0, currentYear - vintage);
  const currentPercent = Math.min(100, Math.max(0, Math.round((age / lifespan) * 100)));

  let phase: LifePhase = 'peak';
  let phaseLabel = 'На пике — золотое плато';
  let phaseShort = 'На пике';
  let readiness: Readiness = 'drink-now';

  if (currentYear < peakFrom) {
    if (hasDumbPhase && age >= 2 && age <= Math.round(lifespan * 0.2)) {
      phase = 'dumb';
      phaseLabel = 'Фаза закрытости (Dumb phase) — спит';
      phaseShort = 'Закрыто';
      readiness = 'too-young';
    } else {
      phase = 'rising';
      phaseLabel = y0 < 0.5 ? 'Молодое — набор структуры' : 'Молодое — восходящий потенциал';
      phaseShort = 'Молодое';
      readiness = peakFrom - currentYear <= 1 ? 'drink-not-peak' : 'too-young';
    }
  } else if (currentYear > peakTo) {
    phase = 'declining';
    phaseLabel = 'На спаде — рекомендуется пить';
    phaseShort = 'На спаде';
    readiness = 'declining';
  }

  /* 4. ДВОЙНОЙ БАЛЛ: СЕГОДНЯ VS ЗЕНИТ.
   * База — численный балл дегустатора, иначе вердикт BLIC в Parker-баллах.
   * Штраф за молодость: закрытое вино в яме недодаёт −4, суровое молодое −3,
   * спад −3 (фрукт уже угас). Зенит растёт от щита консервации, длинного
   * финиша и энтропии букета — но не больше +6 и только у растущих вин. */
  const baseScore = record.conclusion.score100 ?? QUALITY_BASE_SCORE[record.conclusion.quality ?? 'good'];

  let youthDiscount = 0;
  if (phase === 'dumb') youthDiscount = -4;
  else if (phase === 'rising') youthDiscount = y0 < 0.5 ? -3 : -1;
  else if (phase === 'declining') youthDiscount = -3;

  const scoreToday = clamp(baseScore + youthDiscount, 50, 100);

  const growthPotential = isLightFresh
    ? 0
    : Math.round(Math.min(6, pPres * 0.35 + (finishSec >= 12 ? 2 : 1) + (profile.spectrum.entropy >= 0.7 ? 1.5 : 0)));

  const scoreZenith = faultyMode ? scoreToday : clamp(baseScore + (phase === 'peak' ? 0 : growthPotential), scoreToday, 100);

  /* Органолептический прогноз на любой год («что в бокале в этот год?»). */
  const getTasteNoteAtYear = (targetYear: number): string => {
    const yr = Math.round(targetYear);
    const yrAge = yr - vintage;
    if (yrAge <= 1 && y0 >= 0.8) {
      return '🍓 Свежий первичный сок: хрустящие ягоды, кислота без шероховатостей.';
    }
    if (hasDumbPhase && yrAge >= 2 && yrAge < peakFrom - vintage) {
      return '⚠️ Фаза закрытости: первичный фрукт уснул, танин обнажён. Не тревожить бутылку.';
    }
    if (yr >= peakFrom && yr <= peakTo) {
      return `👑 Золотое плато (Зенит ~${scoreZenith} б.): идеальная гармония полифенолов, шлейф третичных нот.`;
    }
    if (yr > peakTo) {
      return '🍂 Спад: затухание фрукта, высыхание танинов, оксидативный скелет.';
    }
    return 'Вино набирает тело, кислота и дуб постепенно притираются.';
  };

  /* Непрерывная классификация архетипа — производная физики, не шаблон. */
  let archetype: LifeArchetype = 'classic';
  if (isFortified) archetype = 'oxidative';
  else if (isSweet) archetype = 'sweet-immortal';
  else if (isLightFresh) archetype = 'immediate';
  else if (hasDumbPhase) archetype = 'grand-cru';

  const archetypeLabel = isFortified
    ? 'Креплёное плато'
    : isSweet
      ? 'Сладкий долгожитель'
      : isLightFresh
        ? 'Пить молодым (свежесть)'
        : hasDumbPhase
          ? 'Великий потенциал (Dumb Phase)'
          : 'Классическая выдержка';

  const archetypeTone: ArchetypeTone = isLightFresh ? 'sage' : hasDumbPhase ? 'garnet' : 'gold';

  return {
    vintage,
    currentYear,
    lifespan,
    peakFrom,
    peakTo,
    lifeEnd,
    currentPercent,
    phase,
    phaseLabel,
    phaseShort,
    readiness,
    archetype,
    archetypeLabel,
    archetypeTone,
    hasDumbPhase,
    dumbDepth,
    y0,
    riseRatio,
    plateauRatio,
    pPres,
    fuel,
    scoreToday,
    scoreZenith,
    getTasteNoteAtYear,
  };
}

/* ── Проекция на зенит для двухконтурного радара ──────────────────────────── */

/**
 * «Настоящее ↔ Зенит»: как угловатый молодой танин и острая кислота через
 * 8–10 лет превратятся в гармоничный купол. Контур имеет смысл только для
 * вин, которые ещё растут (подъём или яма закрытости) и живут ≥ 6 лет.
 * Физика интеграции: за estimateyears на плато танин полимеризуется,
 * кислота притирается, первичный фрукт уходит в третичный шлейф,
 * минеральность проявляется ярче, тело ощущается плотнее.
 *
 * @return карта «ось → значение в зените» или null (второй контур не рисуем).
 */
export function zenithAxesOf(record: TastingRecord, profile: StructuralProfile): Record<string, number> | null {
  const arc = calculateWineLifeArc(record, profile);
  if (arc.phase !== 'rising' && arc.phase !== 'dumb') return null;
  if (arc.lifespan < 6) return null;

  const axisOf = (key: string): number => profile.axes.find((a) => a.key === key)?.value ?? 0;
  const cl = (v: number): number => Math.max(0.5, Math.min(10, Math.round(v * 10) / 10));
  /* Интеграция: экстремумы подтягиваются к куполу 7–7.5, скромные значения слегка растут. */
  const integrate = (v: number, soft: number): number => cl(v - Math.max(0, v - 7) * soft - 0.5);

  return {
    tannins: integrate(axisOf('tannins'), 0.55),
    acidity: integrate(axisOf('acidity'), 0.45),
    fruit: cl(axisOf('fruit') >= 7.5 ? axisOf('fruit') - 0.4 : axisOf('fruit') + 0.3),
    body: cl(axisOf('body') + 0.2),
    minerality: cl(axisOf('minerality') + 0.4),
    sweetness: cl(axisOf('sweetness')),
  };
}
