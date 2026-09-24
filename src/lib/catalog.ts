/**
 * Единый каталог подписей, шкал и дескрипторов (русский UI).
 * Используется UI, движками и экспортами — единственный источник подписей.
 */
import { tr, getTrLang } from './tr';
import type {
  AromaFamilyGroup,
  BalanceIssue,
  BlicKey,
  BlicRating,
  Clarity,
  ColorPair,
  Condition,
  Development,
  FaultSeverity,
  FaultType,
  FinishAccent,
  AlcoholFeel,
  LegsProfile,
  PerlageIntensity,
  QualityLevel,
  Readiness,
  SatAcidity,
  SatAlcohol,
  SatBody,
  SatFinish,
  SatIntensity,
  Sweetness,
  TanninTexture,
  VisualIntensity,
  WineColor,
  WineStyle,
  AcidityShape,
} from '@/types/wset';
import type { PhotoRole } from '@/types/wset';
import type { EyeData, NoseData, PalateData, WineIdentity } from '@/types/tasting';

/* ── Опции шкал ──────────────────────────────────────────────────────────────
 * ТЗ v4 §1: лаконичные рейки без «визуального мусора» внутри кнопок —
 * равномерные пятишаговые градации; физиологические ориентиры живут
 * в CUES-реестрах ниже и выводятся одной строкой под активной рейкой. */

export const INTENSITY_OPTS: { value: SatIntensity; label: string }[] = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium-', label: 'Средняя−' },
  { value: 'medium', label: 'Средняя' },
  { value: 'medium+', label: 'Средняя+' },
  { value: 'pronounced', label: 'Высокая' },
];

export const ACIDITY_OPTS: { value: SatAcidity; label: string }[] = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium-', label: 'Средняя−' },
  { value: 'medium', label: 'Средняя' },
  { value: 'medium+', label: 'Средняя+' },
  { value: 'high', label: 'Высокая' },
];

export const BODY_OPTS: { value: SatBody; label: string }[] = [
  { value: 'light', label: 'Лёгкое' },
  { value: 'medium-', label: 'Среднее−' },
  { value: 'medium', label: 'Среднее' },
  { value: 'medium+', label: 'Среднее+' },
  { value: 'full', label: 'Полное' },
];

export const FINISH_OPTS: { value: SatFinish; label: string; seconds: number }[] = [
  { value: 'short', label: 'Короткое', seconds: 3 },
  { value: 'medium-', label: 'Среднее−', seconds: 6 },
  { value: 'medium', label: 'Среднее', seconds: 10 },
  { value: 'medium+', label: 'Среднее+', seconds: 15 },
  { value: 'long', label: 'Долгое', seconds: 22 },
];

/** Сладость: 4 канонических шага с границами сахара в г/л (ТЗ v4 §2).
 *  Секретный ингредиент — сама граница: она живёт в SWEETNESS_CUES. */
export const SWEETNESS_OPTS: { value: Sweetness; label: string }[] = [
  { value: 'dry', label: 'Сухое' },
  { value: 'off-dry', label: 'Полусухое' },
  { value: 'medium', label: 'Полусладкое' },
  { value: 'sweet', label: 'Сладкое' },
];

export const ALCOHOL_OPTS: { value: SatAlcohol; label: string; hint: string }[] = [
  { value: 'low', label: 'Низкий', hint: '< 10,5%' },
  { value: 'medium', label: 'Средний', hint: '11–13,9%' },
  { value: 'high', label: 'Высокий', hint: '14%+' },
];

/* ── CUES: физиологические ориентиры (ТЗ v4 §2) ───────────────────────────────
 * Строгие однострочные маркеры: видны ТОЛЬКО при активном выборе,
 * выводятся рейкой CleanSensoryRail одной аккуратной строкой. */

export const ACIDITY_CUES: Partial<Record<SatAcidity, string>> = {
  low: 'Плоская, ленивая сочность (как тёплая вода)',
  'medium-': 'Сдержанная сочность (спелый персик / дыня)',
  medium: 'Освежающий баланс (зелёное яблоко)',
  'medium+': 'Яркий нерв, покалывание боковых зон языка (грейпфрут)',
  high: 'Пронзительная атака, челюсти сводит слюной (долька лимона)',
};

export const TANNIN_CUES: Partial<Record<SatAcidity, string>> = {
  low: 'Десны гладкие, вяжущий эффект почти отсутствует',
  'medium-': 'Тончайшее напыление, быстро смывается слюной (Пино Нуар)',
  medium: 'Умеренная вязкость, язык ощущает бархат (Мерло)',
  'medium+': 'Плотный захват, сухость на деснах держится 5–8 секунд (Каберне)',
  high: 'Губы прилипают к зубам, полная полифенольная стяжка (Неббиоло)',
};

export const BODY_CUES: Partial<Record<SatBody, string>> = {
  light: 'Лёгкая, летящая текстура (вода / обезжиренное молоко)',
  'medium-': 'Подвижная ягодная сочность без вязкости',
  medium: 'Классический объем и вес на нёбе (молоко 3,2%)',
  'medium+': 'Густой экстракт, медленно перекатывается во рту',
  full: 'Сливочная, обволакивающая плотность (сливки 20%)',
};

export const ALCOHOL_CUES: Partial<Record<SatAlcohol, string>> = {
  low: '< 11% · Невесомый, прохладный глоток без спиртового тепла',
  medium: '11–13,9% · Мягкое гармоничное тепло в груди без жжения',
  high: '14%+ · Горячая волна в горле и пищеводе, плотный спиртовой вес',
};

/* ── Тепло и интеграция алкоголя (v14): субъективное восприятие спирта ──────
 * Уровень по калибру — это ALCOHOL_OPTS (канон WSET); здесь — как спирт
 * ведёт себя в бокале: спрятан в плоде или вылезает горячей волной.
 * Порядок значений = градиент от шалфейного к гранатовому. */
export const ALCOHOL_FEEL_OPTS: { value: AlcoholFeel; label: string; phrase: string; hue: string }[] = [
  {
    value: 'hidden',
    label: 'Спрятан',
    phrase: 'Спирта не слышно: плотность и фрукт держат его в узде.',
    hue: '#759a72',
  },
  {
    value: 'woven',
    label: 'Вплетён',
    phrase: 'Тёплый фон поддерживает тело и не выходит на первый план.',
    hue: '#8fa06b',
  },
  {
    value: 'harmonious',
    label: 'Согревает',
    phrase: 'Тепло ощущается, но уравновешено фруктом и кислотой.',
    hue: '#c59b4e',
  },
  {
    value: 'protruding',
    label: 'Выпирает',
    phrase: 'Спиртовая волна вылезает над фруктом и тянется в финиш.',
    hue: '#c27b47',
  },
  {
    value: 'burning',
    label: 'Жгучий',
    phrase: 'Жжёт нёбо и горло: горячий хвост глушит вкус.',
    hue: '#9a4a44',
  },
];

/** Чипы-ощущения спирта (мультиселект). Ключи синхронны с белым списком migrate.ts. */
export const ALCOHOL_PERCEPTION_OPTS: { value: string; label: string }[] = [
  { value: 'warm-chest', label: 'Согревает в груди' },
  { value: 'burn-finish', label: 'Жжёт в финале' },
  { value: 'hot-nostrils', label: 'Жгучие ноздри (ретро-нос)' },
  { value: 'lifts-fruit', label: 'Подогревает фрукт' },
  { value: 'masks-acid', label: 'Маскирует кислоту' },
  { value: 'drying', label: 'Сушит вкус' },
];

export const FINISH_CUES: Partial<Record<SatFinish, string>> = {
  short: '< 4 сек · Вкус гаснет практически сразу после глотка',
  'medium-': '4–6 сек · Быстрое угасание основных нот',
  medium: '7–10 сек · Уверенное классическое послевкусие',
  'medium+': '11–15 сек · Долгий сочный шлейф',
  long: '16+ сек · Монументальный финал, звучащий дольше полуминуты',
};

export const SWEETNESS_CUES: Partial<Record<Sweetness, string>> = {
  dry: '< 4 г/л · Сахар не ощущается рецепторами вовсе, полная сухость',
  'off-dry': '4–12 г/л · Едва уловимая фруктовая округлость на кончике языка',
  medium: '12–45 г/л · Выраженный десертный тон, сочность доминирует',
  sweet: '45+ г/л · Густая медовая ликёрность (Сотерн, Токай, Айсвайн)',
};

export const FINISH_ACCENT_CUES: Partial<Record<FinishAccent, string>> = {
  acid: 'Финал сочный, слюнотечение — кислотный хвост',
  tannin: 'Сухой структурный финал: десны помнят каркас',
  fruit: 'Спелая фруктовая волна уходит последней',
  oak: 'Пряный тостовый след: ваниль, гвоздика',
  mineral: 'Солоноватый / кремниевый холодок на языке',
};

export const INTENSITY_CUES: Partial<Record<SatIntensity, string>> = {
  low: 'Едва уловимо — вино «заперто» или устало',
  'medium-': 'Слабый, но ясный сигнал',
  medium: 'Отчётливо при нормальном подносе к носу',
  'medium+': 'Чувствуется на расстоянии ладони',
  pronounced: 'Господствует в бокале, слышно без усилий',
};

export const CONDITION_CUES: Partial<Record<Condition, string>> = {
  clean: 'Без пороков: пробка, оксидация и летучесть не определяются',
  unclean: 'Обнаружен дефект — отметьте его тип и выраженность ниже',
};

export const DEVELOPMENT_CUES: Partial<Record<Development, string>> = {
  youthful: 'Первичный регистр: фрукты и цветы, возраст не читается',
  developing: 'Ноты выдержки появляются поверх свежего фрукта',
  'fully-developed': 'Третичные ноты доминируют — пик формы',
  tired: 'Фрукт угас: оксидативная усталость',
};

export const CLARITY_CUES: Partial<Record<Clarity, string>> = {
  clear: 'Хрустальная чистота: без взвеси, мути и плёнки',
  hazy: 'Взвесь или муть: осадок, белковая дымка — проверить состояние',
};

export const VISUAL_INTENSITY_CUES: Partial<Record<VisualIntensity, string>> = {
  pale: 'Свет проходит свободно: бледное ядро, водянистая кайма',
  medium: 'Умеренная плотность цвета — средняя насыщенность',
  deep: 'Ядро почти непрозрачно, свет не проходит (тёмные сорта)',
};

export const PERLAGE_CUES: Partial<Record<PerlageIntensity, string>> = {
  delicate: 'Едва заметная игра пузырьков у стенок бокала',
  medium: 'Устойчивый поток средней силы',
  vigorous: 'Энергичный, мускулистый поток с цепочками',
};

export const CLARITY_OPTS: { value: Clarity; label: string }[] = [
  { value: 'clear', label: 'Прозрачное' },
  { value: 'hazy', label: 'Мутноватое' },
];

export const VISUAL_INTENSITY_OPTS: { value: VisualIntensity; label: string }[] = [
  { value: 'pale', label: 'Светлое' },
  { value: 'medium', label: 'Среднее' },
  { value: 'deep', label: 'Глубокое' },
];

export const CONDITION_OPTS: { value: Condition; label: string }[] = [
  { value: 'clean', label: 'Чистое' },
  { value: 'unclean', label: 'С дефектом' },
];

export const DEVELOPMENT_OPTS: { value: Development; label: string }[] = [
  { value: 'youthful', label: 'Молодое' },
  { value: 'developing', label: 'Развивается' },
  { value: 'fully-developed', label: 'Раскрылось' },
  { value: 'tired', label: 'Увядшее' },
];

export const LEGS_OPTS: { value: LegsProfile; label: string }[] = [
  { value: 'watery', label: 'Водянистые' },
  { value: 'thin', label: 'Тонкие' },
  { value: 'medium', label: 'Средние' },
  { value: 'thick', label: 'Плотные' },
];

export const PERLAGE_OPTS: { value: PerlageIntensity; label: string }[] = [
  { value: 'delicate', label: 'Деликатный' },
  { value: 'medium', label: 'Средний' },
  { value: 'vigorous', label: 'Энергичный' },
];

export const TANNIN_TEXTURE_OPTS: { value: TanninTexture; label: string }[] = [
  { value: 'silky', label: 'Шелковистые' },
  { value: 'chalky', label: 'Меловые' },
  { value: 'velvety', label: 'Бархатистые' },
  { value: 'grainy', label: 'Зернистые' },
  { value: 'grippy', label: 'Хваткие' },
  { value: 'rustic', label: 'Грубые' },
];

export const ACIDITY_SHAPE_OPTS: { value: AcidityShape; label: string; hint: string }[] = [
  {
    value: 'linear',
    label: 'Прямая',
    hint: 'Линейная ось от атаки до финиша: кислотность держит одну ноту и не делает резких движений — честное, прямолинейное вино.',
  },
  {
    value: 'early-peak',
    label: 'Ранний пик',
    hint: 'Всплеск на кончике языка: яркая атака сразу на входе и мягкий спад — молодой рислинг, лёгкие белые, часть розе.',
  },
  {
    value: 'mid-peak',
    label: 'Середина',
    hint: 'Округлая сочность в теле: пик в середине нёба, мягкий вход и выход — классическая арка, типичный шардоне-профиль.',
  },
  {
    value: 'late-peak',
    label: 'Поздний пик',
    hint: 'Нарастание к глотку: кислота раскручивается к финишу и вызывает слюноотделение — неббиоло, вертикальные соляные вина с длинной спиной.',
  },
  {
    value: 'soft-wave',
    label: 'Мягкая волна',
    hint: 'Купольная гладкая кислота без острых пиков: округлый купол, сливочная текстура, МЛО-тоны, кремовые белые.',
  },
  {
    value: 'flat',
    label: 'Плоская',
    hint: 'Уставшая, проваленная кислота: низкая амплитуда, вино лежит на нёбе плоскостью и не освежает.',
  },
];

export const FINISH_ACCENT_OPTS: { value: FinishAccent; label: string }[] = [
  { value: 'acid', label: 'Кислотный (сочный)' },
  { value: 'tannin', label: 'Танинный (структурный)' },
  { value: 'fruit', label: 'Спелый фруктовый' },
  { value: 'oak', label: 'Пряный / дубовый' },
  { value: 'mineral', label: 'Минеральный / солоноватый' },
];

export const BALANCE_ISSUE_OPTS: { value: BalanceIssue; label: string }[] = [
  { value: 'acid-dominant', label: 'Кислота давит' },
  { value: 'tannin-dominant', label: 'Танины давят' },
  { value: 'sugar-unanchored', label: 'Сахар без фруктового якоря' },
  { value: 'bitter', label: 'Горечь' },
  { value: 'hot-alcohol', label: 'Горячий алкоголь' },
  { value: 'watery', label: 'Водянистость' },
  { value: 'thin-extract', label: 'Пустой экстракт' },
  { value: 'other', label: 'Другое' },
];

export const QUALITY_OPTS: { value: QualityLevel; label: string }[] = [
  { value: 'faulty', label: 'Дефектное' },
  { value: 'poor', label: 'Слабое' },
  { value: 'acceptable', label: 'Приемлемое' },
  { value: 'good', label: 'Хорошее' },
  { value: 'very-good', label: 'Очень хорошее' },
  { value: 'outstanding', label: 'Выдающееся' },
];

export const READINESS_OPTS: { value: Readiness; label: string }[] = [
  { value: 'too-young', label: 'Слишком молодое' },
  { value: 'drink-not-peak', label: 'Пить можно, но не пик' },
  { value: 'drink-now', label: 'Пить сейчас' },
  { value: 'drink-or-age', label: 'Сейчас или в погреб' },
  { value: 'declining', label: 'На спаде' },
];

export const BLIC_KEYS: { key: BlicKey; label: string; tooltip: string }[] = [
  {
    key: 'balance',
    label: 'Баланс',
    tooltip:
      'BLIC · Balance. Гармония сладости ↔ фруктов ↔ кислотности ↔ танинов. Сладость с ярким фруктовым ядром не штрафуется; сахар без якоря — дисбаланс.',
  },
  {
    key: 'length',
    label: 'Длина',
    tooltip:
      'BLIC · Length (каудалии). 8+ секунд послевкусия — признак класса. Оценивается качество и стойкость финального аккорда.',
  },
  {
    key: 'intensity',
    label: 'Интенсивность',
    tooltip:
      'BLIC · Intensity. Сила аромата и вкуса. «Слабая интенсивность» при 9+ отмеченных дескрипторах — логическая дыра.',
  },
  {
    key: 'complexity',
    label: 'Сложность',
    tooltip:
      'BLIC · Complexity. Число семей: праймари → секондари → терциари. Считается автоматически по семействам колеса ароматов.',
  },
];

export const BLIC_RATING_OPTS: { value: BlicRating; label: string }[] = [
  { value: 'strong', label: 'Сильно' },
  { value: 'adequate', label: 'Достаточно' },
  { value: 'weak', label: 'Слабо' },
];

export const FAULT_TYPE_OPTS: { value: FaultType; label: string; hint: string; en: string }[] = [
  { value: 'tca', label: 'TCA (пробка, сырой картон)', hint: 'мокрый картон, плесень', en: 'cork taint (TCA)' },
  { value: 'reduction', label: 'Сероводород / Редукция', hint: 'тухлые яйца, стоки, тихая сера', en: 'reduction (H2S)' },
  { value: 'oxidation', label: 'Окисление', hint: 'битое яблоко, уксусный альдегид', en: 'oxidation' },
  { value: 'va', label: 'Летучая кислотность (VA)', hint: 'лак, ацетон, уксус', en: 'volatile acidity' },
  { value: 'brett', label: 'Бретт', hint: 'конюшня, пластырь, навоз', en: 'brettanomyces' },
  { value: 'so2', label: 'Избыток серы (SO₂)', hint: 'жжёные спички, серная дымка', en: 'excessive SO2' },
  { value: 'rubber', label: 'Жжёная резина', hint: 'автопокрышки, жжёная резина', en: 'burnt rubber' },
];

export const FAULT_SEVERITY_OPTS: { value: FaultSeverity; label: string }[] = [
  { value: 'light', label: 'Легко' },
  { value: 'distinct', label: 'Отчётливо' },
  { value: 'heavy', label: 'Сильно' },
];

/** Фатальные пороки: винификация/хранение убили вино — вердикт качества
 *  принудительно «Faulty», потенциал выдержки заблокирован.
 *  Сероводород живёт в типе «Редукция», уксус/лак — в «Летучести (VA)».
 *  (ТЗ Engine §2.Е: TCA, сероводород, уксус — любого уровня блокируют.) */
export const FAULT_FATAL_TYPES: readonly FaultType[] = ['tca', 'reduction', 'va'];

/** Стилистические дефекты: на 1 • — возможная терруарная стилистика
 *  (нейтральное предупреждение), на 2–3 •• — режим дефекта.
 *  Жжёная резина — редкий стилистический тон (напр. некоторые SA-сотерны),
 *  но при 2–3 •• честно переводит вино в дефект. */
export const FAULT_STYLISTIC_TYPES: readonly FaultType[] = ['brett', 'so2', 'oxidation', 'rubber'];

/** Поведение дефекта: фатальный или стилистический. */
export function faultBehavior(type: FaultType): 'fatal' | 'stylistic' {
  return FAULT_FATAL_TYPES.includes(type) ? 'fatal' : 'stylistic';
}

export const WINE_STYLE_OPTS: { value: WineStyle; label: string; hint: string }[] = [
  { value: 'white', label: 'Белое', hint: 'белый виноград или мякоть с минимумом кожи' },
  { value: 'rose', label: 'Розе', hint: 'короткий контакт с красным виноградом' },
  { value: 'red', label: 'Красное', hint: 'ферментация на кожице красного винограда' },
  { value: 'orange', label: 'Оранжевое', hint: 'белый виноград по красной технологии — долгий контакт с кожицей' },
];

/** Русские подписи ролей фотографий (для UI и экспортов). */
export const PHOTO_ROLE_LABELS: Record<PhotoRole, string> = {
  label: 'Лицевая этикетка (Аверс)',
  'label-back': 'Контрэтикетка (Реверс)',
  glass: 'Бокал',
  cork: 'Пробка / Капсула',
  moodboard: 'Ассоциативное фото / Moodboard',
  other: 'Фото',
};

/* ── Цветовые категории WSET и HEX-пары диска ─────────────────────────────── */

export const WINE_COLOR_META: Record<WineColor, { label: string; hex: ColorPair }> = {
  'lemon-green': { label: 'Лимонно-зелёное', hex: { core: '#e6eec0', rim: '#f0f5d9' } },
  lemon: { label: 'Лимонное', hex: { core: '#f0e3a4', rim: '#f6ecc6' } },
  gold: { label: 'Золотое', hex: { core: '#e2c06f', rim: '#ecd69a' } },
  amber: { label: 'Янтарное', hex: { core: '#c98c3c', rim: '#d9a95c' } },
  brown: { label: 'Коричневое', hex: { core: '#8f6231', rim: '#a87f45' } },
  pink: { label: 'Розовое', hex: { core: '#f0b4c4', rim: '#f6cdd8' } },
  salmon: { label: 'Лососевое', hex: { core: '#efa07c', rim: '#f4bb9e' } },
  'orange-rose': { label: 'Апельсиновое', hex: { core: '#dd8a57', rim: '#e8a377' } },
  purple: { label: 'Пурпурное', hex: { core: '#691e3c', rim: '#8a3050' } },
  ruby: { label: 'Рубиновое', hex: { core: '#8e1c32', rim: '#a83248' } },
  garnet: { label: 'Гранатовое', hex: { core: '#6d1425', rim: '#8a2a38' } },
  tawny: { label: 'Рыжеватое (Tawny)', hex: { core: '#9a4e2d', rim: '#b06a42' } },
};

/** Цветовые категории, доступные по цвету-основе (WSET SAT 2021).
 *  Игристость и крепление не сужают палитру: игристым бывает любой цвет. */
export const COLORS_BY_STYLE: Record<WineStyle, WineColor[]> = {
  white: ['lemon-green', 'lemon', 'gold', 'amber', 'brown'],
  rose: ['pink', 'salmon', 'orange-rose'],
  red: ['purple', 'ruby', 'garnet', 'tawny'],
  orange: ['lemon', 'gold', 'amber', 'orange-rose'],
};

/** Человеческое описание типа для экспортов: «белое игристое», «красное креплёное».
 *  EN: канонический порядок «sparkling white» (прилагательные передсуществительным). */
export function styleFullLabel(id: Pick<WineIdentity, 'style' | 'sparkling' | 'fortified'>): string | null {
  const en = getTrLang() === 'en';
  const raw = id.style ? WINE_STYLE_OPTS.find((o) => o.value === id.style)?.label : null;
  const base = raw ? tr(en ? 'en' : 'ru', raw) : null;
  if (!base && !id.sparkling && !id.fortified) return null;
  const marks = [id.sparkling ? tr(en ? 'en' : 'ru', 'игристое') : null, id.fortified ? tr(en ? 'en' : 'ru', 'креплёное') : null].filter(Boolean) as string[];
  if (en) return [...marks, base].filter(Boolean).join(' ') || marks.join(' ');
  const marksRu = [id.sparkling ? 'игристое' : null, id.fortified ? 'креплёное' : null].filter(Boolean) as string[];
  return [base, ...marksRu].filter(Boolean).join(' ') || marksRu.join(' ');
}

/* ── Палитры цвета по стилю вина (чипы раздела «Глаз») ────────────────────── */

/** Одна опция цвета: аккуратная кнопка-чип с точкой-индикатором. */
export interface WineColorOption {
  id: string;
  label: string;
  hex: string;
  /** Энологическая подсказка (title чипа + активная подпись). */
  hint: string;
  /** Категория WSET, синхронизируемая со шкалой «Цвет (категория WSET)». */
  color?: WineColor;
}

/** Ядро и кайма зависят от цвет-основы: сомелье не увидит лимонно-зелёные
 *  квадраты, дегустируя красное. HEX ядер совпадают с WINE_COLOR_META —
 *  шкала категорий и чипы всегда синхронны. */
export const WINE_COLOR_PALETTES: Record<WineStyle, { core: WineColorOption[]; rim: WineColorOption[] }> = {
  red: {
    core: [
      { id: 'purple', label: 'Пурпурное', hex: '#691e3c', hint: 'Молодое, насыщенное антоцианами', color: 'purple' },
      { id: 'ruby', label: 'Рубиновое', hex: '#8e1c32', hint: 'Классический здоровый цвет', color: 'ruby' },
      { id: 'garnet', label: 'Гранатовое', hex: '#6d1425', hint: 'Начало развития', color: 'garnet' },
      { id: 'tawny', label: 'Кирпичное (Tawny)', hex: '#9a4e2d', hint: 'Выдержанное, оксидативное', color: 'tawny' },
      { id: 'brown-red', label: 'Коричневое', hex: '#5c2b1e', hint: 'Старое вино на спаде', color: 'brown' },
    ],
    rim: [
      { id: 'rim-purple', label: 'Пурпурно-розовая', hex: '#8a3050', hint: 'Яркий маркер молодости' },
      { id: 'rim-ruby', label: 'Рубиновая', hex: '#a83248', hint: 'Сохраняет свежесть, без эволюции' },
      { id: 'rim-garnet', label: 'Гранатовая', hex: '#8a2a38', hint: 'Начало развития у края' },
      { id: 'rim-tawny', label: 'Кирпичная / Рыжая', hex: '#b06a42', hint: 'Возрастной ободок, третичные тона' },
      { id: 'rim-watery', label: 'Водянистая', hex: '#d9aab3', hint: 'Широкая бесцветная кромка: возраст или высокий алкоголь' },
    ],
  },
  white: {
    core: [
      { id: 'lemon-green', label: 'Лимонно-зелёное', hex: '#e6eec0', hint: 'Очень молодое, прохладный климат', color: 'lemon-green' },
      { id: 'lemon', label: 'Лимонное', hex: '#f0e3a4', hint: 'Стандарт молодого белого', color: 'lemon' },
      { id: 'gold', label: 'Золотистое', hex: '#e2c06f', hint: 'Выдержка в дубе или спелость', color: 'gold' },
      { id: 'amber', label: 'Янтарное', hex: '#c98c3c', hint: 'Окисление или поздний сбор', color: 'amber' },
      { id: 'brown', label: 'Коричневое', hex: '#8f6231', hint: 'Увядшее / оксидативное', color: 'brown' },
    ],
    rim: [
      { id: 'rim-green', label: 'Зеленоватая', hex: '#f0f5d9', hint: 'Хрустящая свежесть' },
      { id: 'rim-steel', label: 'Стальная / Водянистая', hex: '#f4f6e8', hint: 'Бледный прозрачный край' },
      { id: 'rim-lemon', label: 'Лимонная', hex: '#f6ecc6', hint: 'Однородный молодой тон' },
      { id: 'rim-gold', label: 'Золотистая', hex: '#ecd69a', hint: 'Тёплая кайма: дуб или возраст' },
    ],
  },
  rose: {
    core: [
      { id: 'pink', label: 'Нежно-розовое', hex: '#f0b4c4', hint: 'Прямой отжим, стиль Прованса', color: 'pink' },
      { id: 'salmon', label: 'Лососевое', hex: '#efa07c', hint: 'Классический тёплый розовый', color: 'salmon' },
      { id: 'orange-rose', label: 'Медно-розовое', hex: '#dd8a57', hint: 'Мацерация или выдержка', color: 'orange-rose' },
    ],
    rim: [
      { id: 'rim-watery-rose', label: 'Водянистая', hex: '#fae3e8', hint: 'Прозрачный диск' },
      { id: 'rim-pink-light', label: 'Светло-розовая', hex: '#f6cdd8', hint: 'Свежий молодой край' },
      { id: 'rim-salmon', label: 'Лососевая', hex: '#f4bb9e', hint: 'Тёплый однородный край' },
      { id: 'rim-onion', label: 'Луковая шелуха', hex: '#e8aa92', hint: 'Признак оксидации' },
    ],
  },
  orange: {
    core: [
      { id: 'orange-gold', label: 'Золотистое', hex: '#e2c06f', hint: 'Короткий скин-контакт', color: 'gold' },
      { id: 'orange-amber', label: 'Янтарное', hex: '#c98c3c', hint: 'Выраженный скин-контакт', color: 'amber' },
      { id: 'orange-amber-deep', label: 'Апельсиновое', hex: '#dd8a57', hint: 'Квеври / амфора', color: 'orange-rose' },
      { id: 'copper-rust', label: 'Ржаво-медное', hex: '#a65223', hint: 'Длительный скин-контакт', color: 'amber' },
    ],
    rim: [
      { id: 'rim-gold-orange', label: 'Золотистая', hex: '#ecd69a', hint: 'Яркий тёплый край' },
      { id: 'rim-amber-light', label: 'Светло-янтарная', hex: '#d9a95c', hint: 'Мягкий переход тона' },
      { id: 'rim-copper', label: 'Медная', hex: '#e8a377', hint: 'Заметная оксидативность' },
      { id: 'rim-tea', label: 'Чайная / Сухая', hex: '#b8764b', hint: 'Оксидативная кайма' },
    ],
  },
};

/** Полные списки — когда цвет-основа ещё не выбран в Паспорте. */
export const CORE_OPTIONS_ANY: WineColorOption[] = [
  ...WINE_COLOR_PALETTES.white.core,
  ...WINE_COLOR_PALETTES.rose.core,
  ...WINE_COLOR_PALETTES.red.core,
  ...WINE_COLOR_PALETTES.orange.core,
];

export const RIM_OPTIONS_ANY: WineColorOption[] = [
  ...WINE_COLOR_PALETTES.white.rim,
  ...WINE_COLOR_PALETTES.rose.rim,
  ...WINE_COLOR_PALETTES.red.rim,
  ...WINE_COLOR_PALETTES.orange.rim,
];

/** Человекочитаемая подпись цвета по HEX (для отчётов): сначала палитра
 *  стиля, затем вся библиотека. Возвращает опцию целиком (лейбл + hint). */
export function colorOptionByHex(hex: string | null, style?: WineStyle | null): WineColorOption | null {
  if (!hex) return null;
  const match = (list: WineColorOption[]): WineColorOption | null =>
    list.find((o) => o.hex.toLowerCase() === hex.toLowerCase()) ?? null;
  if (style) {
    const p = WINE_COLOR_PALETTES[style];
    const inStyle = match([...p.core, ...p.rim]);
    if (inStyle) return inStyle;
  }
  return match([...CORE_OPTIONS_ANY, ...RIM_OPTIONS_ANY]);
}

/* ── Пресеты стилей ───────────────────────────────────────────────────────── */

/** Базовый пресет: типовая карточка известного стиля — заполняет форму,
 *  пользователь дальше правит под своё вино. */
export interface WinePreset {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  identity: Partial<WineIdentity>;
  eye: Partial<EyeData>;
  nose: Partial<NoseData>;
  palate: Partial<PalateData>;
}

const pairOf = (color: WineColor): { coreHex: string; rimHex: string } => ({
  coreHex: WINE_COLOR_META[color].hex.core,
  rimHex: WINE_COLOR_META[color].hex.rim,
});

export const WINE_PRESETS: WinePreset[] = [
  {
    id: 'brut',
    emoji: '🥂',
    title: 'Брют Шампань',
    desc: 'Три года на осадке: бриошь, зелёное яблоко, высокая кислотность, мелкий перляж.',
    identity: { style: 'white', sparkling: true, abv: 12.5, region: 'Шампань', country: 'Франция', grapes: 'Пино Нуар, Шардоне, Менье' },
    eye: { clarity: 'clear', intensity: 'pale', color: 'lemon-green', ...pairOf('lemon-green'), perlage: { intensity: 'vigorous', bubbleSize: 'fine', mousse: 'creamy' } },
    nose: { condition: 'clean', intensity: 'medium+', development: 'developing', aromas: { 'green-apple': 2, lime: 2, brioche: 3, yeast: 2, acacia: 1, toast: 1 } },
    palate: { sweetness: 'dry', acidity: 'high', tanninLevel: 'low', alcohol: 'medium', body: 'medium', flavourIntensity: 'medium+', finish: 'medium+', finishAccent: 'acid' },
  },
  {
    id: 'sauv-blanc',
    emoji: '🍋',
    title: 'Молодой Совиньон Блан',
    desc: 'Ароматная машинальность: скошенная трава, грейпфрут, бузина, пронзительная кислота.',
    identity: { style: 'white', abv: 12.5, region: 'Мальборо', country: 'Новая Зеландия', grapes: 'Совиньон Блан' },
    eye: { clarity: 'clear', intensity: 'pale', color: 'lemon-green', ...pairOf('lemon-green') },
    nose: { condition: 'clean', intensity: 'pronounced', development: 'youthful', aromas: { grapefruit: 3, lime: 2, 'cut-grass': 3, elderflower: 2, mint: 1 } },
    palate: { sweetness: 'dry', acidity: 'high', tanninLevel: 'low', alcohol: 'medium', body: 'light', flavourIntensity: 'pronounced', finish: 'medium', finishAccent: 'acid' },
  },
  {
    id: 'oaked-chard',
    emoji: '🍑',
    title: 'Дубовое Шардоне',
    desc: 'Бочка + МЛО: ваниль, сливки, персик, округлый купол кислотности и полнотелое тело.',
    identity: { style: 'white', abv: 13.5, region: 'Кот-де-Бон', country: 'Франция', grapes: 'Шардоне' },
    eye: { clarity: 'clear', intensity: 'medium', color: 'gold', ...pairOf('gold') },
    nose: { condition: 'clean', intensity: 'medium+', development: 'developing', aromas: { vanilla: 3, butter: 2, peach: 2, 'green-apple': 1, toast: 2, cream: 1 } },
    palate: { sweetness: 'dry', acidity: 'medium+', tanninLevel: 'low', alcohol: 'medium', body: 'medium+', flavourIntensity: 'medium+', finish: 'medium+', finishAccent: 'oak' },
  },
  {
    id: 'rose-provence',
    emoji: '🌊',
    title: 'Розе Прованса',
    desc: 'Бледный лосось, клубника и цитрус, деликатная горчинка в финале.',
    identity: { style: 'rose', abv: 12.5, region: 'Прованс', country: 'Франция', grapes: 'Гренаш, Сенсо' },
    eye: { clarity: 'clear', intensity: 'pale', color: 'salmon', ...pairOf('salmon') },
    nose: { condition: 'clean', intensity: 'medium', development: 'youthful', aromas: { strawberry: 2, redcurrant: 1, grapefruit: 2, acacia: 1 } },
    palate: { sweetness: 'dry', acidity: 'medium+', tanninLevel: 'low', alcohol: 'medium', body: 'light', flavourIntensity: 'medium', finish: 'medium-', finishAccent: 'acid' },
  },
  {
    id: 'beaujolais',
    emoji: '🍒',
    title: 'Молодое красное (Божоле)',
    desc: 'Карбоническая мацерация: вишня, банан, фиалка, низкие танины, лёгкое тело.',
    identity: { style: 'red', abv: 13, region: 'Божоле', country: 'Франция', grapes: 'Гамэ' },
    eye: { clarity: 'clear', intensity: 'medium', color: 'purple', ...pairOf('purple') },
    nose: { condition: 'clean', intensity: 'medium+', development: 'youthful', aromas: { 'red-cherry': 3, strawberry: 2, banana: 1, violet: 2 } },
    palate: { sweetness: 'dry', acidity: 'medium+', tanninLevel: 'low', alcohol: 'medium', body: 'light', flavourIntensity: 'medium+', finish: 'medium-', finishAccent: 'fruit' },
  },
  {
    id: 'bordeaux',
    emoji: '🍷',
    title: 'Выдержанное Бордо',
    desc: 'Каберне-структура: чёрная смородина, кедр, табак, высокие танины и долгий финиш.',
    identity: { style: 'red', abv: 13.5, region: 'Левый берег', country: 'Франция', grapes: 'Каберне Совиньон, Мерло' },
    eye: { clarity: 'clear', intensity: 'deep', color: 'garnet', ...pairOf('garnet') },
    nose: { condition: 'clean', intensity: 'medium+', development: 'fully-developed', aromas: { blackcurrant: 3, cedar: 3, tobacco: 2, 'black-plum': 2, graphite: 1 } },
    palate: { sweetness: 'dry', acidity: 'medium+', tanninLevel: 'high', tanninTexture: 'grainy', alcohol: 'medium', body: 'medium+', flavourIntensity: 'medium+', finish: 'long', finishAccent: 'tannin' },
  },
  {
    id: 'barolo',
    emoji: '🌹',
    title: 'Бароло (Неббиоло)',
    desc: 'Вишня, роза, смола и кожа; «кисло-танинный хребет» и кирпичная кайма.',
    identity: { style: 'red', abv: 14, region: 'Пьемонт', country: 'Италия', grapes: 'Неббиоло' },
    eye: { clarity: 'clear', intensity: 'medium', color: 'garnet', ...pairOf('garnet') },
    nose: { condition: 'clean', intensity: 'medium+', development: 'developing', aromas: { 'red-cherry': 3, rose: 3, leather: 2, tobacco: 1, liquorice: 1, apricot: 1 } },
    palate: { sweetness: 'dry', acidity: 'high', tanninLevel: 'high', tanninTexture: 'grippy', alcohol: 'high', body: 'medium+', flavourIntensity: 'medium+', finish: 'long', finishAccent: 'tannin' },
  },
  {
    id: 'tawny-port',
    emoji: '🥃',
    title: 'Тони Портвейн',
    desc: 'Креплёное окисленное: орехи, карамель, чернослив, высокий алкоголь, сладость с якорем из фрукта.',
    identity: { style: 'red', fortified: true, abv: 20, region: 'Дору', country: 'Португалия', grapes: 'Турига Насьональ и др.' },
    eye: { clarity: 'clear', intensity: 'deep', color: 'tawny', ...pairOf('tawny') },
    nose: { condition: 'clean', intensity: 'pronounced', development: 'fully-developed', aromas: { walnut: 3, caramel: 3, prune: 2, fig: 2, raisin: 1, coffee: 1 } },
    palate: { sweetness: 'sweet', acidity: 'medium-', tanninLevel: 'medium', alcohol: 'high', body: 'full', flavourIntensity: 'pronounced', finish: 'long', finishAccent: 'fruit' },
  },
];

/* ── Колесо ароматов: канонический атлас WSET Level 3 ────────────────────────
 * 8 благородных семейств (первичные → вторичные → терруар → время) + отдельный
 * сектор пороков (включается тумблером). Каждый идентификатор — стабильный slug,
 * на который опираются карточки, движок и экспорты. */

export const AROMA_WHEEL: AromaFamilyGroup[] = [
  {
    family: 'fruit',
    label: 'Фруктовые',
    hue: '#c59b4e', // Золотистый янтарь
    groups: [
      {
        label: 'Цитрусовые',
        items: [
          { id: 'lemon', label: 'Лимон', en: 'lemon' },
          { id: 'lime', label: 'Лайм', en: 'lime' },
          { id: 'grapefruit', label: 'Грейпфрут', en: 'grapefruit' },
          { id: 'orange-peel', label: 'Апельсиновая цедра', en: 'orange peel' },
          { id: 'mandarin', label: 'Мандарин / Клементин', en: 'mandarin' },
        ],
      },
      {
        label: 'Зелёные плоды',
        items: [
          { id: 'green-apple', label: 'Зелёное яблоко', en: 'green apple' },
          { id: 'red-apple', label: 'Красное яблоко', en: 'red apple' },
          { id: 'gooseberry', label: 'Крыжовник', en: 'gooseberry' },
          { id: 'pear', label: 'Груша', en: 'pear' },
          { id: 'quince', label: 'Айва', en: 'quince' },
        ],
      },
      {
        label: 'Косточковые',
        items: [
          { id: 'apricot', label: 'Абрикос', en: 'apricot' },
          { id: 'peach', label: 'Персик', en: 'peach' },
          { id: 'white-peach', label: 'Белый персик', en: 'white peach' },
          { id: 'nectarine', label: 'Нектарин', en: 'nectarine' },
        ],
      },
      {
        label: 'Тропические',
        items: [
          { id: 'banana', label: 'Банан', en: 'banana' },
          { id: 'lychee', label: 'Личи', en: 'lychee' },
          { id: 'mango', label: 'Манго', en: 'mango' },
          { id: 'melon', label: 'Дыня', en: 'melon' },
          { id: 'passionfruit', label: 'Маракуйя', en: 'passionfruit' },
          { id: 'pineapple', label: 'Ананас', en: 'pineapple' },
        ],
      },
      {
        label: 'Красные ягоды',
        items: [
          { id: 'redcurrant', label: 'Красная смородина', en: 'redcurrant' },
          { id: 'cranberry', label: 'Клюква', en: 'cranberry' },
          { id: 'raspberry', label: 'Малина', en: 'raspberry' },
          { id: 'strawberry', label: 'Клубника', en: 'strawberry' },
          { id: 'wild-strawberry', label: 'Земляника', en: 'wild strawberry' },
          { id: 'red-cherry', label: 'Красная вишня', en: 'red cherry' },
          { id: 'red-plum', label: 'Красная слива', en: 'red plum' },
        ],
      },
      {
        label: 'Чёрные ягоды',
        items: [
          { id: 'blackcurrant', label: 'Чёрная смородина', en: 'blackcurrant' },
          { id: 'blackberry', label: 'Ежевика', en: 'blackberry' },
          { id: 'blueberry', label: 'Черника / Голубика', en: 'blueberry' },
          { id: 'black-cherry', label: 'Черешня', en: 'black cherry' },
          { id: 'black-plum', label: 'Черносливная слива', en: 'black plum' },
        ],
      },
      {
        label: 'Приготовленные / Вяленые плоды',
        items: [
          { id: 'fig', label: 'Инжир', en: 'fig' },
          { id: 'prune', label: 'Чернослив', en: 'prune' },
          { id: 'raisin', label: 'Изюм', en: 'raisin' },
          { id: 'dates', label: 'Финики', en: 'dates' },
          { id: 'jam', label: 'Ягодный джем / Варенье', en: 'fruit jam' },
          { id: 'baked-apple', label: 'Печёное яблоко', en: 'baked apple' },
        ],
      },
    ],
  },
  {
    family: 'floral',
    label: 'Цветочные',
    hue: '#e5c179', // Сусальное золото
    groups: [
      {
        label: 'Белые и нежные цветы',
        items: [
          { id: 'acacia', label: 'Акация', en: 'acacia' },
          { id: 'honeysuckle', label: 'Жимолость', en: 'honeysuckle' },
          { id: 'chamomile', label: 'Ромашка', en: 'chamomile' },
          { id: 'elderflower', label: 'Бузина', en: 'elderflower' },
          { id: 'apple-blossom', label: 'Цвет яблони', en: 'apple blossom' },
          { id: 'jasmine', label: 'Жасмин', en: 'jasmine' },
          { id: 'linden', label: 'Липовый цвет', en: 'linden' },
        ],
      },
      {
        label: 'Парфюмированные и яркие',
        items: [
          { id: 'rose', label: 'Роза', en: 'rose' },
          { id: 'violet', label: 'Фиалка', en: 'violet' },
          { id: 'peony', label: 'Пион', en: 'peony' },
          { id: 'lavender', label: 'Лаванда', en: 'lavender' },
          { id: 'geranium', label: 'Герань', en: 'geranium' },
        ],
      },
    ],
  },
  {
    family: 'herbal',
    label: 'Травы',
    hue: '#759a72', // Шалфейный
    groups: [
      {
        label: 'Свежая зелень',
        items: [
          { id: 'bell-pepper', label: 'Зелёный болгарский перец', en: 'bell pepper' },
          { id: 'cut-grass', label: 'Скошенная трава', en: 'cut grass' },
          { id: 'blackcurrant-leaf', label: 'Лист смородины', en: 'blackcurrant leaf' },
          { id: 'tomato-leaf', label: 'Лист томата', en: 'tomato leaf' },
          { id: 'asparagus', label: 'Спаржа', en: 'asparagus' },
          { id: 'green-peas', label: 'Зелёный горошек', en: 'green peas' },
        ],
      },
      {
        label: 'Пряные и лекарственные травы',
        items: [
          { id: 'eucalyptus', label: 'Эвкалипт', en: 'eucalyptus' },
          { id: 'mint', label: 'Мята', en: 'mint' },
          { id: 'fennel', label: 'Фенхель', en: 'fennel' },
          { id: 'lemongrass', label: 'Лемонграсс', en: 'lemongrass' },
          { id: 'sage', label: 'Шалфей', en: 'sage' },
          { id: 'thyme', label: 'Тимьян', en: 'thyme' },
          { id: 'rosemary', label: 'Розмарин', en: 'rosemary' },
          { id: 'dill', label: 'Укроп', en: 'dill' },
          { id: 'hay', label: 'Сухое сено', en: 'hay' },
        ],
      },
    ],
  },
  {
    family: 'spice',
    label: 'Специи',
    hue: '#9a4a44', // Бордовый
    groups: [
      {
        label: 'Пряности',
        items: [
          { id: 'black-pepper', label: 'Чёрный перец', en: 'black pepper' },
          { id: 'white-pepper', label: 'Белый перец', en: 'white pepper' },
          { id: 'cinnamon', label: 'Корица', en: 'cinnamon' },
          { id: 'clove', label: 'Гвоздика', en: 'clove' },
          { id: 'ginger', label: 'Имбирь', en: 'ginger' },
          { id: 'nutmeg', label: 'Мускатный орех', en: 'nutmeg' },
          { id: 'liquorice', label: 'Лакрица', en: 'liquorice' },
          { id: 'juniper', label: 'Можжевельник', en: 'juniper' },
        ],
      },
    ],
  },
  {
    family: 'oak',
    label: 'Дуб',
    hue: '#8a623c', // Жареный лесной орех
    groups: [
      {
        label: 'Дубовая бочка',
        items: [
          { id: 'vanilla', label: 'Ваниль', en: 'vanilla' },
          { id: 'cedar', label: 'Кедр', en: 'cedar' },
          { id: 'coconut', label: 'Кокос', en: 'coconut' },
          { id: 'sandalwood', label: 'Сандал', en: 'sandalwood' },
          { id: 'pine-resin', label: 'Древесная смола', en: 'pine resin' },
        ],
      },
      {
        label: 'Обжарка и дым',
        items: [
          { id: 'toast', label: 'Тост / Гренки', en: 'toast' },
          { id: 'smoke', label: 'Дым', en: 'smoke' },
          { id: 'charred-wood', label: 'Обожжённое дерево', en: 'charred wood' },
          { id: 'coffee', label: 'Кофе', en: 'coffee' },
          { id: 'chocolate', label: 'Шоколад / Какао', en: 'chocolate' },
        ],
      },
    ],
  },
  {
    family: 'ferment',
    label: 'Ферментация',
    hue: '#b39f78', // Сливочно-кремовый
    groups: [
      {
        label: 'Дрожжевой осадок (Шампанизация / Сюр Ли)',
        items: [
          { id: 'brioche', label: 'Бриошь', en: 'brioche' },
          { id: 'biscuit', label: 'Печенье', en: 'biscuit' },
          { id: 'bread-dough', label: 'Свежее тесто', en: 'bread dough' },
          { id: 'yeast', label: 'Дрожжи', en: 'yeast' },
        ],
      },
      {
        label: 'Яблочно-молочное брожение (МЛО)',
        items: [
          { id: 'butter', label: 'Сливочное масло', en: 'butter' },
          { id: 'cream', label: 'Сливки', en: 'cream' },
          { id: 'yogurt', label: 'Йогурт', en: 'yogurt' },
          { id: 'cheese-rind', label: 'Сырная корка', en: 'cheese rind' },
        ],
      },
    ],
  },
  {
    family: 'mineral',
    label: 'Минералы',
    hue: '#638291', // Сланцевый сизый
    groups: [
      {
        label: 'Камень и порода',
        items: [
          { id: 'flint', label: 'Оружейный кремень', en: 'flint', mineral: true },
          { id: 'wet-stone', label: 'Мокрый камень', en: 'wet stone', mineral: true },
          { id: 'slate', label: 'Сланец', en: 'slate', mineral: true },
          { id: 'chalk', label: 'Мел / Известняк', en: 'chalk', mineral: true },
          { id: 'graphite', label: 'Графит / Грифель', en: 'graphite', mineral: true },
        ],
      },
      {
        label: 'Морские тона',
        items: [
          { id: 'sea-salt', label: 'Морская соль', en: 'sea salt', mineral: true },
          { id: 'iodine', label: 'Йод', en: 'iodine', mineral: true },
          { id: 'oyster-shell', label: 'Устричная раковина', en: 'oyster shell', mineral: true },
          { id: 'seaweed', label: 'Водоросли', en: 'seaweed', mineral: true },
        ],
      },
    ],
  },
  {
    family: 'tertiary',
    label: 'Выдержка',
    hue: '#69554a', // Благородная патина
    groups: [
      {
        label: 'Земля и лес',
        items: [
          { id: 'forest-floor', label: 'Лесная подстилка', en: 'forest floor' },
          { id: 'mushroom', label: 'Грибы', en: 'mushroom' },
          { id: 'truffle', label: 'Трюфель', en: 'truffle' },
          { id: 'damp-earth', label: 'Влажная земля', en: 'damp earth' },
        ],
      },
      {
        label: 'Орехи, мёд и оксидация',
        items: [
          { id: 'almond', label: 'Миндаль', en: 'almond' },
          { id: 'hazelnut', label: 'Фундук', en: 'hazelnut' },
          { id: 'walnut', label: 'Грецкий орех', en: 'walnut' },
          { id: 'honey', label: 'Мёд', en: 'honey' },
          { id: 'caramel', label: 'Карамель / Ирис', en: 'caramel' },
          { id: 'beeswax', label: 'Пчелиный воск', en: 'beeswax' },
        ],
      },
      {
        label: 'Табак, кожа и дичь',
        items: [
          { id: 'tobacco', label: 'Табачный лист', en: 'tobacco' },
          { id: 'cigar-box', label: 'Сигарная коробка', en: 'cigar box' },
          { id: 'leather', label: 'Старая кожа', en: 'leather' },
          { id: 'game', label: 'Дичь / Мясо', en: 'game' },
          { id: 'tea', label: 'Чайный лист', en: 'tea' },
          { id: 'petrol', label: 'Петроль / TDN (Рислинг)', en: 'petrol (TDN)', mineral: true },
        ],
      },
    ],
  },
];

/** Сектор пороков: в кольцо встраивается тумблером, из каталога благородных
 *  семейств исключён, чтобы не искажать спектр и сложность. */
export const AROMA_FAULTS_SECTOR: AromaFamilyGroup = {
  family: 'fruit', // семейство-заглушка: тип AromaFamily не включает faults
  label: 'Пороки / Химия',
  hue: '#b05750', // Тревожный гранат
  groups: [
    {
      label: 'Химические тона и дефекты',
      items: FAULT_TYPE_OPTS.map((ft) => ({ id: ft.value, label: ft.label, en: ft.en })),
    },
  ],
};

/** Короткие художественные подсказки групп колеса: всплывают в панели дескрипторов. */
export const AROMA_GROUP_HINTS: Readonly<Record<string, string>> = {
  Цитрусовые: 'свежесть цитруса',
  'Зелёные плоды': 'садовая свежесть',
  Косточковые: 'мягкий пух косточки',
  Тропические: 'сочная экзотика',
  'Красные ягоды': 'яркая ягодность',
  'Чёрные ягоды': 'густая тёмная ягода',
  'Приготовленные / Вяленые плоды': 'уваренность, компот',
  'Белые и нежные цветы': 'лепестки и нектар',
  'Парфюмированные и яркие': 'парфюм и пыльца',
  'Свежая зелень': 'колючая зелень',
  'Пряные и лекарственные травы': 'аптечный луг',
  Пряности: 'тепло и острота',
  'Дубовая бочка': 'ваниль, тост, дым',
  'Обжарка и дым': 'жареные тона дуба',
  'Дрожжевой осадок (Шампанизация / Сюр Ли)': 'хлеб и автолиз',
  'Яблочно-молочное брожение (МЛО)': 'кремовость МЛО',
  'Камень и порода': 'пыль камня',
  'Морские тона': 'йод и солёный бриз',
  'Земля и лес': 'подстилка и трюфель',
  'Орехи, мёд и оксидация': 'орех, оксидативность',
  'Табак, кожа и дичь': 'кожа, время, сафьян',
  'Химические тона и дефекты': 'настороженность и диагноз',
};

/** Миграция идентификаторов дескрипторов: карточки старых сборок ссылаются на
 *  слаги, заменённые при канонизации атласа. Маппинг читается при загрузке
 *  записей (normalizeRecord) и при чтении метаданных — старые дегустации
 *  продолжают подсвечивать правильные секторы колеса. */
export const DESCRIPTOR_LEGACY_ALIASES: Readonly<Record<string, string>> = {
  plum: 'black-plum', // Слива → Черносливная слива
  'cooked-strawberry': 'jam', // Томлёная клубника → Ягодный джем
  'white-flowers': 'acacia', // Белые цветы → Акация
  tarragon: 'sage', // Тархун → Шалфей
  'grass-root': 'damp-earth', // Корни растений → Влажная земля
  gunpowder: 'flint', // Пороховая дымка → Оружейный кремень
  seashell: 'oyster-shell', // Ракушки → Устричная раковина
  haystack: 'hay', // Стог сена → Сухое сено
  'dried-apricot': 'apricot', // Сушёный абрикос → Абрикос
  butterscotch: 'caramel', // Ирис → Карамель / Ирис
};

/** Канонический id дескриптора с учётом легаси-слагов. */
export function canonicalDescriptorId(id: string): string {
  return DESCRIPTOR_LEGACY_ALIASES[id] ?? id;
}

/** Все дескрипторы одной картой: id → Descriptor-мета. Легаси-слаги указывают
 *  на канонические меты — старые карточки продолжают работать без миграции. */
export const DESCRIPTORS_BY_ID: ReadonlyMap<string, { label: string; family: string; mineral: boolean }> =
  new Map((() => {
    const canon = AROMA_WHEEL.flatMap((f) =>
      f.groups.flatMap((g) => g.items.map((i) => [i.id, { label: i.label, family: f.family, mineral: i.mineral === true }] as const)),
    );
    const byId = new Map<string, { label: string; family: string; mineral: boolean }>(canon);
    for (const [legacyId, canonId] of Object.entries(DESCRIPTOR_LEGACY_ALIASES)) {
      const meta = byId.get(canonId);
      if (meta) byId.set(legacyId, meta);
    }
    return byId;
  })());

/** Минеральные ключи для свободного текста (заметки, образ): строка → вес. */
export const MINERAL_TEXT_KEYS: ReadonlyArray<{ re: RegExp; weight: number; label: string }> = [
  { re: /кремн/i, weight: 2, label: 'кремень' },
  { re: /сланц/i, weight: 2, label: 'сланец' },
  { re: /мокр\w* камн|влажн\w* камн/i, weight: 2, label: 'мокрый камень' },
  { re: /графит/i, weight: 1.5, label: 'графит' },
  { re: /йод/i, weight: 2, label: 'йод' },
  { re: /солоноват|морск\w* соль|солев/i, weight: 2, label: 'морская соль' },
  { re: /мел\w*\b/i, weight: 1.5, label: 'мел' },
  { re: /порох/i, weight: 2, label: 'порох' },
  { re: /петроль|tdn/i, weight: 1.5, label: 'петроль/TDN' },
  { re: /минерал/i, weight: 1, label: 'минеральность' },
];

/* ── Отладочные подписи режимов ───────────────────────────────────────────── */

export const MODE_LABELS: Record<'wset3' | 'sommelier-pro', string> = {
  /* v19: «WSET» — быстрый проход по вину, без экзаменационного пафоса. */
  wset3: 'WSET',
  'sommelier-pro': 'Сомелье Pro',
};
