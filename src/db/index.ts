/**
 * Единый слой хранения: IndexedDB через idb.
 * Структуры: tastings (карточки), settings (настройки приложения).
 * Фото хранятся уже сжатыми (см. imageCompressor.ts) — лимит localStorage
 * в 5–10 МБ больше не угрожает данным.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { TASTING_SCHEMA_VERSION, createEmptyTasting, type CustomAroma, type TastingRecord } from '@/types/tasting';
import type { TastingMode } from '@/types/wset';

interface SommelierDB extends DBSchema {
  tastings: {
    key: string;
    value: TastingRecord;
    indexes: { 'by-updated': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  /** Глобальная библиотека своих дескрипторов колеса (ТЗ §1). */
  customAromas: {
    key: string;
    value: CustomAroma;
    indexes: { 'by-family': string };
  };
}

export interface AppSettings {
  key: 'app';
  mode: TastingMode;
  tasterName: string;
}

export interface BackupPayload {
  app: 'sommelier-sat-companion';
  schemaVersion: number;
  exportedAt: string;
  tastings: TastingRecord[];
  /** Глобальные свои дескрипторы (v2; в старых бэкапах поле отсутствует). */
  customAromas?: CustomAroma[];
}

const DB_NAME = 'sommelier-sat';
/** v2: object store customAromas — глобальные свои дескрипторы. */
const DB_VERSION = 2;

/* ── Фолбэк: localStorage ──────────────────────────────────────────────────
 * IndexedDB недоступна на file:// (Chrome/Edge) и в приватных окнах.
 * Тогда все функции прозрачного хранилища работают через localStorage:
 * фото предварительно сжимаются (~100 КБ), так что лимита ~5 МБ хватает
 * на десятки карточек. Режим определяется один раз, лениво. */

export type StorageMode = 'idb' | 'local';
let storageMode: StorageMode | null = null;
const modeSubs = new Set<(m: StorageMode) => void>();

/** Текущий режим хранилища (null — ещё не определялся). */
export function getStorageMode(): StorageMode | null {
  return storageMode;
}

/** Подписка на определение режима; колбэк зовётся сразу, если уже известен. */
export function onStorageMode(cb: (m: StorageMode) => void): () => void {
  modeSubs.add(cb);
  if (storageMode) cb(storageMode);
  return () => {
    modeSubs.delete(cb);
  };
}

const LS_KEY = 'sommelier-sat-fallback-v1';

interface FallbackData {
  tastings: TastingRecord[];
  settings: AppSettings | null;
  customAromas: CustomAroma[];
}

function lsRead(): FallbackData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FallbackData>;
      return { tastings: parsed.tastings ?? [], settings: parsed.settings ?? null, customAromas: parsed.customAromas ?? [] };
    }
  } catch {
    /* битый JSON или отключённое хранилище — начинаем с пустого */
  }
  return { tastings: [], settings: null, customAromas: [] };
}

function lsWrite(data: FallbackData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    console.warn('[db] localStorage переполнен — данные могут не сохраниться');
  }
}

/** Ленивая детекция: пробуем реальную операцию в IndexedDB. */
async function isLocal(): Promise<boolean> {
  if (storageMode) return storageMode === 'local';
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB API отсутствует');
    const probe = await getDb();
    await probe.get('settings', 'app');
    storageMode = 'idb';
  } catch {
    storageMode = 'local';
    console.warn(
      '[db] IndexedDB недоступна (file:// или приватный режим) — включён фолбэк на localStorage (~5 МБ).',
    );
  }
  for (const cb of modeSubs) cb(storageMode);
  return storageMode === 'local';
}

let dbPromise: Promise<IDBPDatabase<SommelierDB>> | null = null;

function getDb(): Promise<IDBPDatabase<SommelierDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SommelierDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('tastings')) {
          const store = db.createObjectStore('tastings', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('customAromas')) {
          const store = db.createObjectStore('customAromas', { keyPath: 'id' });
          store.createIndex('by-family', 'family');
        }
        void transaction;
      },
    });
  }
  return dbPromise;
}

/* ── CRUD ──────────────────────────────────────────────────────────────────── */

export async function saveTasting(record: TastingRecord): Promise<void> {
  if (await isLocal()) {
    const data = lsRead();
    const next = data.tastings.filter((t) => t.id !== record.id);
    next.push({ ...record, updatedAt: new Date().toISOString() });
    lsWrite({ ...data, tastings: next });
    return;
  }
  const db = await getDb();
  await db.put('tastings', { ...record, updatedAt: new Date().toISOString() });
}

export async function getTasting(id: string): Promise<TastingRecord | undefined> {
  if (await isLocal()) return lsRead().tastings.find((t) => t.id === id);
  const db = await getDb();
  return db.get('tastings', id);
}

export async function listTastings(): Promise<TastingRecord[]> {
  if (await isLocal()) {
    return [...lsRead().tastings].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).reverse();
  }
  const db = await getDb();
  const all = await db.getAllFromIndex('tastings', 'by-updated');
  return all.reverse(); // свежие сверху
}

export async function deleteTasting(id: string): Promise<void> {
  if (await isLocal()) {
    const data = lsRead();
    lsWrite({ ...data, tastings: data.tastings.filter((t) => t.id !== id) });
    return;
  }
  const db = await getDb();
  await db.delete('tastings', id);
}

export async function countTastings(): Promise<number> {
  if (await isLocal()) return lsRead().tastings.length;
  const db = await getDb();
  return db.count('tastings');
}

/* ── Настройки ─────────────────────────────────────────────────────────────── */

export async function loadSettings(): Promise<AppSettings> {
  if (await isLocal()) {
    return lsRead().settings ?? { key: 'app', mode: 'wset3', tasterName: '' };
  }
  const db = await getDb();
  const s = await db.get('settings', 'app');
  return s ?? { key: 'app', mode: 'wset3', tasterName: '' };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (await isLocal()) {
    lsWrite({ ...lsRead(), settings });
    return;
  }
  const db = await getDb();
  await db.put('settings', settings);
}

/* ── Глобальная библиотека своих дескрипторов (ТЗ §1) ────────────────────────
 * Теги переживают дегустации: добавил «фейхоа» один раз — доступно всегда.
 * Удаление крестиком убирает тег и из библиотеки, и из текущей карточки. */

export async function listCustomAromas(): Promise<CustomAroma[]> {
  if (await isLocal()) return [...lsRead().customAromas].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const db = await getDb();
  const all = await db.getAllFromIndex('customAromas', 'by-family');
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveCustomAroma(tag: CustomAroma): Promise<void> {
  if (await isLocal()) {
    const data = lsRead();
    if (!data.customAromas.some((t) => t.id === tag.id)) data.customAromas.push(tag);
    lsWrite(data);
    return;
  }
  const db = await getDb();
  await db.put('customAromas', tag);
}

export async function deleteCustomAroma(id: string): Promise<void> {
  if (await isLocal()) {
    const data = lsRead();
    lsWrite({ ...data, customAromas: data.customAromas.filter((t) => t.id !== id) });
    return;
  }
  const db = await getDb();
  await db.delete('customAromas', id);
}

/* ── Резервное копирование ─────────────────────────────────────────────────── */

/** Полный бэкап всех дегустаций + библиотеки дескрипторов → JSON-объект. */
export async function backupAll(): Promise<BackupPayload> {
  const tastings = await listTastings();
  const customAromas = await listCustomAromas();
  return {
    app: 'sommelier-sat-companion',
    schemaVersion: TASTING_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tastings,
    customAromas,
  };
}

/** Ошибки валидации бэкапа с человеческим сообщением. */
export class BackupValidationError extends Error {}

/**
 * Восстановление из JSON. Валидирует схему, нормализует записи.
 * merge=true — добавить/обновить; merge=false — заменить всё хранилище.
 * @returns число восстановленных записей
 */
export async function restoreBackup(
  json: unknown,
  opts: { merge?: boolean } = {},
): Promise<number> {
  const payload = validateBackup(json);
  /* Глобальные дескрипторы из бэкапа: мержим без дублей (по id). */
  const incomingTags = Array.isArray(payload.customAromas)
    ? payload.customAromas.filter((t) => typeof t?.id === 'string' && typeof t?.label === 'string')
    : [];
  for (const tag of incomingTags) await saveCustomAroma(tag);
  if (await isLocal()) {
    const data = lsRead();
    const map = new Map((opts.merge ? data.tastings : []).map((t) => [t.id, t]));
    for (const record of payload.tastings) map.set(record.id, normalizeRecord(record));
    lsWrite({ ...data, tastings: [...map.values()] });
    return payload.tastings.length;
  }
  const db = await getDb();
  const tx = db.transaction('tastings', 'readwrite');
  if (!opts.merge) await tx.store.clear();
  for (const record of payload.tastings) {
    await tx.store.put(normalizeRecord(record));
  }
  await tx.done;
  return payload.tastings.length;
}

/* ── Валидация ─────────────────────────────────────────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateBackup(json: unknown): BackupPayload {
  if (!isRecord(json)) {
    throw new BackupValidationError('Файл бэкапа не является корректным JSON-объектом.');
  }
  if (json.app !== 'sommelier-sat-companion') {
    throw new BackupValidationError(
      'Это бэкап другого приложения (метка app не совпадает). Импорт отклонён.',
    );
  }
  const version = typeof json.schemaVersion === 'number' ? json.schemaVersion : 0;
  if (version < 1 || version > TASTING_SCHEMA_VERSION) {
    throw new BackupValidationError(
      `Неподдерживаемая версия схемы: ${version}. Ожидается ≤ ${TASTING_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(json.tastings)) {
    throw new BackupValidationError('В бэкапе отсутствует массив tastings.');
  }
  const tastings = json.tastings.filter((t): t is TastingRecord => {
    if (!isRecord(t)) return false;
    return typeof t.id === 'string' && isRecord(t.identity) && isRecord(t.palate);
  });
  if (tastings.length === 0) {
    throw new BackupValidationError('В бэкапе нет ни одной валидной записи.');
  }
  /* H1 (аудит v12): библиотека своих дескрипторов должна проходить сквозь
   * валидатор — иначе restoreBackup получает payload.customAromas === undefined
   * и молча теряет её при восстановлении. Фильтр зеркалит штатную защиту
   * рестора (id + label обязательны). */
  const customAromas: CustomAroma[] = Array.isArray(json.customAromas)
    ? json.customAromas.filter(
        (t): t is CustomAroma => isRecord(t) && typeof t?.id === 'string' && typeof t?.label === 'string',
      )
    : [];
  return {
    app: 'sommelier-sat-companion',
    schemaVersion: version,
    exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : new Date().toISOString(),
    tastings,
    customAromas,
  };
}

/** Мягкая нормализация записи (защита от старых/ручных правок JSON).
 *  Миграция v1/v2 → v3: style 'sparkling'/'fortified'/'sweet' разложены
 *  на цвет-основу + флаги sparkling/fortified; сладость теперь шкала в «Рту». */
function normalizeRecord(r: TastingRecord): TastingRecord {
  const safeStr = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
  /** Легаси-поля ручных ползунков не должны утекать в новые записи. */
  const stripLegacyNoseFields = (nose: TastingRecord['nose'] | undefined): TastingRecord['nose'] => {
    if (!nose) return createEmptyTasting().nose;
    const clone = { ...nose } as unknown as Record<string, unknown>;
    delete clone.fruitLevel;
    delete clone.mineralLevel;
    return clone as unknown as TastingRecord['nose'];
  };
  const rawStyle: string | null = (r.identity?.style ?? null) as string | null;
  let style = (r.identity?.style ?? null) as TastingRecord['identity']['style'];
  let sparkling = r.identity?.sparkling === true;
  let fortified = r.identity?.fortified === true;
  if (rawStyle === 'sparkling') {
    style = 'white';
    sparkling = true;
  } else if (rawStyle === 'fortified') {
    style = 'red';
    fortified = true;
  } else if (rawStyle === 'sweet') {
    style = 'white'; // цвет утерян старой схемой — чаще всего сладкие белые; правится в Титуле
  }
  return {
    schemaVersion: TASTING_SCHEMA_VERSION,
    id: r.id,
    mode: r.mode === 'sommelier-pro' ? 'sommelier-pro' : 'wset3',
    createdAt: safeStr(r.createdAt, new Date().toISOString()),
    updatedAt: safeStr(r.updatedAt, new Date().toISOString()),
    draft: Boolean(r.draft),
    /* v18: окно фото «на карточке» выживает только при живом id фото. */
    cardPhotoId:
      typeof r.cardPhotoId === 'string' && Array.isArray(r.photos) && r.photos.some((p) => p?.id === r.cardPhotoId)
        ? r.cardPhotoId
        : null,
    identity: {
      name: safeStr(r.identity?.name),
      producer: safeStr(r.identity?.producer),
      vintage: safeStr(r.identity?.vintage),
      style,
      sparkling,
      fortified,
      blind: r.identity?.blind === true,
      cellar: r.identity?.cellar === true,
      region: safeStr(r.identity?.region),
      country: safeStr(r.identity?.country),
      grapes: safeStr(r.identity?.grapes),
      abv: typeof r.identity?.abv === 'number' ? r.identity.abv : null,
      price: safeStr(r.identity?.price),
      dateTasted: safeStr(r.identity?.dateTasted, new Date().toISOString().slice(0, 10)),
      taster: safeStr(r.identity?.taster),
    },
    eye: { ...r.eye },
    nose: {
      ...stripLegacyNoseFields(r.nose),
      aromas: r.nose?.aromas ?? {},
      faults: r.nose?.faults ?? [],
      customTags: Array.isArray(r.nose?.customTags) ? r.nose.customTags : [],
    },
    palate: {
      ...r.palate,
      balance: {
        verdict: r.palate?.balance?.verdict ?? null,
        issues: Array.isArray(r.palate?.balance?.issues) ? r.palate.balance.issues : [],
        note: safeStr(r.palate?.balance?.note),
      },
    },
    conclusion: { ...r.conclusion },
    media: {
      image: safeStr(r.media?.image),
      emojis: Array.isArray(r.media?.emojis) ? r.media.emojis : [],
      gastronomy: Array.isArray(r.media?.gastronomy) ? r.media.gastronomy : [],
      notes: safeStr(r.media?.notes),
    },
    photos: Array.isArray(r.photos) ? r.photos : [],
  };
}
