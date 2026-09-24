/**
 * Советник по подаче: температура, декантация, бокал и окно питья.
 * Правила основаны на классической соммелье-практике и структуре вина.
 */
import type { TastingRecord } from '@/types/tasting';
import { computeStructuralProfile, type StructuralProfile } from './structuralProfile';

export interface ServingAdvice {
  /** Рекомендованный диапазон температур. */
  temperature: string;
  /** Декантация и подготовка. */
  decant: string;
  /** Бокал. */
  glass: string;
  /** Окно питья (строка). */
  window: string;
  /** Дополнительные заметки. */
  notes: string[];
}

export function adviseServing(record: TastingRecord, profileInput?: StructuralProfile): ServingAdvice {
  const profile = profileInput ?? computeStructuralProfile(record);
  const axis = (k: string): number => profile.axes.find((a) => a.key === k)?.value ?? 0;
  const { style, sparkling, fortified } = record.identity;
  const isSweet = record.palate.sweetness === 'sweet' || record.palate.sweetness === 'medium';
  const tannins = axis('tannins');
  const body = axis('body');
  const acidity = axis('acidity');
  const alcohol = record.palate.alcohol;
  const notes: string[] = [];

  let temperature = '10–14 °C';
  let glass = 'Универсальный бокал среднего объёма';
  let decant = 'Декантация не обязательна';

  if (fortified) {
    temperature = body >= 7 ? '15–18 °C' : '10–14 °C';
    glass = 'Малый бокал для креплёных (120–150 мл)';
  } else if (sparkling) {
    temperature = '6–8 °C';
    glass = 'Тюльпановый флейта-бокал (сохраняет перляж)';
    decant = 'Охладить 3+ часа в холодильнике; не декантировать';
  } else if (isSweet) {
    temperature = acidity >= 7 ? '6–9 °C' : '9–12 °C';
    glass = 'Малый десертный бокал';
  } else if (style === 'white' || style === 'orange') {
    if (body >= 7) {
      temperature = '11–13 °C';
      glass = 'Бокал для полнотелых белых (Burgundy-профиль)';
      if (style === 'orange') decant = 'Возможна короткая аэрация 15–30 минут';
    } else {
      temperature = acidity >= 7 ? '7–10 °C' : '9–11 °C';
      glass = 'Бокал для лёгких белых (суженный кверху)';
    }
  } else if (style === 'rose') {
    temperature = '8–11 °C';
    glass = 'Бокал для розе / лёгких белых';
  } else if (style === 'red') {
    if (tannins >= 7 || body >= 7.5) {
      temperature = '16–18 °C';
      glass = 'Крупный бокал Bordeaux-профиля (500+ мл)';
      decant = tannins >= 8 ? 'Декантировать 1–2 часа' : 'Аэрация 30–60 минут в декантере';
    } else if (tannins <= 3.5 && acidity >= 7) {
      temperature = '12–14 °C';
      glass = 'Бокал Burgundy-профиля (для ароматных лёгких красных)';
      decant = 'Достаточно 15–20 минут в бокале';
    } else {
      temperature = '14–17 °C';
      glass = 'Универсальный бокал для красных';
    }
    if (alcohol === 'high') notes.push('Крепость 14%+: подавайте у нижней границы диапазона, чтобы алкоголь не «горел».');
  }

  if (alcohol === 'high' && style !== 'red') {
    notes.push('Высокий алкоголь: слегка снизьте температуру подачи.');
  }
  if (profile.balance.computed === 'unbalanced') {
    notes.push('Вино пока не собрано: если это молодь — дайте время в бутылке, если старое — пейте без ожиданий.');
  }

  return { temperature, decant, glass, window: drinkingWindow(record), notes };
}

/** Окно питья: готовность + структура (танины/кислота/тело) → годы. */
export function drinkingWindow(record: TastingRecord): string {
  const c = record.conclusion;
  if (c.windowFrom !== null && c.windowTo !== null) {
    return `${c.windowFrom}–${c.windowTo}`;
  }
  const profile = computeStructuralProfile(record);
  const axis = (k: string): number => profile.axes.find((a) => a.key === k)?.value ?? 0;
  const structure = axis('tannins') * 0.45 + axis('acidity') * 0.35 + axis('body') * 0.2;

  const vintageYear = Number.parseInt(record.identity.vintage, 10);
  const currentYear = new Date().getFullYear();
  const now =
    record.conclusion.readiness === 'declining'
      ? 0
      : record.conclusion.readiness === 'drink-now'
        ? 1
        : record.conclusion.readiness === 'too-young'
          ? 4
          : 2;

  const span = Math.max(0, Math.round((structure - 3) * 1.2)) + now;
  const from = c.readiness === 'too-young' ? currentYear + 1 : currentYear;
  const to = currentYear + span;

  if (!Number.isNaN(vintageYear)) {
    return c.readiness === 'declining' ? `пик был ≈ ${Math.max(vintageYear + 3, currentYear - 2)} г.` : `${from}–${to} г.`;
  }
  return c.readiness === 'declining' ? 'на спаде — пить сейчас' : `пить до ≈ ${to} г. от урожая`;
}
