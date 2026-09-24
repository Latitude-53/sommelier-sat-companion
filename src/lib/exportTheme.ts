/**
 * Темы экспортной визитки (v19, редизайн системы вывода).
 *
 * Одобрено пользователем на раунде «Редизайн-экспорта» (Task 24):
 *  • V1 «Слоновая кость» — классическая контр-этикетка с золотым контуром;
 *  • V3 «Бургундия»      — контр-этикетка бордо с шапкой-лентой и сеткой фактов;
 *  • V7 «Терруар»        — крафт-бумага, рубленый шрифт, чернильный штамп.
 *
 * Печать на визитке — «П4 · тиснение» (blind emboss): никаких цветов,
 * только свет и тень. Тихо, аккуратно и печатно.
 *
 * Выбор темы живёт в localStorage (`sat-card-theme`) — это настройка вывода,
 * а не данных карточки, поэтому схему дегустации не трогаем.
 */

export type CardThemeId = 'ivory' | 'burgundy' | 'terroir';

export interface CardTheme {
  id: CardThemeId;
  /** RU-название (единственный источник — EN через T()). */
  label: string;
  /** Пара цветов для чипа-превью в ExportModal. */
  swatch: [string, string];
  /** Цвет бумаги темы (фон визитки). */
  paper: string;
  /** Цвет чернил по умолчанию. */
  ink: string;
}

export const CARD_THEMES: CardTheme[] = [
  { id: 'ivory', label: 'Слоновая кость', swatch: ['#f4eedc', '#b08d3f'], paper: '#f4eedc', ink: '#33291d' },
  { id: 'burgundy', label: 'Бургундия', swatch: ['#7a2e35', '#fbf8f1'], paper: '#fbf8f1', ink: '#2b241a' },
  { id: 'terroir', label: 'Терруар', swatch: ['#d9c6a3', '#8a4a2e'], paper: '#d9c6a3', ink: '#3a2f20' },
];

const THEME_KEY = 'sat-card-theme';

export function isCardThemeId(v: string | null): v is CardThemeId {
  return v === 'ivory' || v === 'burgundy' || v === 'terroir';
}

/** Сохранённая тема (дефолт — «Слоновая кость», ближайшая к живой визитке «Бумага»). */
export function getCardTheme(): CardThemeId {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (isCardThemeId(raw)) return raw;
  } catch {
    /* приватный режим — дефолт */
  }
  return 'ivory';
}

export function setCardTheme(id: CardThemeId): void {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* приватный режим — тема проживёт сессию */
  }
}
