/**
 * Функциональный тест v17: кольцо баланса + спиртомер.
 *  • effectiveAlcoholOf: калибр выводится из ABV (≤10.5 low / <14 medium / 14+ high),
 *    без ABV — ручной фолбэк;
 *  • вклад «алкоголь» в Тело считается от эффективного калибра;
 *  • rankAxesForDisplay: ранжирование по убыванию, Сладость/Минеральность —
 *    всегда «0.0» (не «н/о»), честное н/о — в самом низу;
 *  • аномалия abv-mismatch снята (спорить больше нечему);
 *  • шкала интеграции переименована: «Гармоничен» → «Согревает» (значение
 *    harmonious в записях сохранено);
 *  • EN-словарь v17.
 * Запуск: npx esbuild scripts/test-v17-ring.ts --bundle --platform=node --format=cjs --outfile=/tmp/test-v17.cjs && node /tmp/test-v17.cjs
 */
/* In-memory localStorage-заглушка — до импортов db-слоя. */
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

import { computeStructuralProfile, effectiveAlcoholOf, type ProfileAxis } from '@/engine/structuralProfile';
import { detectAnomalies } from '@/engine/anomalyDetector';
import { rankAxesForDisplay } from '@/components/visualizers/RingGauge';
import { ALCOHOL_FEEL_OPTS } from '@/lib/catalog';
import { T, setTrLang } from '@/lib/tr';
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

/* ── Эффективный калибр из ABV ────────────────────────────────────────────── */
setTrLang('ru');
const base = createEmptyTasting('sommelier-pro');

const abvOf = (abv: number | null, alcohol: 'low' | 'medium' | 'high' | null = null) => ({
  ...base,
  identity: { ...base.identity, abv },
  palate: { ...base.palate, alcohol },
});

check('ABV 10.5 → низкий', effectiveAlcoholOf(abvOf(10.5)) === 'low');
check('ABV 11 → средний', effectiveAlcoholOf(abvOf(11)) === 'medium');
check('ABV 13.9 → средний', effectiveAlcoholOf(abvOf(13.9)) === 'medium');
check('ABV 14 → высокий', effectiveAlcoholOf(abvOf(14)) === 'high');
check('ABV 20 (креплёное) → высокий', effectiveAlcoholOf(abvOf(20)) === 'high');
check('без ABV → ручной фолбэк (high)', effectiveAlcoholOf(abvOf(null, 'high')) === 'high');
check('без ABV и без выбора → null', effectiveAlcoholOf(abvOf(null)) === null);

/* Вклад в Тело: ABV 14% + Тело среднее → «алкоголь: высокий +1.5». */
const recBody = {
  ...base,
  identity: { ...base.identity, abv: 14 },
  palate: { ...base.palate, body: 'medium' as const },
};
const profBody = computeStructuralProfile(recBody);
const bodyAxis = profBody.axes.find((a) => a.key === 'body');
const alcContrib = bodyAxis?.contributions.find((c) => c.label.startsWith('алкоголь'));
check('Тело: вклад алкоголя от ABV-калибра', !!alcContrib && alcContrib.label.includes('высокий') && alcContrib.delta === 1.5, JSON.stringify(alcContrib));

/* ── Ранжирование осей ────────────────────────────────────────────────────── */
const ax = (key: string, value: number, assessed: boolean): ProfileAxis =>
  ({
    key,
    label: key,
    value,
    contributions: assessed ? [{ label: 'база', delta: value }] : [],
  }) as ProfileAxis;

/* Бароло: сладость оценена честным нулём, минеральность не заполнена. */
const barolo: ProfileAxis[] = [
  ax('acidity', 8.5, true),
  ax('tannins', 9.0, true),
  ax('body', 8.5, true),
  ax('sweetness', 0, true),
  ax('minerality', 0, false),
  ax('fruit', 9.2, true),
];
const r1 = rankAxesForDisplay(barolo);
check(
  'ранжир: 9.2 → 9.0 → 8.5 → 8.5 → 0.0 → 0.0',
  JSON.stringify(r1.map((s) => s.tag)) === JSON.stringify(['9.2', '9.0', '8.5', '8.5', '0.0', '0.0']),
  r1.map((s) => `${s.axis.key}:${s.tag ?? 'н/о'}`).join(' → '),
);
check('равные 8.5 = 8.5: школьный порядок (кислотность раньше тела)', r1[2]?.axis.key === 'acidity' && r1[3]?.axis.key === 'body');
check('прорези: последние две — сладость 0.0 и минеральность', r1[4]?.dead && r1[5]?.dead && !r1[3]?.dead);
check('минеральность без данных — 0.0, а не н/о', r1[5]?.tag === '0.0');

/* Белое: танины неприменимы — честное н/о в самом низу, сладость-0.0 выше. */
const white: ProfileAxis[] = [
  ax('acidity', 9.0, true),
  ax('tannins', 0, false),
  ax('body', 5.5, true),
  ax('sweetness', 0, true),
  ax('minerality', 7.0, true),
  ax('fruit', 8.0, true),
];
const r2 = rankAxesForDisplay(white);
check('белое: танины-н/о в самом низу', r2[r2.length - 1]?.axis.key === 'tannins' && r2[r2.length - 1]?.tag === null);
check('белое: сладость-0.0 стоит выше н/о', r2[r2.length - 2]?.axis.key === 'sweetness');
check('белое: арка сверху — кислотность первая', r2[0]?.axis.key === 'acidity');

/* Полностью пустой профиль: нет данных — н/о на месте, ничего не падает. */
const r3 = rankAxesForDisplay([ax('acidity', 0, false), ax('tannins', 0, false)]);
check('пустой профиль: н/о без ротации', r3.every((s) => s.tag === null));

/* ── Аномалия abv-mismatch снята ──────────────────────────────────────────── */
const recMismatch = abvOf(14, 'low');
const ids = detectAnomalies(recMismatch).map((a) => a.id);
check('нет аномалии abv-mismatch', !ids.includes('abv-mismatch'), ids.join(','));

/* ── Шкала интеграции: «Гармоничен» → «Согревает» ─────────────────────────── */
check('порядок шкалы: 5 сегментов', ALCOHOL_FEEL_OPTS.length === 5);
check('значение harmonious сохранено', ALCOHOL_FEEL_OPTS.some((o) => o.value === 'harmonious'));
check('третий сегмент — «Согревает»', ALCOHOL_FEEL_OPTS[2]?.label === 'Согревает', ALCOHOL_FEEL_OPTS[2]?.label);
check('слова шкалы: Спрятан/Вплетён/Согревает/Выпирает/Жгучий', ALCOHOL_FEEL_OPTS.map((o) => o.label).join('/') === 'Спрятан/Вплетён/Согревает/Выпирает/Жгучий');

/* ── EN-словарь v17 ───────────────────────────────────────────────────────── */
setTrLang('en');
check("EN: Согревает → Warms", T('Согревает') === 'Warms');
check("EN: Кольцо баланса → Balance ring", T('Кольцо баланса') === 'Balance ring');
check("EN: авто по ABV → auto from ABV", T('авто по ABV') === 'auto from ABV');
check("EN: Ощущения спирта → Spirit sensations", T('Ощущения спирта') === 'Spirit sensations');
check("EN: необязательно → optional", T('необязательно') === 'optional');
check("EN: н/о → n/a", T('н/о') === 'n/a');
setTrLang('ru');

/* ── Итог ─────────────────────────────────────────────────────────────────── */
console.log(`\n${fail === 0 ? '✅' : '❌'} v17 кольцо+спиртомер: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
