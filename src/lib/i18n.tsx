/**
 * I18N — двуязычная система RU / EN (v10).
 *
 * WSET SAT изначально британская квалификация, поэтому английский ложится
 * в структуру «1 к 1»: значения шкал — канонические SAT-слаги, у каждого
 * из которых есть официальный английский термин (Low / Medium(-) / Pronounced…).
 *
 * Архитектура перевода шкал:
 *  • RU — подписи каталога (catalog.ts) уже грамматически согласованы
 *    («Среднее» тело, «Средняя» кислотность), их не трогаем;
 *  • EN — плоская карта SCALE_EN: слаг значения → канонический термин.
 *    Коллизии слагов безопасны: в английском рода нет, «medium» везде «Medium».
 *
 * Язык живёт в localStorage (`sat-lang`) — переживает перезагрузки PWA.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setTrLang, tr } from './tr';

export type Lang = 'ru' | 'en';

/* ── Тип словаря: закрытые ключи → обращение по ключу никогда не undefined ── */

export interface I18nDict {
  appTitle: string;
  appSubtitle: string;
  modeWset: string;
  modePro: string;
  modeAriaLabel: string;
  langAriaLabel: string;
  cellar: string;
  export: string;
  save: string;
  toCellar: string;
  draftUnsaved: string;
  allSaved: string;
  tabs: { titul: string; eye: string; nose: string; palate: string; conclusion: string; media: string; summary: string };
  sections: { titul: string; eye: string; nose: string; palate: string; conclusion: string; media: string; summary: string };
  toast: { wsetOn: string; proOn: string };
  noteGen: {
    title: string;
    subtitle: string;
    includeLabel: string;
    optScore: string;
    optWindow: string;
    optServing: string;
    optGastro: string;
    rephrase: string;
    copy: string;
    copied: string;
    editableHint: string;
    styles: { academic: string; sommelier: string; shelf: string; social: string };
  };
  spoiler: { hypothesis: string; lifeArc: string; lifeArcHide: string };
}

/* ── Словарь интерфейса (хром приложения) ─────────────────────────────────── */

export const I18N: Record<Lang, I18nDict> = {
  ru: {
    appTitle: 'Дегустационный компаньон',
    appSubtitle: 'WSET® Level 3 SAT · Систематический подход к дегустации',
    modeWset: 'WSET',
    modePro: 'Сомелье Pro',
    modeAriaLabel: 'Режим дегустации',
    langAriaLabel: 'Язык интерфейса',
    cellar: 'Погреб',
    export: 'Экспорт',
    save: 'Сохранить',
    toCellar: 'В погреб',
    draftUnsaved: 'черновик не сохранён',
    allSaved: 'все изменения в погребе',
    tabs: {
      titul: 'Паспорт',
      eye: 'Глаз',
      nose: 'Нос',
      palate: 'Рот',
      conclusion: 'Итог',
      media: 'Ассоциации',
      summary: 'Сводка',
    },
    sections: {
      titul: 'Паспорт вина',
      eye: 'Глаз',
      nose: 'Нос',
      palate: 'Рот',
      conclusion: 'Итог',
      media: 'Ассоциации',
      summary: 'Сводка',
    },
    toast: {
      wsetOn: 'Режим «WSET»: быстрый проход по вину — Pro-фичи скрыты',
      proOn: 'Режим «Сомелье Pro»: авторские фичи активны',
    },
    noteGen: {
      title: 'Дегустационная заметка',
      subtitle: '4 стиля генерации · интерактивные модули карточки',
      includeLabel: 'Включать в текст:',
      optScore: 'Баллы / Вердикт',
      optWindow: 'Окно питья',
      optServing: 'Подача и бокал',
      optGastro: 'Гастропары',
      rephrase: 'Перефразировать',
      copy: 'Скопировать заметку',
      copied: 'Заметка скопирована в буфер!',
      editableHint: 'Текст можно править вручную прямо перед копированием.',
      styles: {
        academic: 'Академический (WSET)',
        sommelier: 'Ресторанный сомелье',
        shelf: 'Шелф-токер бутика',
        social: 'Telegram / Соцсети',
      },
    },
    spoiler: {
      hypothesis: 'Гипотеза сомелье (Pro)',
      lifeArc: 'Рассчитать потенциал выдержки и пика (Pro)',
      lifeArcHide: 'Скрыть анализ потенциала выдержки',
    },
  },
  en: {
    appTitle: 'Tasting Companion',
    appSubtitle: 'WSET® Level 3 Systematic Approach to Tasting',
    modeWset: 'WSET',
    modePro: 'Sommelier Pro',
    modeAriaLabel: 'Tasting mode',
    langAriaLabel: 'Interface language',
    cellar: 'Cellar',
    export: 'Export',
    save: 'Save',
    toCellar: 'To cellar',
    draftUnsaved: 'draft not saved',
    allSaved: 'all changes are in the cellar',
    tabs: {
      titul: 'Passport',
      eye: 'Appearance',
      nose: 'Nose',
      palate: 'Palate',
      conclusion: 'Conclusion',
      media: 'Associations',
      summary: 'Summary',
    },
    sections: {
      titul: 'Wine passport',
      eye: 'Appearance',
      nose: 'Nose',
      palate: 'Palate',
      conclusion: 'Conclusion',
      media: 'Associations',
      summary: 'Summary',
    },
    toast: {
      wsetOn: 'WSET mode: a quick wine pass — Pro features are hidden',
      proOn: 'Sommelier Pro mode: signature features are active',
    },
    noteGen: {
      title: 'Tasting note',
      subtitle: '4 generation styles · interactive card modules',
      includeLabel: 'Include in the text:',
      optScore: 'Score / verdict',
      optWindow: 'Drinking window',
      optServing: 'Serving & glass',
      optGastro: 'Food pairings',
      rephrase: 'Rephrase',
      copy: 'Copy the note',
      copied: 'Note copied to clipboard!',
      editableHint: 'You can edit the text manually right before copying.',
      styles: {
        academic: 'Academic (WSET)',
        sommelier: 'Restaurant sommelier',
        shelf: 'Shelf-talker',
        social: 'Telegram / Social',
      },
    },
    spoiler: {
      hypothesis: "Sommelier's hypothesis (Pro)",
      lifeArc: 'Calculate ageing potential and peak (Pro)',
      lifeArcHide: 'Hide the ageing analysis',
    },
  },
};

/* ── Канонические английские термины шкал SAT (плоская карта по слагу) ────── */

export const SCALE_EN: Record<string, string> = {
  /* Универсальные пятиуровневые */
  low: 'Low',
  'medium-': 'Medium (-)',
  medium: 'Medium',
  'medium+': 'Medium (+)',
  high: 'High',
  pronounced: 'Pronounced',
  /* Сладость */
  dry: 'Dry',
  'off-dry': 'Off-dry',
  sweet: 'Sweet',
  /* Тело */
  light: 'Light',
  full: 'Full',
  /* Послевкусие */
  short: 'Short',
  long: 'Long',
  /* Вид */
  pale: 'Pale',
  deep: 'Deep',
  clear: 'Clear',
  hazy: 'Hazy',
  /* Чистота */
  clean: 'Clean',
  unclean: 'Unclean',
  /* Развитие */
  youthful: 'Youthful',
  developing: 'Developing',
  'fully-developed': 'Fully developed',
  tired: 'Tired / past best',
  /* Ножки */
  watery: 'Watery',
  thin: 'Thin',
  thick: 'Thick',
  /* Перляж */
  delicate: 'Delicate',
  vigorous: 'Vigorous',
  fine: 'Fine',
  coarse: 'Coarse',
  creamy: 'Creamy',
  aggressive: 'Aggressive',
  /* Выраженность пороков */
  distinct: 'Distinct',
  heavy: 'Heavy',
  /* Вердикт качества */
  faulty: 'Faulty',
  poor: 'Poor',
  acceptable: 'Acceptable',
  good: 'Good',
  'very-good': 'Very good',
  outstanding: 'Outstanding',
  /* Готовность */
  'too-young': 'Too young',
  'drink-not-peak': 'Drink, not at peak',
  'drink-now': 'Drink now',
  'drink-or-age': 'Drink or age',
  declining: 'Declining',
  /* BLIC */
  strong: 'Strong',
  adequate: 'Adequate',
  weak: 'Weak',
  /* Баланс */
  balanced: 'Balanced',
  unbalanced: 'Unbalanced',
  /* Цвет-основа */
  white: 'White',
  rose: 'Rosé',
  red: 'Red',
  orange: 'Orange',
  /* Ширина каймы (Pro) */
  none: 'None',
  narrow: 'Narrow',
  wide: 'Wide',
};

/* ── Контекст языка ───────────────────────────────────────────────────────── */

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Словарь текущего языка. */
  t: I18nDict;
}

const LANG_KEY = 'sat-lang';
const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  /* Релиз v11: EN — язык по умолчанию (WSET SAT — британский стандарт);
     сохранённый выбор пользователя всегда сильнее дефолта. */
  const [lang, setLangState] = useState<Lang>(() => {
    let resolved: Lang = 'en';
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'ru' || saved === 'en') resolved = saved;
    } catch {
      /* приватный режим — стартуем с EN */
    }
    /* Глобальный слой перевода (движки/экспорты) синхронизируется ДО
       первого рендера детей — stale-переводов при старте нет. */
    setTrLang(resolved);
    return resolved;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* приватный режим — язык проживёт сессию */
    }
    document.documentElement.lang = lang;
    setTrLang(lang);
  }, [lang]);

  const setLang = (l: Lang): void => {
    /* Синхрон до setState: экспорты/тосты, вызванные в том же тике,
       уже переводятся новым языком. */
    setTrLang(l);
    setLangState(l);
  };

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: I18N[lang] }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang должен вызываться внутри LangProvider');
  return ctx;
}

/**
 * Перевод подписи опции шкалы: в EN берём канонический SAT-термин по слагу,
 * затем — полную карту tr.ts по русской подписи (цвета, текстуры, пороки…),
 * в RU возвращаем исходную (грамматически согласованную) подпись каталога.
 */
export function scaleOptionLabel(lang: Lang, option: { value: string; label: string }): string {
  if (lang !== 'en') return option.label;
  return SCALE_EN[option.value] ?? tr(lang, option.label);
}

/** Перевод произвольного SAT-слага (для точечных мест). */
export function scaleTerm(lang: Lang, value: string, fallback: string): string {
  if (lang !== 'en') return fallback;
  return SCALE_EN[value] ?? fallback;
}
