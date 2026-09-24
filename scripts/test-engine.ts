/**
 * Числовая верификация сенсорного процессора v3 (ТЗ §6 — чек-лист).
 * Запуск: npx esbuild scripts/test-engine.ts --bundle --platform=node
 *         --alias:@=./src --outfile=scripts/.test-engine.mjs && node scripts/.test-engine.mjs
 */
import { createEmptyTasting } from '@/types/tasting';
import type { AromaSelection } from '@/types/wset';
import { computeAromaSpectrum, sensoryPowerOf } from '@/engine/aromaEngine';
import { computeStructuralProfile } from '@/engine/structuralProfile';
import { palateHypothesisOf } from '@/engine/palateHypothesis';

let failed = 0;
function check(name: string, actual: number | string | null, expected: number | string | null, ok: (a: number, e: number) => boolean = (a, e) => Math.abs(a - (e as number)) < 0.051): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    const pass = ok(actual, expected);
    console.log(`${pass ? '✓' : '✗ FAIL'} ${name}: ${actual} (ожидалось ${expected})`);
    if (!pass) failed++;
  } else {
    const pass = actual === expected;
    console.log(`${pass ? '✓' : '✗ FAIL'} ${name}: ${JSON.stringify(actual)} (ожидалось ${JSON.stringify(expected)})`);
    if (!pass) failed++;
  }
}

/* ── Юнит-тесты формулы P_F ── */
console.log('── Формула сенсорной силы P_F ──');
check('A(•••) якорь', sensoryPowerOf([3], null), 7.6);
check('A(•) якорь', sensoryPowerOf([1], null), 3.4);
check('A(••) якорь', sensoryPowerOf([2], null), 5.6);
check('••• + • → 7.6+0.71', sensoryPowerOf([3, 1], null), 8.3);
check('модуляция pronounced ×1.15', sensoryPowerOf([3], 'pronounced'), 8.7); // 7.6*1.15=8.74 → 8.7
check('модуляция low ×0.85', sensoryPowerOf([3], 'low'), 6.5); // 7.6*0.85=6.46 → 6.5

/* ── Тест Санджовезе (чек-лист §6 п.1) ── */
console.log('\n── ТЕСТ САНДЖОВЕЗЕ ──');
const sangio = createEmptyTasting('sommelier-pro');
sangio.nose.aromas = { 'red-cherry': 3 } as AromaSelection;
const s1 = computeStructuralProfile(sangio);
check('Вишня ••• → Фруктовость', s1.axes.find((a) => a.key === 'fruit')?.value ?? null, 7.6);

// добавляем дуб, травы, кожу, специи — фруктовость НЕ ПАДАЕТ
sangio.nose.aromas = {
  'red-cherry': 3,
  cedar: 1,
  vanilla: 1,
  leather: 1,
  'black-pepper': 1,
  violet: 1,
} as AromaSelection;
const s2 = computeStructuralProfile(sangio);
check('…+ 5 дескрипторов → Фруктовость держится', s2.axes.find((a) => a.key === 'fruit')?.value ?? null, 7.6, (a) => a >= 7.6);
check('…Сложность BLIC = strong (полифония)', s2.complexity.verdict, 'strong');
console.log(`  · H=${s2.complexity.entropy.toFixed(3)} K=${s2.complexity.families} HHI=${s2.spectrum.hhi.toFixed(3)}`);

/* ── Тест Риоха Gran Reserva (чек-лист §6 п.2) ── */
console.log('\n── ТЕСТ РИОХА GRAN RESERVA ──');
const rioja = createEmptyTasting('sommelier-pro');
rioja.identity.style = 'red';
rioja.nose.aromas = {
  prune: 3, // вяленый/плотный фрукт
  vanilla: 3, // дуб
  leather: 3, // третичность
} as AromaSelection;
const r1 = computeStructuralProfile(rioja);
const powerOf = (sp: typeof r1.spectrum, key: string) => sp.families.find((f) => f.key === key)?.power ?? 0;
check('Плотный фрукт ••• → P_fruit', powerOf(r1.spectrum, 'fruit'), 7.6);
check('Ваниль ••• → P_oak', powerOf(r1.spectrum, 'oak'), 7.6);
check('Кожа ••• → P_tertiary', powerOf(r1.spectrum, 'tertiary'), 7.6);
check('Регистр = Tertiary Depth', r1.spectrum.freshRegister, 'tertiary-depth');
const rHyp = palateHypothesisOf(rioja, r1.spectrum);
console.log(`  · Гипотеза: кислотность «${rHyp.acidity.tone}», танин «${rHyp.tannin.tone}», тело «${rHyp.body.tone}»`);
check('Гипотеза·танин структурный', rHyp.tannin.tone, 'Плотный, структурный каркас');
check('Гипотеза·кислотность сглаженная', rHyp.acidity.tone, 'Сглаженная, купольная, мягкая');
check('Гипотеза·тело плотное', rHyp.body.tone, 'Плотное, кремовое, обволакивающее');

/* ── Свежий минеральный профиль (Мозель) ── */
console.log('\n── ТЕСТ МОЗЕЛЬСКИЙ РИСЛИНГ ──');
const mosel = createEmptyTasting('sommelier-pro');
mosel.identity.style = 'white';
mosel.nose.aromas = { lemon: 2, 'green-apple': 1, flint: 2, 'wet-stone': 1 } as AromaSelection;
const m1 = computeStructuralProfile(mosel);
check('Регистр = Primary Crunch', m1.spectrum.freshRegister, 'primary-crunch');
check('Φ_fresh = 1.0', m1.spectrum.phiFresh, 1.0);
const mHyp = palateHypothesisOf(mosel, m1.spectrum);
check('Гипотеза·кислотность высокая', mHyp.acidity.tone, 'Высокая, вибрирующая, острая атака');
check('Гипотеза·тело лёгкое', mHyp.body.tone, 'Лёгкое, линейное, хрустящее');

/* ── Моно-фокус: один дескриптор ── */
const mono = createEmptyTasting('sommelier-pro');
mono.nose.aromas = { 'red-cherry': 2 } as AromaSelection;
const monoP = computeStructuralProfile(mono);
check('Один дескриптор → H=0, сложность weak', monoP.complexity.verdict, 'weak');
check('Один дескриптор → ось фруктов = 5.6', monoP.axes.find((a) => a.key === 'fruit')?.value ?? null, 5.6);

/* ── Оси строгого нуля ── */
check('Пустое колесо → Фруктовость 0', computeStructuralProfile(createEmptyTasting()).axes.find((a) => a.key === 'fruit')?.value ?? null, 0);

console.log(failed === 0 ? '\n═══ ВСЕ ТЕСТЫ ДВИЖКА ПРОЙДЕНЫ ═══' : `\n═══ ПРОВАЛЕНО: ${failed} ═══`);
process.exit(failed === 0 ? 0 : 1);
