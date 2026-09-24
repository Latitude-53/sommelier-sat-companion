/**
 * Нормализация легаси-записей при загрузке — страж «серого экрана Носа».
 *
 * Урок релиза v5: карточка, сохранённая старой версией приложения (или
 * импортированный бэкап с чужой схемой), падала на рендере «Носа» —
 * `nose.customTags.some is not a function` — и React умирал целиком,
 * показывая пользователю пустой тёмный экран без единой подсказки.
 *
 * Принцип: загруженная запись НЕ доверяется ни на одном поле. Каждая секция
 * собирается заново на белом списке: неизвестные поля отбрасываются,
 * отсутствующие дополняются значениями фабрики, поля неверного типа/набора
 * значений сбрасываются в дефолт. Так рендер физически не может встретить
 * undefined-массив или невалидный энум.
 */
import {
  createEmptyTasting,
  TASTING_SCHEMA_VERSION,
  type ConclusionData,
  type EyeData,
  type FaultRecord,
  type MediaData,
  type NoseCustomTag,
  type NoseData,
  type PalateData,
  type PhotoAttachment,
  type TastingRecord,
  type WineIdentity,
} from '@/types/tasting';
import {
  SWEETNESS_LEGACY_ALIAS,
  type DescriptorLevel,
  type TastingMode,
} from '@/types/wset';

/* ── Белые списки энумов (рантайм-зеркала типов из types/wset) ────────────── */

const MODES: readonly TastingMode[] = ['wset3', 'sommelier-pro'];
const SAT_INTENSITY = ['low', 'medium-', 'medium', 'medium+', 'pronounced'] as const;
const SAT_ACIDITY = ['low', 'medium-', 'medium', 'medium+', 'high'] as const;
const SAT_ALCOHOL = ['low', 'medium', 'high'] as const;
const ALCOHOL_FEEL = ['hidden', 'woven', 'harmonious', 'protruding', 'burning'] as const;
/** Белый список чипов-ощущений алкоголя (v14) — синхронен с ALCOHOL_PERCEPTION_OPTS. */
const ALCOHOL_PERCEPTION_KEYS = [
  'warm-chest', 'burn-finish', 'hot-nostrils', 'lifts-fruit', 'masks-acid', 'drying',
] as const;
const SAT_BODY = ['light', 'medium-', 'medium', 'medium+', 'full'] as const;
const SAT_FINISH = ['short', 'medium-', 'medium', 'medium+', 'long'] as const;
const SWEETNESS = ['dry', 'off-dry', 'medium', 'sweet'] as const;
const ACIDITY_SHAPE = ['linear', 'early-peak', 'mid-peak', 'flat', 'late-peak', 'soft-wave'] as const;
const TANNIN_TEXTURE = ['silky', 'chalky', 'velvety', 'grainy', 'rustic', 'grippy'] as const;
const FINISH_ACCENT = ['acid', 'tannin', 'fruit', 'oak', 'mineral'] as const;
const BALANCE_VERDICT = ['balanced', 'unbalanced'] as const;
const BALANCE_ISSUES = [
  'acid-dominant', 'tannin-dominant', 'sugar-unanchored', 'bitter',
  'hot-alcohol', 'watery', 'thin-extract', 'other',
] as const;
const BLIC_KEYS = ['balance', 'length', 'intensity', 'complexity'] as const;
const BLIC_RATINGS = ['strong', 'adequate', 'weak'] as const;
const QUALITY = [
  'faulty', 'poor', 'acceptable', 'good', 'very-good', 'outstanding',
] as const;
const READINESS = ['too-young', 'drink-not-peak', 'drink-now', 'drink-or-age', 'declining'] as const;
const CLARITY = ['clear', 'hazy'] as const;
const VISUAL_INTENSITY = ['pale', 'medium', 'deep'] as const;
const WINE_STYLE = ['white', 'rose', 'red', 'orange'] as const;
const WINE_COLOR = [
  'lemon-green', 'lemon', 'gold', 'amber', 'brown',
  'pink', 'salmon', 'orange-rose',
  'purple', 'ruby', 'garnet', 'tawny',
] as const;
const CONDITION = ['clean', 'unclean'] as const;
const DEVELOPMENT = ['youthful', 'developing', 'fully-developed', 'tired'] as const;
const FAULT_TYPE = ['tca', 'reduction', 'oxidation', 'va', 'brett', 'so2', 'rubber'] as const;
const FAULT_SEVERITY = ['light', 'distinct', 'heavy'] as const;
const LEGS = ['watery', 'thin', 'medium', 'thick'] as const;
const PERLAGE_INTENSITY = ['delicate', 'medium', 'vigorous'] as const;
const BUBBLE_SIZE = ['fine', 'medium', 'coarse'] as const;
const MOUSSE = ['creamy', 'light', 'aggressive'] as const;
const RIM_WIDTH = ['none', 'narrow', 'medium', 'wide'] as const;
const PHOTO_ROLES = ['label', 'label-back', 'cork', 'glass', 'moodboard', 'other'] as const;

/* Семейства ароматов — рантайм-зеркало типа AromaFamily (types/wset). */
const AROMA_FAMILIES = [
  'fruit', 'floral', 'herbal', 'spice', 'oak', 'ferment', 'mineral', 'tertiary',
] as const;

/* ── Микро-хелперы безопасного чтения ─────────────────────────────────────── */

type Dict = Record<string, unknown>;

const isObj = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Строка или дефолт. */
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

/** Строка из белого списка или null. */
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;

/** Конечное число или null (NaN/Infinity/строки отбрасываются). */
const num = (v: unknown, min = -Infinity, max = Infinity): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, v));
};

/** Массив или дефолт. */
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/* ── Нос ──────────────────────────────────────────────────────────────────── */

/** Легаси-имена массива пользовательских тегов (до унификации на customTags). */
const CUSTOM_TAG_LEGACY_KEYS = ['customTags', 'tags', 'wheelTags'] as const;

function normalizeCustomTags(nose: Dict): NoseCustomTag[] {
  for (const key of CUSTOM_TAG_LEGACY_KEYS) {
    const raw = arr(nose[key]);
    if (raw.length > 0 || nose[key] !== undefined) {
      const tags: NoseCustomTag[] = [];
      for (const t of raw) {
        if (!isObj(t)) continue;
        const family = pick(t.family, AROMA_FAMILIES);
        const id = str(t.id);
        const label = str(t.label).slice(0, 28);
        if (!family || !id || !label) continue;
        const createdAt = typeof t.createdAt === 'string' ? t.createdAt : undefined;
        tags.push(createdAt ? { id, family, label, createdAt } : { id, family, label });
      }
      /* Пустой явный массив тоже принимаем — тегов просто нет. */
      if (nose[key] !== undefined) return tags;
    }
  }
  return [];
}

/** Уровни дескрипторов: id → 1|2|3. Принимаются и карта id→уровень, и
 *  легаси-массив [{id, level}]. Строковые '1'..'3', старые объекты {level: N}
 *  и мусор приводятся/отбрасываются; ключи не превышают 64 символа. */
function normalizeAromas(nose: Dict): Record<string, DescriptorLevel> {
  const out: Record<string, DescriptorLevel> = {};
  const eat = (id: unknown, v: unknown): void => {
    if (typeof id !== 'string' || !id) return;
    let level: number | null = null;
    if (typeof v === 'number' && Number.isFinite(v)) level = Math.round(v);
    else if (typeof v === 'string' && /^\d$/.test(v.trim())) level = Number(v.trim());
    else if (isObj(v) && typeof v.level === 'number') level = Math.round(v.level);
    if (level !== null && level >= 1 && level <= 3) out[id.slice(0, 64)] = level as DescriptorLevel;
  };
  const raw = nose.aromas;
  if (Array.isArray(raw)) {
    for (const item of raw) if (isObj(item)) eat(item.id, item.level ?? item.value);
    return out;
  }
  if (isObj(raw)) {
    for (const [id, v] of Object.entries(raw)) eat(id, v);
  }
  return out;
}

function normalizeNose(noseRaw: unknown): NoseData {
  const empty = createEmptyTasting().nose;
  if (!isObj(noseRaw)) return empty;
  const faults: FaultRecord[] = [];
  for (const f of arr(noseRaw.faults)) {
    if (!isObj(f)) continue;
    const type = pick(f.type, FAULT_TYPE);
    const severity = pick(f.severity, FAULT_SEVERITY);
    if (type && severity && !faults.some((x) => x.type === type)) faults.push({ type, severity });
  }
  const condition = pick(noseRaw.condition, CONDITION);
  /* Легаси-страж: пороки в списке принудительно держат статус «С дефектом». */
  return {
    condition: faults.length > 0 ? 'unclean' : condition,
    faults,
    intensity: pick(noseRaw.intensity, SAT_INTENSITY),
    development: pick(noseRaw.development, DEVELOPMENT),
    aromas: normalizeAromas(noseRaw),
    customTags: normalizeCustomTags(noseRaw),
    note: str(noseRaw.note).slice(0, 4000),
  };
}

/* ── Глаз ─────────────────────────────────────────────────────────────────── */

function normalizeEye(eyeRaw: unknown): EyeData {
  const empty = createEmptyTasting().eye;
  if (!isObj(eyeRaw)) return empty;
  let perlage = empty.perlage;
  if (isObj(eyeRaw.perlage)) {
    const p = eyeRaw.perlage;
    const intensity = pick(p.intensity, PERLAGE_INTENSITY);
    const bubbleSize = pick(p.bubbleSize, BUBBLE_SIZE);
    const mousse = pick(p.mousse, MOUSSE);
    if (intensity || bubbleSize || mousse) perlage = { intensity, bubbleSize, mousse };
  }
  return {
    clarity: pick(eyeRaw.clarity, CLARITY),
    intensity: pick(eyeRaw.intensity, VISUAL_INTENSITY),
    color: pick(eyeRaw.color, WINE_COLOR),
    coreHex: typeof eyeRaw.coreHex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(eyeRaw.coreHex) ? eyeRaw.coreHex : null,
    rimHex: typeof eyeRaw.rimHex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(eyeRaw.rimHex) ? eyeRaw.rimHex : null,
    rimWidth: pick(eyeRaw.rimWidth, RIM_WIDTH),
    legs: pick(eyeRaw.legs, LEGS),
    perlage,
    note: str(eyeRaw.note).slice(0, 4000),
  };
}

/* ── Рот ──────────────────────────────────────────────────────────────────── */

function normalizePalate(palateRaw: unknown): PalateData {
  const empty = createEmptyTasting().palate;
  if (!isObj(palateRaw)) return empty;
  /* Сладость: каноническая шкала или миграция легаси medium-dry/medium-sweet. */
  let sweetness = pick(palateRaw.sweetness, SWEETNESS);
  if (!sweetness && typeof palateRaw.sweetness === 'string') {
    sweetness = SWEETNESS_LEGACY_ALIAS[palateRaw.sweetness] ?? null;
  }
  const balanceRaw = isObj(palateRaw.balance) ? palateRaw.balance : {};
  const issues = arr(balanceRaw.issues)
    .map((i) => pick(i, BALANCE_ISSUES))
    .filter((i): i is (typeof BALANCE_ISSUES)[number] => i !== null);
  return {
    sweetness,
    acidityShape: pick(palateRaw.acidityShape, ACIDITY_SHAPE),
    acidity: pick(palateRaw.acidity, SAT_ACIDITY),
    tanninLevel: pick(palateRaw.tanninLevel, SAT_ACIDITY),
    tanninTexture: pick(palateRaw.tanninTexture, TANNIN_TEXTURE),
    alcohol: pick(palateRaw.alcohol, SAT_ALCOHOL),
    alcoholFeel: pick(palateRaw.alcoholFeel, ALCOHOL_FEEL),
    alcoholNotes: arr(palateRaw.alcoholNotes)
      .map((n) => pick(n, ALCOHOL_PERCEPTION_KEYS))
      .filter((n): n is (typeof ALCOHOL_PERCEPTION_KEYS)[number] => n !== null)
      .slice(0, 6),
    body: pick(palateRaw.body, SAT_BODY),
    flavourIntensity: pick(palateRaw.flavourIntensity, SAT_INTENSITY),
    finish: pick(palateRaw.finish, SAT_FINISH),
    caudalieSeconds: num(palateRaw.caudalieSeconds, 0, 60),
    finishAccent: pick(palateRaw.finishAccent, FINISH_ACCENT),
    balance: {
      verdict: pick(balanceRaw.verdict, BALANCE_VERDICT),
      issues: balanceRaw.verdict === 'balanced' ? [] : issues,
      note: str(balanceRaw.note).slice(0, 2000),
    },
    note: str(palateRaw.note).slice(0, 4000),
  };
}

/* ── Итог ─────────────────────────────────────────────────────────────────── */

function normalizeConclusion(cRaw: unknown): ConclusionData {
  const empty = createEmptyTasting().conclusion;
  if (!isObj(cRaw)) return empty;
  const blic: ConclusionData['blic'] = {};
  if (isObj(cRaw.blic)) {
    for (const key of BLIC_KEYS) {
      const rating = pick(cRaw.blic[key], BLIC_RATINGS);
      if (rating) blic[key] = rating;
    }
  }
  return {
    blic,
    quality: pick(cRaw.quality, QUALITY),
    readiness: pick(cRaw.readiness, READINESS),
    windowFrom: num(cRaw.windowFrom, 1900, 2100),
    windowTo: num(cRaw.windowTo, 1900, 2100),
    score100: num(cRaw.score100, 50, 100),
    note: str(cRaw.note).slice(0, 4000),
  };
}

/* ── Титул, медиа, фото ───────────────────────────────────────────────────── */

function normalizeIdentity(idRaw: unknown, fallbackTaster: string): WineIdentity {
  const empty = createEmptyTasting('wset3', fallbackTaster).identity;
  if (!isObj(idRaw)) return empty;
  return {
    name: str(idRaw.name).slice(0, 120),
    producer: str(idRaw.producer).slice(0, 120),
    vintage: str(idRaw.vintage).slice(0, 12),
    style: pick(idRaw.style, WINE_STYLE),
    sparkling: idRaw.sparkling === true,
    fortified: idRaw.fortified === true,
    blind: idRaw.blind === true,
    cellar: idRaw.cellar === true,
    region: str(idRaw.region).slice(0, 120),
    country: str(idRaw.country).slice(0, 120),
    grapes: str(idRaw.grapes).slice(0, 200),
    abv: num(idRaw.abv, 0, 40),
    price: str(idRaw.price).slice(0, 40),
    dateTasted: /^\d{4}-\d{2}-\d{2}$/.test(str(idRaw.dateTasted)) ? str(idRaw.dateTasted) : empty.dateTasted,
    taster: str(idRaw.taster, fallbackTaster).slice(0, 80),
  };
}

function normalizeMedia(mRaw: unknown): MediaData {
  const empty = createEmptyTasting().media;
  if (!isObj(mRaw)) return empty;
  return {
    image: str(mRaw.image).slice(0, 2000),
    emojis: arr(mRaw.emojis).filter((e): e is string => typeof e === 'string').slice(0, 12),
    gastronomy: arr(mRaw.gastronomy).filter((g): g is string => typeof g === 'string').slice(0, 24),
    notes: str(mRaw.notes).slice(0, 8000),
  };
}

function normalizePhotos(pRaw: unknown): PhotoAttachment[] {
  return arr(pRaw)
    .map((p): PhotoAttachment | null => {
      if (!isObj(p)) return null;
      const dataUrl = str(p.dataUrl);
      if (!dataUrl.startsWith('data:image/')) return null;
      const role = pick(p.role, PHOTO_ROLES) ?? 'other';
      const width = num(p.width, 0, 20000);
      const height = num(p.height, 0, 20000);
      const sizeKb = num(p.sizeKb, 0, 20000);
      if (!p.id || width === null || height === null || sizeKb === null) return null;
      return { id: str(p.id), role, dataUrl, width, height, sizeKb };
    })
    .filter((p): p is PhotoAttachment => p !== null)
    .slice(0, 24);
}

/* ── Точка входа ──────────────────────────────────────────────────────────── */

/**
 * Полная нормализация записи перед загрузкой в редьюсер.
 * Никогда не бросает: любая гадость превращается в валидную карточку.
 */
export function normalizeRecord(raw: unknown, fallbackTaster = ''): TastingRecord {
  const fresh = createEmptyTasting();
  if (!isObj(raw)) return fresh;
  const mode = pick(raw.mode, MODES) ?? 'wset3';
  const now = new Date().toISOString();
  return {
    schemaVersion: TASTING_SCHEMA_VERSION,
    id: str(raw.id) || fresh.id,
    mode,
    createdAt: typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : now,
    draft: raw.draft !== false,
    /* v18: фото «на карточке» — id должен ссылаться на выжившее фото;
     * битые/легаси-записи молча теряют окно (это просто украшение). */
    cardPhotoId:
      typeof raw.cardPhotoId === 'string' && arr(raw.photos).some((p) => isObj(p) && p.id === raw.cardPhotoId)
        ? raw.cardPhotoId
        : null,
    identity: normalizeIdentity(raw.identity, fallbackTaster),
    eye: normalizeEye(raw.eye),
    nose: normalizeNose(raw.nose),
    palate: normalizePalate(raw.palate),
    conclusion: normalizeConclusion(raw.conclusion),
    media: normalizeMedia(raw.media),
    photos: normalizePhotos(raw.photos),
  };
}
