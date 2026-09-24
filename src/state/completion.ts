/**
 * Заполненность разделов карты — для индикаторов навигации.
 */
import type { TastingRecord } from '@/types/tasting';
import type { AromaFamily } from '@/types/wset';
import { DESCRIPTORS_BY_ID } from '@/lib/catalog';

export type SectionKey = 'titul' | 'eye' | 'nose' | 'palate' | 'conclusion' | 'media' | 'summary';

export const SECTION_ORDER: SectionKey[] = [
  'titul',
  'eye',
  'nose',
  'palate',
  'conclusion',
  'media',
  'summary',
];

export const SECTION_META: Record<SectionKey, { label: string; icon: string }> = {
  titul: { label: 'Паспорт', icon: 'book' },
  eye: { label: 'Глаз', icon: 'eye' },
  nose: { label: 'Нос', icon: 'flower' },
  palate: { label: 'Рот', icon: 'wine' },
  conclusion: { label: 'Итог', icon: 'award' },
  media: { label: 'Ассоциации', icon: 'sparkles' },
  summary: { label: 'Сводка', icon: 'gauge' },
};

/** 0..1 заполненности раздела. */
export function sectionFill(key: SectionKey, r: TastingRecord): number {
  const filled = (...vals: (unknown | null | undefined)[]): number =>
    vals.filter((v) => v !== null && v !== undefined && v !== '').length;
  switch (key) {
    case 'titul':
      return Math.min(1, filled(r.identity.name, r.identity.producer, r.identity.vintage, r.identity.style, r.identity.region, r.identity.country, r.identity.grapes, r.identity.abv, r.identity.taster) / 6);
    case 'eye':
      return Math.min(1, filled(r.eye.clarity, r.eye.intensity, r.eye.color ?? r.eye.coreHex, r.eye.perlage) / 3);
    case 'nose':
      return Math.min(1, (filled(r.nose.condition, r.nose.intensity, r.nose.development) + Math.min(1, Object.keys(r.nose.aromas).length) / 5) / 4);
    case 'palate':
      return Math.min(1, filled(r.palate.sweetness, r.palate.acidity, r.palate.tanninLevel, r.palate.alcohol, r.palate.body, r.palate.finish, r.palate.balance.verdict) / 6);
    case 'conclusion':
      return Math.min(1, (filled(r.conclusion.quality, r.conclusion.readiness) + Object.keys(r.conclusion.blic).length / 4) / 3);
    case 'media':
      return Math.min(1, filled(r.media.image, r.media.gastronomy.length > 0, r.photos.length > 0) / 2);
    case 'summary':
      return filled(r.conclusion.quality) > 0 ? 1 : 0;
  }
}

/** Число задействованных семейств ароматов (BLIC · Complexity). */
export function familiesCount(r: TastingRecord): number {
  const set = new Set<AromaFamily>();
  for (const id of Object.keys(r.nose.aromas)) {
    const d = DESCRIPTORS_BY_ID.get(id);
    if (d) set.add(d.family as AromaFamily);
  }
  return set.size;
}
