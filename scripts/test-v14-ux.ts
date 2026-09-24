/**
 * Функциональный тест v14: динамический радар + тепло/интеграция алкоголя.
 * Запуск: npx esbuild scripts/test-v14-ux.ts --bundle --platform=node --format=cjs --outfile=/tmp/test-v14.cjs && node /tmp/test-v14.cjs
 */
/* In-memory localStorage-заглушка (Node не имеет localStorage; фолбэк db-слоя
   без неё теряет записи) — ставится ДО импортов db/миграции. */
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() {
    return mem.size;
  },
};

import { computeStructuralProfile, splitAxesByAssessment } from '@/engine/structuralProfile';
import { detectAnomalies } from '@/engine/anomalyDetector';
import { normalizeRecord } from '@/lib/migrate';
import { createEmptyTasting } from '@/types/tasting';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    pass++;
    console.log(`✓ ${name}${detail ? `: ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`✗ ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const base = (): ReturnType<typeof createEmptyTasting> => {
  const rec = createEmptyTasting();
  rec.identity.style = 'white';
  rec.nose.intensity = 'medium';
  rec.nose.condition = 'clean';
  /* Нос: фруктовые дескрипторы → ось fruit живая */
  rec.nose.aromas = { lemon: 2, grapefruit: 1 };
  rec.palate.acidity = 'high';
  rec.palate.body = 'medium-';
  rec.palate.flavourIntensity = 'medium';
  rec.palate.finish = 'medium';
  return rec;
};

/* ── 1. Динамический радар ── */
{
  const rec = base();
  const profile = computeStructuralProfile(rec);
  const { assessed, missing } = splitAxesByAssessment(profile.axes);

  check('радар·сладость не оценена', rec.palate.sweetness === null);
  check('радар·сладость вне паутины', missing.some((a) => a.key === 'sweetness'), `missing: ${missing.map((a) => a.key).join(',')}`);
  check('радар·минеральность вне паутины', missing.some((a) => a.key === 'minerality'), `missing: ${missing.map((a) => a.key).join(',')}`);
  check('радар·оценённых ≥ 3', assessed.length >= 3, `assessed: ${assessed.map((a) => a.key).join(',')}`);
  check('радар·полигон не содержит нулевых вершин', assessed.every((a) => a.contributions.length > 0));

  /* Сладость задана → ось возвращается в паутину */
  const rec2 = base();
  rec2.palate.sweetness = 'dry';
  const p2 = splitAxesByAssessment(computeStructuralProfile(rec2).axes);
  check('радар·сухое возвращает ось сладости', !p2.missing.some((a) => a.key === 'sweetness'));

  /* Минеральные дескрипторы + минеральный финиш → ось минеральности живая */
  const rec3 = base();
  rec3.nose.aromas = { lemon: 2, 'wet-stone': 2 };
  rec3.palate.finishAccent = 'mineral';
  const p3 = splitAxesByAssessment(computeStructuralProfile(rec3).axes);
  check('радар·минеральность возвращается', !p3.missing.some((a) => a.key === 'minerality'));

  /* Полностью пустая карточка → оценённых < 3 → плейсхолдер-ветка */
  const empty = splitAxesByAssessment(computeStructuralProfile(createEmptyTasting()).axes);
  check('радар·пустая карточка → < 3 осей', empty.assessed.length < 3, `assessed: ${empty.assessed.length}`);
}

/* ── 2. Тепло и интеграция: баланс ── */
{
  const rec = base();
  rec.palate.alcoholFeel = 'protruding';
  const balance = computeStructuralProfile(rec).balance;
  check('баланс·выпирает → заметка', balance.notes.some((n) => n.includes('выпирает')), balance.notes.join(' | '));

  const rec2 = base();
  rec2.palate.alcoholFeel = 'hidden';
  const b2 = computeStructuralProfile(rec2).balance;
  check('баланс·спрятан → заметка об интеграции', b2.notes.some((n) => n.includes('интегрирован')), b2.notes.join(' | '));

  const rec3 = base();
  rec3.palate.alcoholFeel = 'burning';
  const b3 = computeStructuralProfile(rec3).balance;
  check('баланс·жгучий → заметка', b3.notes.some((n) => n.includes('жжёт')), b3.notes.join(' | '));

  /* Вердикт не меняется (по договорённости: только заметки) */
  const recNoFeel = base();
  const recFeel = base();
  recFeel.palate.alcoholFeel = 'burning';
  const vNo = computeStructuralProfile(recNoFeel).balance.computed;
  const vFeel = computeStructuralProfile(recFeel).balance.computed;
  check('баланс·вердикт не меняется от ощущения', vNo === vFeel, `${vNo} === ${vFeel}`);
}

/* ── 3. Аномалии алкоголя ── */
{
  const rec = base();
  rec.palate.alcoholFeel = 'burning';
  rec.identity.abv = 12;
  const ids = detectAnomalies(rec).map((a) => a.id);
  check('аномалия·жгучий → warning', ids.includes('alcohol-protruding'));
  check('аномалия·жгучий при ABV<13 → info', ids.includes('burning-low-abv'), ids.join(','));

  const rec2 = base();
  rec2.palate.alcoholFeel = 'hidden';
  rec2.identity.abv = 15.5;
  const ids2 = detectAnomalies(rec2).map((a) => a.id);
  check('аномалия·спрятан при ABV≥15 → info', ids2.includes('hidden-high-abv'), ids2.join(','));

  const rec3 = base();
  rec3.palate.alcoholFeel = null;
  const ids3 = detectAnomalies(rec3).map((a) => a.id);
  check('аномалия·без ощущения тихо', !ids3.some((i) => i.startsWith('alcohol-') || i.includes('abv') || i.includes('hidden')), ids3.join(','));
}

/* ── 4. Миграция: новые поля переживают normalizeRecord ── */
{
  const rec = base();
  rec.palate.alcoholFeel = 'woven';
  rec.palate.alcoholNotes = ['warm-chest', 'lifts-fruit'];
  const round = normalizeRecord(JSON.parse(JSON.stringify(rec)));
  check('миграция·alcoholFeel сохранён', round.palate.alcoholFeel === 'woven', String(round.palate.alcoholFeel));
  check('миграция·alcoholNotes сохранены', JSON.stringify(round.palate.alcoholNotes) === JSON.stringify(['warm-chest', 'lifts-fruit']), JSON.stringify(round.palate.alcoholNotes));

  /* Старая запись без новых полей → дефолты, не крашится */
  const legacy = JSON.parse(JSON.stringify(base()));
  delete (legacy.palate as Record<string, unknown>).alcoholFeel;
  delete (legacy.palate as Record<string, unknown>).alcoholNotes;
  const norm = normalizeRecord(legacy);
  check('миграция·легаси → alcoholFeel null', norm.palate.alcoholFeel === null);
  check('миграция·легаси → alcoholNotes []', Array.isArray(norm.palate.alcoholNotes) && norm.palate.alcoholNotes.length === 0);

  /* Мусор в бэкапе отбрасывается белым списком */
  const junk = JSON.parse(JSON.stringify(base()));
  junk.palate.alcoholFeel = '<script>alert(1)</script>';
  junk.palate.alcoholNotes = ['evil-key', 'warm-chest', 42, null];
  const clean = normalizeRecord(junk);
  check('миграция·мусор feel → null', clean.palate.alcoholFeel === null);
  check('миграция·мусор notes отфильтрован', JSON.stringify(clean.palate.alcoholNotes) === JSON.stringify(['warm-chest']), JSON.stringify(clean.palate.alcoholNotes));
}

console.log(`\n${fail === 0 ? '✅' : '❌'} V14 UX: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
