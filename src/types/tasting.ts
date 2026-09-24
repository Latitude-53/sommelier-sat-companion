/**
 * Полная типизация карточки дегустации.
 * Карта — единственный источник истины: движки (профиль, нарратив, аномалии,
 * советы) — чистые функции от неё; экспорты сериализуют её производные.
 */
import type {
  AromaFamily,
  AromaSelection,
  AcidityShape,
  BalanceIssue,
  BalanceVerdict,
  BlicKey,
  BlicRating,
  Clarity,
  Condition,
  Development,
  FaultSeverity,
  FaultType,
  FinishAccent,
  AlcoholFeel,
  LegsProfile,
  PerlageIntensity,
  PhotoRole,
  QualityLevel,
  Readiness,
  SatAcidity,
  SatAlcohol,
  SatBody,
  SatFinish,
  SatIntensity,
  Sweetness,
  TastingMode,
  TanninTexture,
  VisualIntensity,
  WineColor,
  WineStyle,
} from './wset';
import { uuid } from '@/lib/uuid';

/** Сжатая фотография (после клиентского пайплайна компрессии). */
export interface PhotoAttachment {
  id: string;
  role: PhotoRole;
  /** data:image/webp|jpeg;base64,… */
  dataUrl: string;
  width: number;
  height: number;
  /** Размер в килобайтах (после сжатия). */
  sizeKb: number;
}

/** Паспорт вина (раздел «Титул»). */
export interface WineIdentity {
  name: string;
  producer: string;
  /** Винтаж (год) — строкой, допускается NV. */
  vintage: string;
  /** Цвет-основа: белое/розе/красное/оранжевое. */
  style: WineStyle | null;
  /** Игристое (перляж, флейта) — независимый флаг: бывает любой цвет. */
  sparkling: boolean;
  /** Креплёное (порт, херес) — независимый флаг. */
  fortified: boolean;
  /** Слепая дегустация (v18, шаг 1 «Что в бокале»). */
  blind: boolean;
  /** Из погреба (v18, шаг 1 «Что в бокале»). */
  cellar: boolean;
  region: string;
  country: string;
  /** Сортовой состав. */
  grapes: string;
  /** Крепость ABV, % об. */
  abv: number | null;
  price: string;
  /** Дата дегустации, ISO yyyy-mm-dd. */
  dateTasted: string;
  /** Имя дегустатора / сомелье. */
  taster: string;
}

/** Данные раздела «Глаз». */
export interface EyeData {
  clarity: Clarity | null;
  intensity: VisualIntensity | null;
  /** Цветовая категория WSET (единственный источник цвета в режиме wset3). */
  color: WineColor | null;
  /** HEX ядра (Pro-режим: интерактивный диск). */
  coreHex: string | null;
  /** HEX каймы (Pro-режим). */
  rimHex: string | null;
  /** Ширина каймы (Pro-режим). */
  rimWidth: 'none' | 'narrow' | 'medium' | 'wide' | null;
  /** Ножки/вязкость — только Pro-режим. */
  legs: LegsProfile | null;
  /** Перляж — только для игристых. */
  perlage: PerlageData | null;
  note: string;
}

/** Перляж игристого вина. */
export interface PerlageData {
  intensity: PerlageIntensity | null;
  bubbleSize: 'fine' | 'medium' | 'coarse' | null;
  mousse: 'creamy' | 'light' | 'aggressive' | null;
}

/** Зарегистрированный дефект. */
export interface FaultRecord {
  type: FaultType;
  severity: FaultSeverity;
}

/** Пользовательский дескриптор колеса: живёт в конкретном семействе,
 *  уровень выраженности хранится в aromas по тому же id. */
export interface NoseCustomTag {
  id: string;
  family: AromaFamily;
  label: string;
  /** Дата создания (есть у тегов из глобальной библиотеки). */
  createdAt?: string;
}

/** Глобальный пользовательский дескриптор: хранится в IndexedDB вне карточек
 *  и доступен во всех будущих дегустациях (ТЗ §1). */
export interface CustomAroma {
  id: string;
  family: AromaFamily;
  label: string;
  createdAt: string;
}

/** Данные раздела «Нос». */
export interface NoseData {
  condition: Condition | null;
  faults: FaultRecord[];
  intensity: SatIntensity | null;
  development: Development | null;
  /** Выбранные дескрипторы колеса: id → уровень. */
  aromas: AromaSelection;
  /** Пользовательские дескрипторы (свои теги), привязанные к семействам. */
  customTags: NoseCustomTag[];
  note: string;
}

/** Состояние баланса. При verdict='balanced' поле issues всегда пустое —
 *  это структурно исключает stale-state в экспортах. */
export interface BalanceState {
  verdict: BalanceVerdict | null;
  issues: BalanceIssue[];
  note: string;
}

/** Данные раздела «Рот». */
export interface PalateData {
  sweetness: Sweetness | null;
  /** Форма волны кислотности — Pro-режим. */
  acidityShape: AcidityShape | null;
  acidity: SatAcidity | null;
  tanninLevel: SatAcidity | null;
  /** Матрица текстуры танинов — Pro-режим. */
  tanninTexture: TanninTexture | null;
  alcohol: SatAlcohol | null;
  /** Субъективное восприятие спирта — v14 («спрятан»…«жгучий»). */
  alcoholFeel: AlcoholFeel | null;
  /** Быстрые чипы-ощущения спирта (v14), значения — ключи ALCOHOL_PERCEPTION_OPTS. */
  alcoholNotes: string[];
  body: SatBody | null;
  flavourIntensity: SatIntensity | null;
  /** Длина послевкусия. */
  finish: SatFinish | null;
  /** Замер каудалиеметра (Pro-режим), секунд. */
  caudalieSeconds: number | null;
  finishAccent: FinishAccent | null;
  balance: BalanceState;
  note: string;
}

/** Оценки BLIC по компонентам. */
export type BlicScores = Partial<Record<BlicKey, BlicRating>>;

/** Данные раздела «Итог». */
export interface ConclusionData {
  blic: BlicScores;
  quality: QualityLevel | null;
  /** Готовность к употреблению. */
  readiness: Readiness | null;
  /** Окно питья: от/до (год), вычисляется советником, правится вручную. */
  windowFrom: number | null;
  windowTo: number | null;
  /** 100-балльная шкала Parker/CMS — только Pro-режим. */
  score100: number | null;
  note: string;
}

/** Данные раздела «Медиа». */
export interface MediaData {
  /** Ассоциативный образ (свободный текст). */
  image: string;
  /** Эмодзи-теги образа. */
  emojis: string[];
  /** Гастрономические пары. */
  gastronomy: string[];
  /** Свободные заметки (также сканируются на минеральные маркеры). */
  notes: string;
}

/** Версия схемы записи (для миграций и валидации бэкапа).
 *  v3: style стал цветом-основой (без sparkling/sweet/fortified в энъме),
 *  добавлены флаги sparkling/fortified; PhotoRole.label-back.
 *  v4: паспорт-компоновка v18 — флаги blind/cellar в identity и
 *  cardPhotoId на записи (фото, установленное «на карточке»). */
export const TASTING_SCHEMA_VERSION = 4;

/** Полная карточка дегустации. */
export interface TastingRecord {
  schemaVersion: typeof TASTING_SCHEMA_VERSION;
  id: string;
  mode: TastingMode;
  createdAt: string;
  updatedAt: string;
  /** Черновик (не попадает в основной список библиотеки). */
  draft: boolean;
  /** Фото, установленное «на карточке» (id из photos), либо null — окно скрыто. */
  cardPhotoId: string | null;
  identity: WineIdentity;
  eye: EyeData;
  nose: NoseData;
  palate: PalateData;
  conclusion: ConclusionData;
  media: MediaData;
  photos: PhotoAttachment[];
}

/** Пустая карточка (фабрика). */
export function createEmptyTasting(mode: TastingMode = 'wset3', taster = ''): TastingRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: TASTING_SCHEMA_VERSION,
    id: uuid(),
    mode,
    createdAt: now,
    updatedAt: now,
    draft: true,
    cardPhotoId: null,
    identity: {
      name: '',
      producer: '',
      vintage: '',
      style: null,
      sparkling: false,
      fortified: false,
      blind: false,
      cellar: false,
      region: '',
      country: '',
      grapes: '',
      abv: null,
      price: '',
      dateTasted: now.slice(0, 10),
      taster,
    },
    eye: {
      clarity: null,
      intensity: null,
      color: null,
      coreHex: null,
      rimHex: null,
      rimWidth: null,
      legs: null,
      perlage: null,
      note: '',
    },
    nose: {
      condition: null,
      faults: [],
      intensity: null,
      development: null,
      aromas: {},
      customTags: [],
      note: '',
    },
    palate: {
      sweetness: null,
      acidityShape: null,
      acidity: null,
      tanninLevel: null,
      tanninTexture: null,
      alcohol: null,
      alcoholFeel: null,
      alcoholNotes: [],
      body: null,
      flavourIntensity: null,
      finish: null,
      caudalieSeconds: null,
      finishAccent: null,
      balance: { verdict: null, issues: [], note: '' },
      note: '',
    },
    conclusion: {
      blic: {},
      quality: null,
      readiness: null,
      windowFrom: null,
      windowTo: null,
      score100: null,
      note: '',
    },
    media: { image: '', emojis: [], gastronomy: [], notes: '' },
    photos: [],
  };
}
