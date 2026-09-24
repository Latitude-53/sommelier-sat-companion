/**
 * Детектор аномалий дегустации — валидатор логической непротиворечивости.
 * Отлавливает классические ошибки дегустатора ДО того, как они уйдут в отчёт.
 */
import { DESCRIPTORS_BY_ID, faultBehavior } from '@/lib/catalog';
import { computeAromaSpectrum } from '@/engine/aromaEngine';
import type { TastingRecord } from '@/types/tasting';
import type { SatIntensity } from '@/types/wset';

export interface Anomaly {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  hint: string;
  section: 'eye' | 'nose' | 'palate' | 'conclusion';
}

const INTENSITY_RANK: Record<SatIntensity, number> = {
  low: 0,
  'medium-': 1,
  medium: 2,
  'medium+': 3,
  pronounced: 4,
};

export function detectAnomalies(record: TastingRecord): Anomaly[] {
  const out: Anomaly[] = [];
  const { nose, palate, conclusion, eye, identity } = record;

  /* 1. «Выдающееся», но финиш короткий или отмечен дисбаланс */
  if (conclusion.quality === 'outstanding') {
    const sec = palate.caudalieSeconds ?? (palate.finish === 'short' ? 2 : palate.finish === 'medium-' ? 5 : null);
    if (sec !== null && sec < 3) {
      out.push({
        id: 'outstanding-short-finish',
        severity: 'error',
        title: '«Выдающееся», но послевкусие короче 3 секунд',
        hint: 'По BLIC Outstanding требует длинного финиша. Перемерьте каудалии или смягчите вердикт.',
        section: 'conclusion',
      });
    }
    if (palate.balance.verdict === 'unbalanced') {
      out.push({
        id: 'outstanding-unbalanced',
        severity: 'error',
        title: '«Выдающееся» при отмеченном дисбалансе',
        hint: 'Баланс — первая буква BLIC. Дисбаланс блокирует «Выдающееся»: пересмотрите либо вердикт, либо раздел «Баланс».',
        section: 'conclusion',
      });
    }
  }

  /* 2. «Молодое», но кайма кирпичная/рыжая */
  const youngish = nose.development === 'youthful';
  const warmRim = eye.color === 'tawny' || eye.color === 'amber' || eye.color === 'brown';
  if (youngish && warmRim && (identity.style === 'red' || identity.style === null)) {
    out.push({
      id: 'young-brick-rim',
      severity: 'warning',
      title: 'Молодое вино с «возрастным» цветом',
      hint: 'Кирпичные/янтарные тона обычно говорят о развитии. Проверьте цвет или стадию развития.',
      section: 'eye',
    });
  }

  /* 3. Слабая интенсивность, но 9+ дескрипторов */
  if (nose.intensity && INTENSITY_RANK[nose.intensity] <= 1) {
    const count = Object.keys(nose.aromas).length;
    if (count >= 9) {
      out.push({
        id: 'low-intensity-many-aromas',
        severity: 'warning',
        title: `Слабая интенсивность, но отмечено ${count} ароматов`,
        hint: 'Девять и более дескрипторов обычно дают medium+ и выше. Снимите часть отметок или поднимите интенсивность.',
        section: 'nose',
      });
    }
  }

  /* 4. «Чистое», но есть дефекты */
  const faultish = nose.faults.length > 0;
  if (nose.condition === 'clean' && faultish) {
    out.push({
      id: 'clean-with-faults',
      severity: 'error',
      title: 'Статус «Чистое», но дефекты отмечены',
      hint: `Отмечено: ${nose.faults.map((f) => f.type.toUpperCase()).join(', ')}. Либо снимите дефекты, либо смените статус на «С дефектом».`,
      section: 'nose',
    });
  }
  if (nose.condition === 'unclean' && !faultish) {
    out.push({
      id: 'unclean-no-faults',
      severity: 'info',
      title: '«С дефектом», но конкретный дефект не указан',
      hint: 'Уточните тип дефекта (TCA, редукция, окисление…) — иначе вердикт Faulty будет неаргументированным.',
      section: 'nose',
    });
  }

  /* 5. Сахар без фруктового якоря (ось фруктовости — авто из спектра колеса) */
  const sweetBase: Record<string, number> = { dry: 0, 'off-dry': 2, medium: 6, sweet: 8, 'medium-dry': 4, 'medium-sweet': 6 };
  const sweetVal = palate.sweetness ? sweetBase[palate.sweetness] ?? 0 : 0;
  const spectrum = computeAromaSpectrum(record);
  if (sweetVal >= 6 && spectrum.fruitLevel < 4) {
    out.push({
      id: 'sugar-unanchored',
      severity: 'warning',
      title: 'Сахар без фруктового якоря',
      hint: `Сенсорная сила фруктов P_F ${spectrum.fruitLevel}/10 (< 4) при ощутимой сладости — классический дисбаланс. Отметьте фруктовые дескрипторы или поднимите «Интенсивность вкуса» в «Рту».`,
      section: 'palate',
    });
  }

  /* 5b. Стилистический дефект на 1 • — нейтральная терруарная подсказка */
  const stylisticLight = nose.faults.filter(
    (f) => faultBehavior(f.type) === 'stylistic' && f.severity === 'light',
  );
  const hasHeavyOrFatal = nose.faults.some(
    (f) => faultBehavior(f.type) === 'fatal' || f.severity !== 'light',
  );
  if (stylisticLight.length > 0 && !hasHeavyOrFatal) {
    out.push({
      id: 'terroir-style-hint',
      severity: 'info',
      title: 'Возможная терруарная стилистика',
      hint: `${stylisticLight.map((f) => f.type.toUpperCase()).join(', ')} на 1 • — не обязательно дефект: животные/серные тона в лёгкой степени бывают стилистикой хозяйства. Вердикт качества не блокируется.`,
      section: 'nose',
    });
  }

  /* 6. ABV и уровень алкоголя (v17: правило снято) — калибр теперь выводится
     из ABV автоматически (effectiveAlcoholOf), спорить больше нечему: ручной
     выбор существует только для карточек без крепости. */

  /* 7. Игристое без перляжа */
  if (identity.sparkling && !eye.perlage) {
    out.push({
      id: 'sparkling-no-perlage',
      severity: 'info',
      title: 'Игристое без описания перляжа',
      hint: 'Для игристых WSET ждёт наблюдения о пузырьках и муссе.',
      section: 'eye',
    });
  }

  /* 8. Минеральные дескрипторы, но ось минеральности не отражена нигде */
  const hasMineralDesc = Object.keys(nose.aromas).some((id) => DESCRIPTORS_BY_ID.get(id)?.mineral);
  if (hasMineralDesc && palate.finishAccent !== 'mineral' && !nose.note && !record.media.notes) {
    out.push({
      id: 'mineral-unconfirmed',
      severity: 'info',
      title: 'Минеральные ароматы без подтверждения в финише/заметках',
      hint: 'Ось «Минеральность» усилится, если отметить минеральный акцент финиша или добавить каменистые тона в заметки.',
      section: 'nose',
    });
  }

  /* 9. Красное с высокими танинами и лёгким телом (редко, но возможно) */
  if (palate.tanninLevel === 'high' && palate.body === 'light') {
    out.push({
      id: 'tannin-body-mismatch',
      severity: 'info',
      title: 'Высокие танины при лёгком теле',
      hint: 'Бывает (Неббиоло, Блауфренкиш в холодных годах), но чаще это ошибка калибровки. Перепроверьте.',
      section: 'palate',
    });
  }

  /* 10. Детектор аномалий эволюции: пирамида P/S/T против поля «Развитие» */
  if (spectrum.evolutionMatch === 'mismatch' && spectrum.activeFamilies > 0) {
    const youngish = nose.development === 'youthful';
    out.push({
      id: 'evolution-mismatch',
      severity: 'warning',
      title: youngish
        ? '«Молодое» вино, но в букете третичные тона'
        : 'Стадия развития не совпадает с индексом эволюции',
      hint: youngish
        ? `Индекс эволюции ${(spectrum.evolutionIndex * 100).toFixed(0)}% при «Молодом»: трюфель, кожа, орех или оксидативность намекают на развитие. Проверьте «Развитие» или сектор «Выдержка».`
        : `Индекс эволюции ${(spectrum.evolutionIndex * 100).toFixed(0)}% — третичные тона почти не выражены для выбранной стадии. Перепроверьте «Развитие» или колесо.`,
      section: 'nose',
    });
  }

  /* 11. Субъективное восприятие алкоголя против баланса (v14): спирт выпирает */
  if (palate.alcoholFeel === 'protruding' || palate.alcoholFeel === 'burning') {
    out.push({
      id: 'alcohol-protruding',
      severity: 'warning',
      title: palate.alcoholFeel === 'burning' ? 'Спирт жгучий — горячий дисбаланс' : 'Алкоголь выпирает над фруктом',
      hint:
        palate.alcoholFeel === 'burning'
          ? 'Жгучий спирт глушит вкус и финиш — классический горячий дисбаланс. Проверьте кислотность/фруктовое ядро, температуру подачи или смягчите ожидания в вердикте.'
          : 'Спиртовая волна вылезает над фруктом: у гармоничного вина алкоголь держится внутри вкуса. Проверьте калибровку «Алкоголя» и фруктовость в «Рту».',
      section: 'palate',
    });
  }

  /* 11b. Жгучий спирт при низком ABV — калибровочная сверка */
  if (palate.alcoholFeel === 'burning' && identity.abv !== null && identity.abv < 13) {
    out.push({
      id: 'burning-low-abv',
      severity: 'info',
      title: `Жгучий спирт при ABV ${identity.abv}%`,
      hint: 'Такое бывает у горячих урожаев и перегретых подач, но чаще это калибровка: тёплое вино показывает спирт резче. Попробуйте охладить и перепроверить.',
      section: 'palate',
    });
  }

  /* 11c. Высокий ABV, но спирт спрятан — добрая примета плотного вина */
  if (palate.alcoholFeel === 'hidden' && identity.abv !== null && identity.abv >= 15) {
    out.push({
      id: 'hidden-high-abv',
      severity: 'info',
      title: `Высокий ABV ${identity.abv}%, но спирт спрятан`,
      hint: 'Густота, экстракт и (часто) сахар держат алкоголь в тени — признак концентрации. Стоит отметить эту интеграцию в заметке.',
      section: 'palate',
    });
  }

  return out;
}
