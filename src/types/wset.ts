/**
 * Типы шкал и классификаторов WSET Level 3 Systematic Approach to Tasting (SAT 2021)
 * и расширений «Sommelier Pro / Ресторанный протокол».
 *
 * Инвариант: в режиме `wset3` недоступны авторские фичи (ножки, форма волны
 * кислотности, каудалиеметр, 100-балльная шкала, диск ядро+кайма).
 */

/** Режим дегустации: строгий экзамен WSET L3 или гибкий ресторанный протокол. */
export type TastingMode = 'wset3' | 'sommelier-pro';

/* ── Универсальные пятиуровневые шкалы SAT ─────────────────────────────────── */

/** Шкала силы: low / medium- / medium / medium+ / high|pronounced. */
export type SatScale5 = 'low' | 'medium-' | 'medium' | 'medium+' | 'high';

/** Интенсивность аромата/вкуса (верхний уровень — pronounced). */
export type SatIntensity = 'low' | 'medium-' | 'medium' | 'medium+' | 'pronounced';

/** Кислотность и танины. */
export type SatAcidity = 'low' | 'medium-' | 'medium' | 'medium+' | 'high';

/** Тело. */
export type SatBody = 'light' | 'medium-' | 'medium' | 'medium+' | 'full';

/** Длина послевкусия (каудалии). */
export type SatFinish = 'short' | 'medium-' | 'medium' | 'medium+' | 'long';

/* ── Вид (Eye) ──────────────────────────────────────────────────────────────── */

export type Clarity = 'clear' | 'hazy';

/** Визуальная интенсивность. */
export type VisualIntensity = 'pale' | 'medium' | 'deep';

/** Цвет-основа вина — определяет набор цветовых категорий и советы подачи.
 *  Игристость и крепление — независимые флаги (sparkling/fortified в WineIdentity):
 *  игристым бывает любой цвет (белое/розе/красное), сладость — шкала в «Рту». */
export type WineStyle =
  | 'white'
  | 'rose'
  | 'red'
  | 'orange';

/** Цветовые категории WSET L3 (SAT 2021), сгруппированы по типу вина. */
export type WineColor =
  | 'lemon-green'
  | 'lemon'
  | 'gold'
  | 'amber'
  | 'brown'
  | 'pink'
  | 'salmon'
  | 'orange-rose'
  | 'purple'
  | 'ruby'
  | 'garnet'
  | 'tawny';

/** Пара HEX-цветов для отрисовки диска: ядро + кайма. */
export interface ColorPair {
  /** HEX ядра. */
  core: string;
  /** HEX каймы (обычно светлее). */
  rim: string;
}

/* ── Нос (Nose) ────────────────────────────────────────────────────────────── */

export type Condition = 'clean' | 'unclean';

/** Развитие аромата (возрастная стадия). */
export type Development = 'youthful' | 'developing' | 'fully-developed' | 'tired';

/** Тип дефекта вина. */
export type FaultType = 'tca' | 'reduction' | 'oxidation' | 'va' | 'brett' | 'so2' | 'rubber';

/** Выраженность дефекта. */
export type FaultSeverity = 'light' | 'distinct' | 'heavy';

/* ── Рот (Palate) ──────────────────────────────────────────────────────────── */

/** Сладость WSET L3 — каноническая прогрессия с границами в г/л:
 *  сухое < 4 · полусухое 4–12 · полусладкое 12–45 · сладкое 45+.
 *  (Легаси-значения medium-dry/medium-sweet мигрируются в `medium` при загрузке.) */
export type Sweetness = 'dry' | 'off-dry' | 'medium' | 'sweet';

/** Миграция легаси-сладости (v4.2 → v4.3): два «полусладких» шага слиты в один. */
export const SWEETNESS_LEGACY_ALIAS: Record<string, Sweetness> = {
  'medium-dry': 'medium',
  'medium-sweet': 'medium',
};

/** Форма волны кислотности (авторская фича Pro-режима). */
export type AcidityShape =
  | 'linear'
  | 'early-peak'
  | 'mid-peak'
  | 'flat'
  | 'late-peak'
  | 'soft-wave';

/** Зернистость / текстура танинов (Pro-режим, матрица). */
export type TanninTexture =
  | 'silky'
  | 'chalky'
  | 'velvety'
  | 'grainy'
  | 'rustic'
  | 'grippy';

/** Уровень алкоголя по калибру ABV. */
export type SatAlcohol = 'low' | 'medium' | 'high';

/**
 * Субъективное восприятие алкоголя во «Рту» (v14): не «какой он по калибру»
 * (это фиксирует ABV в «Титуле» и канон-чипы), а как он ощущается в бокале —
 * спрятан в плоде или выпирает горячей волной.
 */
export type AlcoholFeel = 'hidden' | 'woven' | 'harmonious' | 'protruding' | 'burning';

/** Ножки / вязкость (только Pro-режим; в WSET запрещены). */
export type LegsProfile = 'watery' | 'thin' | 'medium' | 'thick';

/** Характер перляжа игристого. */
export type PerlageIntensity = 'delicate' | 'medium' | 'vigorous';

/** Доминирующий акцент финиша (источник для оси «Минеральность»). */
export type FinishAccent = 'acid' | 'tannin' | 'fruit' | 'oak' | 'mineral';

/* ── Баланс (BLIC: B) ──────────────────────────────────────────────────────── */

/** Явный вердикт по балансу — единственный источник истины для отчётов. */
export type BalanceVerdict = 'balanced' | 'unbalanced';

/** Причины дисбаланса. */
export type BalanceIssue =
  | 'acid-dominant'
  | 'tannin-dominant'
  | 'sugar-unanchored'
  | 'bitter'
  | 'hot-alcohol'
  | 'watery'
  | 'thin-extract'
  | 'other';

/* ── BLIC и заключение ─────────────────────────────────────────────────────── */

/** Компоненты модели BLIC. */
export type BlicKey = 'balance' | 'length' | 'intensity' | 'complexity';

/** Оценка компонента BLIC. */
export type BlicRating = 'strong' | 'adequate' | 'weak';

/** Вердикт качества WSET L3 — строго без численных очков. */
export type QualityLevel =
  | 'faulty'
  | 'poor'
  | 'acceptable'
  | 'good'
  | 'very-good'
  | 'outstanding';

/** Готовность вина к употреблению. */
export type Readiness =
  | 'too-young'
  | 'drink-not-peak'
  | 'drink-now'
  | 'drink-or-age'
  | 'declining';

/* ── Колесо ароматов ───────────────────────────────────────────────────────── */

/** Семейства ароматов (категории колеса). Семейство `mineral` — источник одноимённой оси профиля. */
export type AromaFamily =
  | 'fruit'
  | 'floral'
  | 'herbal'
  | 'spice'
  | 'oak'
  | 'ferment'
  | 'mineral'
  | 'tertiary';

/** Идентификатор дескриптора — стабильный slug (см. AROMA_WHEEL). */
export type DescriptorId = string;

/** Интенсивность отмеченного дескриптора: 1 — лёгкая, 2 — средняя, 3 — выраженная. */
export type DescriptorLevel = 1 | 2 | 3;

/** Карта выбранных дескрипторов: id → уровень выраженности. */
export type AromaSelection = Record<DescriptorId, DescriptorLevel>;

/** Один дескриптор колеса. */
export interface Descriptor {
  id: DescriptorId;
  /** Русская подпись. */
  label: string;
  /** Английская подпись (SAT). */
  en: string;
  /** Входит в семейство минеральных маркеров (кормит ось MIN). */
  mineral?: boolean;
}

/** Семейство дескрипторов колеса. */
export interface AromaFamilyGroup {
  family: AromaFamily;
  label: string;
  /** Базовый оттенок сектора (SVG-заливка). */
  hue: string;
  /** Субгруппы внутри семейства. */
  groups: { label: string; items: Descriptor[] }[];
}

/* ── Печатные/прочие константы ─────────────────────────────────────────────── */

/** Категории фотографии дегустации. */
export type PhotoRole = 'label' | 'label-back' | 'cork' | 'glass' | 'moodboard' | 'other';
