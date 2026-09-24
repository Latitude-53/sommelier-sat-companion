/**
 * TastingProvider — единый источник истины карты дегустации.
 *
 * Почему здесь нет stale-state (урок монолита): любое поле меняется только
 * через dispatch, производные (профиль, BLIC, нарратив, советы, экспорты)
 * всегда вычисляются useMemo от текущего состояния. Переключение баланса в
 * «сбалансированное» атомарно очищает список причин — старое значение не может
 * «уехать» в отчёт.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createEmptyTasting,
  TASTING_SCHEMA_VERSION,
  type ConclusionData,
  type EyeData,
  type MediaData,
  type NoseData,
  type PalateData,
  type PhotoAttachment,
  type TastingRecord,
  type WineIdentity,
} from '@/types/tasting';
import type { TastingMode, QualityLevel, AromaFamily } from '@/types/wset';
import type { WinePreset } from '@/lib/catalog';
import {
  backupAll,
  deleteCustomAroma,
  getTasting,
  listCustomAromas,
  loadSettings,
  saveCustomAroma,
  saveSettings,
  saveTasting as dbSave,
  type AppSettings,
} from '@/db';
import type { CustomAroma } from '@/types/tasting';
import { uuid } from '@/lib/uuid';
import { normalizeRecord } from '@/lib/migrate';
import { computeStructuralProfile, faultAnalysisOf, type StructuralProfile } from '@/engine/structuralProfile';
import { detectAnomalies, type Anomaly } from '@/engine/anomalyDetector';
import { adviseServing, type ServingAdvice } from '@/engine/servingAdvisor';

/* ── Действия ──────────────────────────────────────────────────────────────── */

export type TastingAction =
  | { type: 'patch-identity'; patch: Partial<WineIdentity> }
  | { type: 'patch-eye'; patch: Partial<EyeData> }
  | { type: 'patch-nose'; patch: Partial<NoseData> }
  | { type: 'patch-palate'; patch: Partial<PalateData> }
  | { type: 'patch-conclusion'; patch: Partial<ConclusionData> }
  | { type: 'patch-media'; patch: Partial<MediaData> }
  | { type: 'set-balance-verdict'; verdict: 'balanced' | 'unbalanced' | null }
  | { type: 'toggle-balance-issue'; issue: string }
  | { type: 'add-photo'; photo: PhotoAttachment }
  | { type: 'remove-photo'; photoId: string }
  | { type: 'set-card-photo'; photoId: string | null }
  | { type: 'set-mode'; mode: TastingMode }
  | { type: 'apply-preset'; preset: WinePreset }
  | { type: 'load'; record: TastingRecord }
  | { type: 'new'; mode: TastingMode; taster: string }
  | { type: 'saved' };

/** В режиме WSET L3 Pro-поля строго обнуляются (SAT 2021 их не признаёт).
 *  rimHex остаётся в обоих режимах: цвет каймы — легитимное визуальное наблюдение,
 *  не влияющее на экзаменационную категорию. */
function stripProFields(r: TastingRecord): TastingRecord {
  return {
    ...r,
    eye: { ...r.eye, legs: null, rimWidth: null },
    palate: { ...r.palate, acidityShape: null, tanninTexture: null, caudalieSeconds: null },
    conclusion: { ...r.conclusion, score100: null },
  };
}

function touch(r: TastingRecord): TastingRecord {
  return { ...r, updatedAt: new Date().toISOString() };
}

/** Качество, допустимое при фатальном пороке или стилистическом дефекте 2–3 •. */
const QUALITY_ALLOWED_FAULTY: readonly QualityLevel[] = ['faulty', 'poor', 'acceptable'];

/** Принудительные последствия пороков (ТЗ v42):
 *  фатальный порок (TCA/сероводород/VA) любого уровня либо стилистический
 *  дефект 2–3 • → оценка качества блокируется выше «Acceptable» и
 *  принудительно переводится в «Faulty», потенциал выдержки закрыт
 *  («Не подходит для выдержки»), статус чистоты — «С дефектом». */
function enforceFaultConsequences(r: TastingRecord): TastingRecord {
  if (!faultAnalysisOf(r).faultyMode) return r;
  const year = new Date().getFullYear();
  const c = r.conclusion;
  const quality = c.quality && QUALITY_ALLOWED_FAULTY.includes(c.quality) ? c.quality : 'faulty';
  const readiness = c.readiness === 'too-young' || c.readiness === 'drink-or-age' ? 'drink-now' : c.readiness;
  const windowFrom = c.windowFrom !== null ? Math.min(c.windowFrom, year) : year;
  const windowTo = c.windowTo !== null ? Math.min(c.windowTo, year) : year;
  /* Оценка зажата на «Acceptable»: 100-балльная шкала (Pro) не выше 83. */
  const score100 = c.score100 !== null ? Math.min(c.score100, 83) : null;
  return {
    ...r,
    nose: r.nose.condition === 'unclean' ? r.nose : { ...r.nose, condition: 'unclean' },
    conclusion: { ...c, quality, readiness, windowFrom, windowTo, score100 },
  };
}

/** Снятие навязанных последствий: если порок убрали, система снимает и то,
 *  что сама навязала вердикту (качество, готовность, окно, балл) — иначе
 *  в карточке остаётся противоречие «Чистое» + «Дефектное» на всю жизнь записи.
 *  Дегустатор переоценивает свободно, BLIC-подсказки остаются. */
function releaseFaultConsequences(r: TastingRecord): TastingRecord {
  return {
    ...r,
    conclusion: { ...r.conclusion, quality: null, readiness: null, windowFrom: null, windowTo: null, score100: null },
  };
}

/** Жизненный цикл порока: навязать при появлении, снять при исчезновении.
 *  Сравниваем prev/next — чистая функция, применяется во всех ветках редьюсера. */
function withFaultLifecycle(prev: TastingRecord, next: TastingRecord): TastingRecord {
  const wasFaulty = faultAnalysisOf(prev).faultyMode;
  const isFaulty = faultAnalysisOf(next).faultyMode;
  const settled = wasFaulty && !isFaulty ? releaseFaultConsequences(next) : next;
  return enforceFaultConsequences(settled);
}

export function tastingReducer(state: TastingRecord, action: TastingAction): TastingRecord {
  switch (action.type) {
    case 'patch-identity': {
      // Смена цвет-основы инвалидирует визуальные наблюдения: палитры «Глаза»
      // строго зависят от стиля, старое ядро/кайма красного не имеют смысла для белого.
      const styleChanged =
        action.patch.style !== undefined && action.patch.style !== state.identity.style;
      const eye = styleChanged
        ? { ...state.eye, color: null, coreHex: null, rimHex: null }
        : state.eye;
      return touch({ ...state, identity: { ...state.identity, ...action.patch }, eye });
    }
    case 'patch-eye':
      return touch({ ...state, eye: { ...state.eye, ...action.patch } });
    case 'patch-nose':
      return withFaultLifecycle(state, touch({ ...state, nose: { ...state.nose, ...action.patch } }));
    case 'patch-palate':
      return touch({ ...state, palate: { ...state.palate, ...action.patch } });
    case 'patch-conclusion':
      return withFaultLifecycle(state, touch({ ...state, conclusion: { ...state.conclusion, ...action.patch } }));
    case 'patch-media':
      return touch({ ...state, media: { ...state.media, ...action.patch } });

    case 'set-balance-verdict': {
      // ЯДРО ФИКСА STALE-STATE: выбор «сбалансированное» атомарно чистит причины.
      const issues = action.verdict === 'unbalanced' ? state.palate.balance.issues : [];
      return touch({
        ...state,
        palate: { ...state.palate, balance: { ...state.palate.balance, verdict: action.verdict, issues } },
      });
    }
    case 'toggle-balance-issue': {
      const current = state.palate.balance.issues;
      const issues = current.includes(action.issue as never)
        ? current.filter((i) => i !== action.issue)
        : [...current, action.issue as never];
      return touch({
        ...state,
        palate: { ...state.palate, balance: { ...state.palate.balance, issues } },
      });
    }

    case 'add-photo':
      return touch({ ...state, photos: [...state.photos, action.photo] });
    case 'remove-photo':
      return touch({
        ...state,
        photos: state.photos.filter((p) => p.id !== action.photoId),
        /* Снятое фото не может оставаться «на карточке». */
        cardPhotoId: state.cardPhotoId === action.photoId ? null : state.cardPhotoId,
      });
    case 'set-card-photo':
      return touch({ ...state, cardPhotoId: action.photoId });

    case 'set-mode': {
      const next = { ...state, mode: action.mode };
      return touch(action.mode === 'wset3' ? stripProFields(next) : next);
    }

    case 'apply-preset': {
      // Атомарно: пресет заполняет паспорт, глаз, нос и рот одним действием,
      // чтобы не плодить цепочку автосейвов и оставлять один Undo-шаг.
      // Флаги sparkling/fortified СБРАСЫВАЮТСЯ перед накатом пресета:
      // у большинства пресетов этих ключей просто нет в identity, и без
      // сброса «Тони Портвейн → Божоле» оставлял бы fortified: true (утечка).
      const presetted = touch({
        ...state,
        identity: {
          ...state.identity,
          sparkling: false,
          fortified: false,
          ...action.preset.identity,
        },
        eye: { ...state.eye, ...action.preset.eye },
        nose: { ...state.nose, ...action.preset.nose, customTags: state.nose.customTags },
        palate: { ...state.palate, ...action.preset.palate },
      });
      return withFaultLifecycle(state, presetted);
    }

    case 'load':
      // Загруженная карточка самостоятельна: навязать последствия её собственных
      // пороков, но НЕ сравнивать с предыдущей сессией (иначе снесём её вердикт).
      // normalizeRecord — страж «серого экрана»: легаси/битая запись приводится
      // к валидной схеме до того, как её увидит рендер (урок релиза v5).
      return enforceFaultConsequences(normalizeRecord(action.record, state.identity.taster));
    case 'new':
      return createEmptyTasting(action.mode, action.taster);
    case 'saved':
      return state;
  }
}

/* ── Контекст ──────────────────────────────────────────────────────────────── */

export interface TastingContextValue {
  record: TastingRecord;
  dispatch: (a: TastingAction) => void;
  mode: TastingMode;
  isPro: boolean;
  profile: StructuralProfile;
  anomalies: Anomaly[];
  serving: ServingAdvice;
  /** Глобальная библиотека своих дескрипторов (IndexedDB, переживает дегустации). */
  aromaLibrary: CustomAroma[];
  /** Слепки паспортов всех дегустаций погреба (v18) — память призрака-подсказки:
   *  страна/регион/сорт/производитель/название с частотами. */
  libIdentities: WineIdentity[];
  /** Создать свой дескриптор: в глобальную библиотеку + в текущую карточку. */
  addCustomAroma: (family: AromaFamily, label: string) => Promise<CustomAroma | null>;
  /** Удалить свой дескриптор из библиотеки и из текущей карточки. */
  removeCustomAroma: (id: string) => Promise<void>;
  /** Атомарное сохранение в IndexedDB + снятие draft. */
  persist: () => Promise<void>;
  /** Загрузить запись из погреба. */
  loadRecord: (id: string) => Promise<boolean>;
  /** Начать новую дегустацию (текущая автосейвится как черновик). */
  startNew: () => Promise<void>;
  /** Экспорт полного бэкапа. */
  exportBackup: () => Promise<string>;
  settings: AppSettings;
  setSettings: (s: AppSettings) => Promise<void>;
  storageKb: number;
}

const TastingContext = createContext<TastingContextValue | null>(null);

export function TastingProvider({ children }: { children: ReactNode }) {
  const [record, dispatch] = useReducer(tastingReducer, createEmptyTasting());
  const [settings, setSettingsState] = useReducer(
    (_: AppSettings, next: AppSettings) => next,
    { key: 'app', mode: 'wset3', tasterName: '' } as AppSettings,
  );
  const [aromaLibrary, setAromaLibrary] = useState<CustomAroma[]>([]);
  const [libIdentities, setLibIdentities] = useState<WineIdentity[]>([]);
  const bootstrapped = useRef(false);

  /* Самозалечение: теги карточки, отсутствующие в глобальной библиотеке
   * (легаси-карточки, бэкапы), пополняют её — и остаются навсегда. */
  const mergeTagsIntoLibrary = async (tags: { id: string; family: AromaFamily; label: string; createdAt?: string }[]): Promise<void> => {
    if (tags.length === 0) return;
    setAromaLibrary((lib) => {
      const known = new Set(lib.map((t) => t.id));
      const fresh = tags.filter((t) => !known.has(t.id));
      if (fresh.length === 0) return lib;
      const converted: CustomAroma[] = fresh.map((t) => ({
        id: t.id,
        family: t.family,
        label: t.label,
        createdAt: t.createdAt ?? new Date().toISOString(),
      }));
      for (const tag of converted) void saveCustomAroma(tag).catch(() => undefined);
      return [...lib, ...converted].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  };

  /* Бутстрап: настройки + библиотека дескрипторов + последний черновик */
  useEffect(() => {
    (async () => {
      try {
        const [s, library, { listTastings }] = await Promise.all([
          loadSettings(),
          listCustomAromas().catch(() => [] as CustomAroma[]),
          import('@/db'),
        ]);
        setSettingsState(s);
        setAromaLibrary(library);
        const all = await listTastings();
        setLibIdentities(all.map((t) => t.identity));
        const lastDraft = all.find((t) => t.draft);
        if (lastDraft) {
          dispatch({ type: 'load', record: lastDraft });
          void mergeTagsIntoLibrary(lastDraft.nose.customTags);
        } else {
          dispatch({ type: 'new', mode: s.mode, taster: s.tasterName });
        }
        bootstrapped.current = true;
      } catch {
        bootstrapped.current = true;
      }
    })();
     
  }, []);

  /* Автосохранение черновика (debounce 700 мс) */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!bootstrapped.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      dbSave(record).catch(() => undefined);
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [record]);

  /* Производные — ТОЛЬКО от актуального state (никаких сохранённых копий) */
  const profile = useMemo(() => computeStructuralProfile(record), [record]);
  const anomalies = useMemo(() => detectAnomalies(record), [record]);
  const serving = useMemo(() => adviseServing(record, profile), [record, profile]);

  const persist = async (): Promise<void> => {
    const finalized: TastingRecord = { ...record, schemaVersion: TASTING_SCHEMA_VERSION, draft: false };
    dispatch({ type: 'load', record: finalized });
    await dbSave(finalized);
    /* v18: паспорт сохранённой дегустации пополняет память призрака. */
    setLibIdentities((list) => [...list.filter((i) => i !== record.identity), finalized.identity]);
  };

  const loadRecord = async (id: string): Promise<boolean> => {
    const rec = await getTasting(id);
    if (!rec) return false;
    dispatch({ type: 'load', record: rec });
    void mergeTagsIntoLibrary(rec.nose.customTags);
    return true;
  };

  const startNew = async (): Promise<void> => {
    dispatch({ type: 'new', mode: record.mode, taster: record.identity.taster });
  };

  const exportBackup = async (): Promise<string> => {
    const payload = await backupAll();
    return JSON.stringify(payload, null, 2);
  };

  const setSettings = async (s: AppSettings): Promise<void> => {
    setSettingsState(s);
    await saveSettings(s);
  };

  /* ── Глобальные свои дескрипторы ─────────────────────────────────────── */

  const addCustomAroma = async (family: AromaFamily, label: string): Promise<CustomAroma | null> => {
    const clean = label.trim().replace(/\s+/g, ' ').slice(0, 28);
    if (!clean) return null;
    const tag: CustomAroma = { id: uuid(), family, label: clean, createdAt: new Date().toISOString() };
    try {
      await saveCustomAroma(tag);
    } catch {
      /* приватный режим — тег проживёт в сессии и карточке */
    }
    setAromaLibrary((lib) =>
      lib.some((t) => t.id === tag.id || t.label.toLowerCase() === tag.label.toLowerCase() && t.family === family)
        ? lib
        : [...lib, tag].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
    dispatch({
      type: 'patch-nose',
      patch: {
        customTags: record.nose.customTags.some((t) => t.id === tag.id)
          ? record.nose.customTags
          : [...record.nose.customTags, tag],
      },
    });
    return tag;
  };

  const removeCustomAroma = async (id: string): Promise<void> => {
    try {
      await deleteCustomAroma(id);
    } catch {
      /* localStorage-фолбэк уже почистил или недоступен */
    }
    setAromaLibrary((lib) => lib.filter((t) => t.id !== id));
    const tag = record.nose.customTags.find((t) => t.id === id);
    const aromas: Record<string, never> = { ...record.nose.aromas } as never;
    if (tag) delete aromas[id];
    dispatch({
      type: 'patch-nose',
      patch: {
        customTags: record.nose.customTags.filter((t) => t.id !== id),
        ...(tag ? { aromas: aromas as unknown as TastingRecord['nose']['aromas'] } : {}),
      },
    });
  };

  /* M1 (аудит v12): тяжёлые фото (base64 ~100+ КБ каждое) исключены из частого
   * цикла — их вклад считается только при смене набора фото, по готовому
   * sizeKb компрессора; текстовая часть stringify'ится без массива photos. */
  const photosKb = useMemo(
    () => record.photos.reduce((sum, p) => sum + (p.sizeKb || 0), 0),
    [record.photos],
  );
  const storageKb = useMemo(
    () => Math.round(JSON.stringify({ ...record, photos: [] }).length / 1024) + photosKb,
    [record, photosKb],
  );

  const value = useMemo<TastingContextValue>(
    () => ({
      record,
      dispatch,
      mode: record.mode,
      isPro: record.mode === 'sommelier-pro',
      profile,
      anomalies,
      serving,
      aromaLibrary,
      libIdentities,
      addCustomAroma,
      removeCustomAroma,
      persist,
      loadRecord,
      startNew,
      exportBackup,
      settings,
      setSettings,
      storageKb,
    }),
     
    [record, profile, anomalies, serving, aromaLibrary, libIdentities, settings, storageKb],
  );

  return <TastingContext.Provider value={value}>{children}</TastingContext.Provider>;
}

export function useTasting(): TastingContextValue {
  const ctx = useContext(TastingContext);
  if (!ctx) throw new Error('useTasting должен вызываться внутри TastingProvider');
  return ctx;
}
