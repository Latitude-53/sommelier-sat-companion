/**
 * Общая логика паспорта вина (v18, компоновка «Три касания»).
 * Здесь живёт всё, что разделяют визитка, шаги и хронограф:
 * палитры-трио по цвету-основе, маппинг типа (тихое/игристое/креплёное)
 * на независимые флаги sparkling/fortified, призрак-подсказка
 * (bestMatch по памяти дегустаций) и возрастные характеры.
 */
import type { WineIdentity } from '@/types/tasting';
import type { WineStyle } from '@/types/wset';

/* ── Тип вина: три исхода из двух независимых флагов ───────────────────────── */

export type WineTypeKey = 'q' | 'p' | 'f';

/** Текущий тип по флагам (креплёное сильнее игристого — магазинная логика типа «порт»). */
export function typeOf(id: Pick<WineIdentity, 'sparkling' | 'fortified'>): WineTypeKey {
  if (id.fortified) return 'f';
  if (id.sparkling) return 'p';
  return 'q';
}

/** Патч флагов по выбранному типу (типы взаимоисключающие). */
export function typeFlags(t: WineTypeKey): Pick<WineIdentity, 'sparkling' | 'fortified'> {
  return { sparkling: t === 'p', fortified: t === 'f' };
}

/** Дефолтная крепость по типу (шаг 1 двигает ABV, как в одобренном макете). */
export const TYPE_ABV: Record<WineTypeKey, number> = { q: 14, p: 12, f: 20 };

export const ABV_MIN = 4;
export const ABV_MAX = 24;

/* ── Палитры визитки: трио полос + чернила по цвету-основе ─────────────────── */

export interface StyleTrio {
  trio: [string, string, string];
  ink: string;
  w: string;
  d: string;
}

export const STYLE_TRIO: Record<WineStyle, StyleTrio> = {
  red: { trio: ['#7a2e35', '#9a4a50', '#c59b4e'], ink: '#7a2e35', w: 'красное', d: 'Черри · слива' },
  white: { trio: ['#f2e3b8', '#ddc184', '#b3975f'], ink: '#7d6428', w: 'белое', d: 'Лимон · яблоко' },
  rose: { trio: ['#f0cfc0', '#e5a488', '#c9826a'], ink: '#8a4a34', w: 'розе', d: 'Клубника · лепестки' },
  orange: { trio: ['#e8c898', '#d99a4e', '#b57a32'], ink: '#7a4a12', w: 'оранжевое', d: 'Абрикос · шафран' },
};

/** Нейтральное трио, пока цвет-основа не выбран. */
export const IDLE_TRIO: StyleTrio = { trio: ['#3d5243', '#4a6252', '#c59b4e'], ink: '#6e6248', w: '', d: '' };

/** Слово типа для шапки визитки: «тихое/игристое/креплёное». */
export const TYPE_WORDS: Record<WineTypeKey, string> = { q: 'тихое', p: 'игристое', f: 'креплёное' };

/* ── Хронограф: возраст и характер ─────────────────────────────────────────── */

/** Возрастной характер вина (для пилюли линейки). */
export function ageCap(age: number): string {
  if (age < 5) return 'молодое';
  if (age < 10) return 'в расцвете';
  if (age < 20) return 'выдержанное';
  return 'старое';
}

/** Русская множественная форма: год/года/лет. */
export function pluralRu(n: number): string {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'лет';
  if (n1 > 1 && n1 < 5) return 'года';
  if (n1 === 1) return 'год';
  return 'лет';
}

/** Нижний предел линейки: глубже — уже археология. */
export const CHRONO_FLOOR = 1500;
/** Окно линейки, лет (одобрено на И10). */
export const CHRONO_WINDOW = 45;

/** 14 → «14,0» (визитка и степпер крепости). */
export function f1(x: number): string {
  return (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
}

/** ISO → «24.09.2026». */
export function ruDate(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
}

/* ── Призрак-подсказка: память дегустаций ──────────────────────────────────── */

/** Ключи памяти призрака: название/страна/регион/сорт/производитель. */
export type GhostKind = 'name' | 'country' | 'region' | 'grapes' | 'producer';

export interface GhostEntry {
  label: string;
  freq: number;
}

/**
 * Лучшее продолжение для введённого текста: только «начинается с…»,
 * победитель — по частоте, при равенстве — короче.
 */
export function bestGhostMatch(entries: GhostEntry[], value: string): GhostEntry | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  let best: GhostEntry | null = null;
  for (const e of entries) {
    const ln = e.label.toLowerCase();
    if (ln.startsWith(v) && ln !== v) {
      if (!best || e.freq > best.freq || (e.freq === best.freq && e.label.length < best.label.length)) {
        best = e;
      }
    }
  }
  return best;
}

/**
 * Частоты паспортных полей по всем дегустациям погреба (включая черновики —
 * автосейв делает Enter-обещание честным: введённое запомнится, даже если
 * дегустацию не сохранят в погреб вручную).
 */
export function ghostEntriesFor(
  identities: Pick<WineIdentity, GhostKind>[],
  kind: GhostKind,
): GhostEntry[] {
  const counts = new Map<string, number>();
  for (const id of identities) {
    const raw = id[kind];
    if (typeof raw !== 'string') continue;
    const label = raw.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, freq]) => ({ label, freq }))
    .sort((a, b) => b.freq - a.freq || a.label.localeCompare(b.label));
}
