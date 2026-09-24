/**
 * Числовая верификация ПАРАМЕТРИЧЕСКОЙ КИНЕТИКИ v9 + двойного балла + Q2 (BLIC).
 *
 * Модель v9 («В мире нет двух одинаковых бутылок»):
 *   P_pres = 1.5·T_shield + 1.2·A_spine + 1.4·S_shield + 1.6·Alc_shield + TextureBonus
 *   Fuel   = (max(1,fruit)·1.3 + max(1,body) + min(6, caud·0.32)) / 14
 *   L      = light? clamp((2+0.4·A+0.3·F)·M, 1.5, 4.5) : clamp((2.5+P·F)·M, 2, 60)
 *   Dumb Phase Valley — глубина от ТЕКСТУРЫ танина (хваткий/зернистый глубже,
 *   шелковистый мягче); ДВОЙНОЙ БАЛЛ S_today → S_zenith.
 *
 * Запуск: npx esbuild scripts/test-archetypes.ts --bundle --platform=node
 *         --alias:@=./src --outfile=scripts/.test-archetypes.mjs && node scripts/.test-archetypes.mjs
 */
import { createEmptyTasting, type TastingRecord } from '@/types/tasting';
import type { AromaSelection, BlicKey, BlicRating, TanninTexture } from '@/types/wset';
import { computeStructuralProfile, suggestQuality, faultAnalysisOf, finishSecondsOf } from '@/engine/structuralProfile';
import { calculateWineLifeArc, zenithAxesOf, type WineLifeArc } from '@/engine/wineLifeArc';

let failed = 0;
function check(name: string, actual: number | string | boolean | null, expected: number | string | boolean | null, tol = 0.051): void {
  const pass =
    typeof actual === 'number' && typeof expected === 'number'
      ? Math.abs(actual - expected) <= tol
      : actual === expected;
  console.log(`${pass ? '✓' : '✗ FAIL'} ${name}: ${JSON.stringify(actual)}${typeof expected === 'number' ? ` (ожидалось ~${expected})` : ` (ожидалось ${JSON.stringify(expected)})`}`);
  if (!pass) failed++;
}

const YEAR = new Date().getFullYear();

/** База Parker-баллов по вердикту (дублирует QUALITY_BASE_SCORE движка — ловит расхождение). */
const BASE: Record<string, number> = { faulty: 50, poor: 62, acceptable: 76, good: 87, 'very-good': 91, outstanding: 96 };

/* ЗЕРКАЛО модели v9 — независимый пересчёт физики из профиля (ловит расхождение). */
function mirror(record: TastingRecord) {
  const sp = computeStructuralProfile(record);
  const axisOf = (k: string): number => sp.axes.find((a) => a.key === k)?.value ?? 0;
  const acid = axisOf('acidity');
  const tannin = axisOf('tannins');
  const fruit = axisOf('fruit');
  const body = axisOf('body');
  const caud = finishSecondsOf(record) ?? 4;
  const isFort = record.identity.fortified === true;
  const sweet = record.palate.sweetness ?? 'dry';
  const isSweet = sweet === 'sweet' || sweet === 'medium';
  const style = record.identity.style ?? 'red';
  const isRO = style === 'red' || style === 'orange';
  const tex = record.palate.tanninTexture ?? null;
  const faulty = faultAnalysisOf(record).faultyMode;

  const tShield = isRO ? Math.max(0, tannin - 3.5) : 0;
  const aSpine = Math.max(0, acid - 4.2);
  const sShield = sweet === 'sweet' ? 8 : sweet === 'medium' ? 3.5 : sweet === 'off-dry' ? 1.0 : 0;
  const alcShield = isFort ? 14 : record.palate.alcohol === 'high' ? 1.2 : record.palate.alcohol === 'low' ? -1.0 : 0;
  const texBonus = tex === 'silky' ? 1.2 : tex === 'velvety' ? 0.8 : tex === 'chalky' ? 0.5 : tex === 'rustic' ? -1.5 : 0;
  const pPres = 1.5 * tShield + 1.2 * aSpine + 1.4 * sShield + 1.6 * alcShield + texBonus;
  const fuel = (Math.max(1, fruit) * 1.3 + Math.max(1, body) + Math.min(6, Math.max(0, caud) * 0.32)) / 14;

  let mEvo = 1.0;
  if (sp.spectrum.freshRegister === 'primary-crunch') mEvo = 1.15;
  else if (sp.spectrum.freshRegister === 'tertiary-depth') mEvo = 0.82;
  if (faulty) mEvo = 0.15;

  const light = !isFort && !isSweet && tannin <= 3.5 && acid < 8;
  const L = light
    ? Math.max(1.5, Math.min(4.5, Math.round((2.0 + 0.4 * aSpine + 0.3 * fruit) * mEvo * 10) / 10))
    : Math.max(2.0, Math.min(60, Math.round((2.5 + pPres * fuel) * mEvo * 10) / 10));

  const y0 = light ? 0.9 : Math.min(0.95, Math.max(0.28, 0.95 - 0.09 * tShield - 0.04 * aSpine + (isFort ? 0.1 : 0) + (isSweet ? 0.05 : 0)));
  const dumb = !light && !isFort && !faulty && tShield >= 2.5 && (acid >= 7 || tannin >= 7);
  const dumbDepth = dumb
    ? Math.min(0.55, Math.max(0.25, 0.35 + (tex === 'grippy' || tex === 'grainy' ? 0.15 : 0) - (fruit >= 7.5 ? 0.1 : 0)))
    : 0;
  const rise = light ? 0.06 : Math.max(0.05, Math.min(0.38, 0.35 * (1 - y0) + (dumb ? 0.08 : 0)));
  const plateau = isFort ? 0.75 : isSweet ? 0.6 : Math.max(0.3, Math.min(0.65, 0.38 + 0.02 * pPres));

  const age = Math.max(0, YEAR - Math.max(1900, Math.min(YEAR + 1, Number(record.identity.vintage.match(/\d{4}/)?.[0] ?? NaN) || YEAR - 1)));
  const peakFrom = Math.round(Number(record.identity.vintage.match(/\d{4}/)?.[0]) + (y0 >= 0.85 ? 0 : L * rise));
  const peakTo = Math.round(peakFrom + L * plateau);

  let phase: WineLifeArc['phase'] = 'peak';
  if (YEAR < peakFrom) phase = dumb && age >= 2 && age <= Math.round(L * 0.2) ? 'dumb' : 'rising';
  else if (YEAR > peakTo) phase = 'declining';

  const baseScore = record.conclusion.score100 ?? BASE[record.conclusion.quality ?? 'good'];
  let yd = 0;
  if (phase === 'dumb') yd = -4;
  else if (phase === 'rising') yd = y0 < 0.5 ? -3 : -1;
  else if (phase === 'declining') yd = -3;
  const scoreToday = Math.max(50, Math.min(100, baseScore + yd));
  const growth = light ? 0 : Math.round(Math.min(6, pPres * 0.35 + (caud >= 12 ? 2 : 1) + (sp.spectrum.entropy >= 0.7 ? 1.5 : 0)));
  const scoreZenith = faulty ? scoreToday : Math.max(scoreToday, Math.min(100, baseScore + (phase === 'peak' ? 0 : growth)));

  return { sp, pPres, fuel, mEvo, L, y0, rise, plateau, dumb, dumbDepth, tShield, phase, scoreToday, scoreZenith };
}

function verifyAgainstMirror(name: string, record: TastingRecord): void {
  const arc = calculateWineLifeArc(record, computeStructuralProfile(record));
  const m = mirror(record);
  check(`${name}: P_pres`, arc.pPres, m.pPres, 0.01);
  check(`${name}: Fuel`, arc.fuel, m.fuel, 0.01);
  check(`${name}: Lifespan L`, arc.lifespan, m.L, 0.011);
  check(`${name}: Y0`, arc.y0, m.y0, 0.011);
  check(`${name}: dumb`, arc.hasDumbPhase, m.dumb);
  check(`${name}: dumbDepth`, arc.dumbDepth, m.dumbDepth, 0.011);
  check(`${name}: фаза ${YEAR} года`, arc.phase, m.phase);
  check(`${name}: балл сегодня`, arc.scoreToday, m.scoreToday, 0.51);
  check(`${name}: балл зенит`, arc.scoreZenith, m.scoreZenith, 0.51);
  const peakFrom = Math.round(arc.vintage + (arc.y0 >= 0.85 ? 0 : arc.lifespan * arc.riseRatio));
  check(`${name}: peakFrom`, arc.peakFrom, peakFrom, 0);
  check(`${name}: peakTo`, arc.peakTo, Math.round(peakFrom + arc.lifespan * arc.plateauRatio), 0);
  check(`${name}: lifeEnd`, arc.lifeEnd, Math.round(arc.vintage + arc.lifespan), 0);
}

/* ── 1. БОЖОЛЕ / СОВИНЬОН БЛАН — «Пить свежим» ── */
console.log('── ЭТАЛОН 1: СВЕЖЕЕ (Совиньон Блан 2024) — честные 1.5–4.5 года, старт с верха ──');
const sauv = createEmptyTasting('sommelier-pro');
sauv.identity.style = 'white';
sauv.identity.vintage = '2024';
sauv.palate.acidity = 'medium+'; // ось 7.0 → кислотный хребет 2.8
sauv.palate.body = 'light';
sauv.palate.finish = 'short'; // 3 с
sauv.nose.aromas = { lemon: 1 } as AromaSelection;
const arcS = calculateWineLifeArc(sauv, computeStructuralProfile(sauv));
check('Y0 = 0.90 (лёгкое свежее — старт с потолка)', arcS.y0, 0.9, 0.011);
check(`lifespan ≤ 4.5 (${arcS.lifespan})`, arcS.lifespan <= 4.5, true);
check('peakFrom = винтаж (пить сейчас)', arcS.peakFrom, 2024, 0);
check('архетип immediate', arcS.archetype, 'immediate');
check('badge', arcS.archetypeLabel, 'Пить молодым (свежесть)');
check('badge tone', arcS.archetypeTone, 'sage');
check('нет фазы закрытости', arcS.hasDumbPhase, false);
check('прогноз на релиз (первичный сок)', arcS.getTasteNoteAtYear(2024).startsWith('🍓'), true);
check('зенит-проекция не нужна (пить сейчас)', zenithAxesOf(sauv, computeStructuralProfile(sauv)), null);
verifyAgainstMirror('СовБлан', sauv);

/* ── 2. КЬЯНТИ КЛАССИКО (СЕЛЕЦЬОНЕ, medium+ танин) — структурное с ямой ── */
console.log('\n── ЭТАЛОН 2: КЬЯНТИ 2019 (tannin 7.0) — T_shield 3.5 → яма закрытости ──');
const chianti = createEmptyTasting('sommelier-pro');
chianti.identity.style = 'red';
chianti.identity.vintage = '2019';
chianti.palate.acidity = 'medium'; // 5.5 → хребет 1.3
chianti.palate.tanninLevel = 'medium+'; // 7.0 → щит 3.5
chianti.palate.body = 'medium';
chianti.palate.finish = 'medium-'; // 6 с
chianti.nose.aromas = { 'red-cherry': 3 } as AromaSelection;
const arcC = calculateWineLifeArc(chianti, computeStructuralProfile(chianti));
check('Y0 ≈ 0.58 (0.54…0.68)', arcC.y0 >= 0.54 && arcC.y0 <= 0.68, true);
check(`lifespan 6–14 (${arcC.lifespan})`, arcC.lifespan >= 6 && arcC.lifespan <= 14, true);
check('архетип grand-cru (танин ≥ 7 → фаза закрытости)', arcC.archetype, 'grand-cru');
check('badge', arcC.archetypeLabel, 'Великий потенциал (Dumb Phase)');
check('яма открыта', arcC.hasDumbPhase, true);
check('глубина ямы: богатый фрукт приподнимает дно (0.35−0.1)', arcC.dumbDepth, 0.25, 0.011);
check('прогноз на релиз — набирает тело', arcC.getTasteNoteAtYear(2020).startsWith('Вино набирает'), true);
check('двойной балл в коридоре', arcC.scoreToday >= 50 && arcC.scoreToday <= 100 && arcC.scoreZenith >= arcC.scoreToday, true);
verifyAgainstMirror('Кьянти', chianti);

/* ── 3. БАРОЛО — «Великий долгожитель» с Dumb Phase и двойным баллом ── */
console.log('\n── ЭТАЛОН 3: БАРОЛО 2023 — яма закрытости, Оценка 83 → Зенит ~93 ──');
const barolo = createEmptyTasting('sommelier-pro');
barolo.identity.style = 'red';
barolo.identity.vintage = '2023';
barolo.palate.acidity = 'high'; // 8.5 → хребет 4.3
barolo.palate.tanninLevel = 'high'; // 9.0 → щит 5.5
barolo.palate.body = 'full';
barolo.palate.finish = 'medium'; // 10 с
barolo.nose.aromas = { 'red-cherry': 3, leather: 2 } as AromaSelection;
const spB = computeStructuralProfile(barolo);
const arcB = calculateWineLifeArc(barolo, spB);
check('Y0 < 0.5 (закрыто, требует погреба)', arcB.y0 < 0.5, true);
check(`lifespan ≥ 14 (${arcB.lifespan})`, arcB.lifespan >= 14, true);
check('Dumb Phase активна', arcB.hasDumbPhase, true);
check('фаза = dumb (возраст 3 года)', arcB.phase, 'dumb');
check('phaseShort', arcB.phaseShort, 'Закрыто');
check('readiness', arcB.readiness, 'too-young');
check('badge', arcB.archetypeLabel, 'Великий потенциал (Dumb Phase)');
check('badge tone', arcB.archetypeTone, 'garnet');
check('штраф за закрытость −4: Оценка сегодня = 83', arcB.scoreToday, 83, 0.51);
check('зенит выше сегодня на рост потенциала', arcB.scoreZenith >= 91 && arcB.scoreZenith <= 93, true);
check('прогноз 2024 (набирает тело)', arcB.getTasteNoteAtYear(2024).startsWith('Вино набирает'), true);
check('прогноз 2027 (яма)', arcB.getTasteNoteAtYear(2027).includes('закрытости'), true);
const midPlateau = Math.round((arcB.peakFrom + arcB.peakTo) / 2);
check(`прогноз ${midPlateau} (плато с зенитом)`, arcB.getTasteNoteAtYear(midPlateau).includes('Золотое плато'), true);
check('прогноз после плато (спад)', arcB.getTasteNoteAtYear(arcB.peakTo + 4).startsWith('🍂'), true);
/* Двухконтурный радар: танин и кислота интегрируются в купол */
const zenB = zenithAxesOf(barolo, spB);
check('зенит-проекция Бароло существует', zenB !== null, true);
if (zenB) {
  const tNow = spB.axes.find((a) => a.key === 'tannins')?.value ?? 0;
  const aNow = spB.axes.find((a) => a.key === 'acidity')?.value ?? 0;
  check(`танин в зените мягче (${zenB.tannins} < ${tNow})`, zenB.tannins < tNow, true);
  check(`кислота в зените притёрлась (${zenB.acidity} < ${aNow})`, zenB.acidity < aNow, true);
  check('купол: танин в зените в коридоре 6.5–8', zenB.tannins >= 6.5 && zenB.tannins <= 8, true);
}
verifyAgainstMirror('Бароло', barolo);

/* ── 4. ПОРТО Тони — «Креплёное плато» ── */
console.log('\n── ЭТАЛОН 4: ПОРТО Тони 2010 — Alc_shield 14 → монолит с релиза ──');
const tawny = createEmptyTasting('sommelier-pro');
tawny.identity.style = 'red';
tawny.identity.fortified = true;
tawny.identity.vintage = '2010';
tawny.palate.acidity = 'medium';
tawny.palate.body = 'full';
tawny.palate.finish = 'long'; // 22 с → бонус 6 (кап)
tawny.nose.aromas = { fig: 3, caramel: 2, dates: 2 } as AromaSelection;
const arcO = calculateWineLifeArc(tawny, computeStructuralProfile(tawny));
check('Y0 = 0.95 (плато сразу из бочки)', arcO.y0, 0.95, 0.011);
check(`lifespan ≥ 25 (${arcO.lifespan})`, arcO.lifespan >= 25, true);
check('peakFrom = винтажу (монолит)', arcO.peakFrom, 2010, 0);
check('архетип oxidative', arcO.archetype, 'oxidative');
check('badge', arcO.archetypeLabel, 'Креплёное плато');
check('нет ямы у креплёного', arcO.hasDumbPhase, false);
check('фаза = peak', arcO.phase, 'peak');
check('readiness', arcO.readiness, 'drink-now');
check('прогноз на текущий год (плато)', arcO.getTasteNoteAtYear(YEAR).includes('Золотое плато'), true);
check('на пике: сегодня = зенит', arcO.scoreToday, arcO.scoreZenith, 0.51);
verifyAgainstMirror('Тони', tawny);

/* ── 5. СОТЕРН — сахар как консервант ── */
console.log('\n── ЭТАЛОН 5: СОТЕРН 2015 — S_shield 8 → долгий сладкий плато (60%) ──');
const saut = createEmptyTasting('sommelier-pro');
saut.identity.style = 'white';
saut.identity.vintage = '2015';
saut.palate.sweetness = 'sweet';
saut.palate.acidity = 'high'; // ось 8.5 − 2 (маскирование) = 6.5
saut.palate.body = 'full';
saut.palate.finish = 'long';
saut.nose.aromas = { apricot: 3, honey: 3, jam: 2 } as AromaSelection;
const arcW = calculateWineLifeArc(saut, computeStructuralProfile(saut));
check('S_shield в щите (P_pres ≥ 10)', arcW.pPres >= 10, true);
check(`lifespan ≥ 15 (${arcW.lifespan})`, arcW.lifespan >= 15, true);
check('плато 60% у сладкого', arcW.plateauRatio, 0.6, 0.011);
check('архетип sweet-immortal', arcW.archetype, 'sweet-immortal');
check('badge', arcW.archetypeLabel, 'Сладкий долгожитель');
const midW = Math.round((arcW.peakFrom + arcW.peakTo) / 2);
check(`прогноз ${midW} (плато)`, arcW.getTasteNoteAtYear(midW).includes('Золотое плато'), true);
verifyAgainstMirror('Сотерн', saut);

/* ── 6. ВОДЯНИСТОЕ ВИНО — Fuel обрезает фантазии ── */
console.log('\n── КОНТРОЛЬ: ВОДЯНИСТОЕ — Fuel ≈ 0.4, лёгкий коридор 1.5–4.5 ──');
const watery = createEmptyTasting('sommelier-pro');
watery.identity.style = 'white';
watery.identity.vintage = '2025';
watery.palate.acidity = 'medium';
watery.palate.body = 'light';
watery.palate.finish = 'short';
const arcWt = calculateWineLifeArc(watery, computeStructuralProfile(watery));
check(`Fuel ≤ 0.75 (${arcWt.fuel.toFixed(2)})`, arcWt.fuel <= 0.75, true);
check(`lifespan ≤ 4.5 (${arcWt.lifespan})`, arcWt.lifespan <= 4.5, true);
check('зенит недостижим (рост = 0 у свежего)', arcWt.scoreToday, arcWt.scoreZenith, 0.51);
verifyAgainstMirror('Водянистое', watery);

/* ── 7. ПОРОК УБИВАЮТ ПОТЕНЦИАЛ (M_evo = 0.15) ── */
console.log('\n── КОНТРОЛЬ: ПОРОК — M_evo = 0.15, ямы и зенита нет ──');
const faultyRec = createEmptyTasting('sommelier-pro');
faultyRec.identity.style = 'red';
faultyRec.identity.vintage = '2023';
faultyRec.palate.acidity = 'high';
faultyRec.palate.tanninLevel = 'high';
faultyRec.palate.finish = 'long';
faultyRec.nose.condition = 'unclean';
faultyRec.nose.faults = [{ type: 'tca', severity: 'distinct' }];
const arcF = calculateWineLifeArc(faultyRec, computeStructuralProfile(faultyRec));
const mF = mirror(faultyRec);
check('зеркало: M_evo = 0.15 применён', mF.mEvo, 0.15, 0.001);
check(`lifespan ≤ 6 (${arcF.lifespan})`, arcF.lifespan <= 6, true);
check(`окно зажато: lifeEnd ≤ ${2023 + 6}`, arcF.lifeEnd <= 2023 + 6, true);
check('у порочного нет «великой» ямы', arcF.hasDumbPhase, false);
check('порок замораживает зенит: сегодня = зенит', arcF.scoreToday, arcF.scoreZenith, 0.51);
verifyAgainstMirror('Порочное', faultyRec);

/* ── 8. ВЫСОКИЙ АЛКОГОЛЬ добавляет щит, низкий — отнимает ── */
console.log('\n── КОНТРОЛЬ: СПИРТ — Alc_shield ± ──');
const hotRed = createEmptyTasting('sommelier-pro');
hotRed.identity.style = 'red';
hotRed.identity.vintage = '2020';
hotRed.palate.acidity = 'medium';
hotRed.palate.tanninLevel = 'medium+';
hotRed.palate.alcohol = 'high';
hotRed.palate.finish = 'medium-';
const mildRed = createEmptyTasting('sommelier-pro');
mildRed.identity.style = 'red';
mildRed.identity.vintage = '2020';
mildRed.palate.acidity = 'medium';
mildRed.palate.tanninLevel = 'medium+';
mildRed.palate.alcohol = 'low';
mildRed.palate.finish = 'medium-';
const arcHot = calculateWineLifeArc(hotRed, computeStructuralProfile(hotRed));
const arcMild = calculateWineLifeArc(mildRed, computeStructuralProfile(mildRed));
check(`алкоголь high даёт больше лет, чем low (${arcHot.lifespan} > ${arcMild.lifespan})`, arcHot.lifespan > arcMild.lifespan, true);
verifyAgainstMirror('Высокоалкогольное', hotRed);
verifyAgainstMirror('Легкое', mildRed);

/* ── 9. ТЕКСТУРА ТАНИНА — «в мире нет двух одинаковых бутылок» ── */
console.log('\n── ТЕКСТУРА: хваткий/шелковистый/грубый — три принципиально разные кривые ──');
const mkStructured = (tex: TanninTexture | null): TastingRecord => {
  const r = createEmptyTasting('sommelier-pro');
  r.identity.style = 'red';
  r.identity.vintage = '2023';
  r.palate.acidity = 'high';
  r.palate.tanninLevel = 'medium+'; // 7.0: без капа оси — чистая текстурная физика
  r.palate.body = 'full';
  r.palate.finish = 'medium';
  r.palate.tanninTexture = tex;
  r.nose.aromas = { 'red-cherry': 3, leather: 2 } as AromaSelection;
  return r;
};
const arcGrippy = calculateWineLifeArc(mkStructured('grippy'), computeStructuralProfile(mkStructured('grippy')));
const arcSilky = calculateWineLifeArc(mkStructured('silky'), computeStructuralProfile(mkStructured('silky')));
const arcRustic = calculateWineLifeArc(mkStructured('rustic'), computeStructuralProfile(mkStructured('rustic')));
const arcPlain = calculateWineLifeArc(mkStructured(null), computeStructuralProfile(mkStructured(null)));
check(`хваткий: яма глубже базовой (0.40 vs 0.25) (${arcGrippy.dumbDepth})`, arcGrippy.dumbDepth, 0.4, 0.011);
check(`шелковистый: вино мягче с релиза (Y0 ${arcSilky.y0.toFixed(2)} > ${arcPlain.y0.toFixed(2)})`, arcSilky.y0 > arcPlain.y0, true);
check(`шелковистый: раскрывается не позже (${arcSilky.peakFrom} ≤ ${arcPlain.peakFrom})`, arcSilky.peakFrom <= arcPlain.peakFrom, true);
check('шелковистый: яма не глубже базовой', arcSilky.dumbDepth <= arcPlain.dumbDepth, true);
check(`грубый: суровее и закрытее (Y0 ${arcRustic.y0} < ${arcPlain.y0})`, arcRustic.y0 < arcPlain.y0, true);
check(`грубый: раскрывается позже шелковистого (${arcRustic.peakFrom} > ${arcSilky.peakFrom})`, arcRustic.peakFrom > arcSilky.peakFrom, true);
check(`разные бутылки — разные пики: ${arcSilky.peakFrom}/${arcGrippy.peakFrom}/${arcRustic.peakFrom}`, new Set([arcPlain.peakFrom, arcGrippy.peakFrom, arcSilky.peakFrom, arcRustic.peakFrom]).size >= 3, true);
verifyAgainstMirror('Структурное без текстуры', mkStructured(null));
verifyAgainstMirror('Бароло хваткий', mkStructured('grippy'));
verifyAgainstMirror('Бароло шелковистый', mkStructured('silky'));
verifyAgainstMirror('Бароло грубый', mkStructured('rustic'));

/* ── 10. ЗЕНИТ-ПРОЕКЦИЯ радара: контур только у растущих вин ── */
console.log('\n── ЗЕНИТ-РАДАР: контур есть у молодых структурных, нет у готовых ──');
const zenO = zenithAxesOf(tawny, computeStructuralProfile(tawny));
check('Тони на пике — контур зенита не рисуется', zenO, null);
const zenS = zenithAxesOf(sauv, computeStructuralProfile(sauv));
check('СовБлан immediate — контур зенита не рисуется', zenS, null);

/* ── 11. Q2: ВЗВЕШЕННЫЕ ОЧКИ BLIC ── */
console.log('\n── Q2: ВЗВЕШЕННЫЙ РАСЧЁТ КАЧЕСТВА ──');
const blic = (m: Partial<Record<BlicKey, BlicRating>>): Partial<Record<BlicKey, BlicRating>> => m;
check('4 strong → Outstanding', suggestQuality(blic({ balance: 'strong', length: 'strong', intensity: 'strong', complexity: 'strong' }), false), 'outstanding');
check('3S+1A (3.5) → Very good', suggestQuality(blic({ balance: 'strong', length: 'strong', intensity: 'strong', complexity: 'adequate' }), false), 'very-good');
check('2S+2A (3.0) → Very good (ФИКС: было Good)', suggestQuality(blic({ balance: 'strong', length: 'strong', intensity: 'adequate', complexity: 'adequate' }), false), 'very-good');
check('2S+1A+1W (2.5) → Good', suggestQuality(blic({ balance: 'strong', length: 'strong', intensity: 'adequate', complexity: 'weak' }), false), 'good');
check('1S+2A+1W (2.0) → Good', suggestQuality(blic({ balance: 'strong', length: 'adequate', intensity: 'adequate', complexity: 'weak' }), false), 'good');
check('4A (2.0) → Good', suggestQuality(blic({ balance: 'adequate', length: 'adequate', intensity: 'adequate', complexity: 'adequate' }), false), 'good');
check('2A+2W (1.0) → Acceptable', suggestQuality(blic({ balance: 'adequate', length: 'adequate', intensity: 'weak', complexity: 'weak' }), false), 'acceptable');
check('1A+3W (0.5) → Poor', suggestQuality(blic({ balance: 'adequate', length: 'weak', intensity: 'weak', complexity: 'weak' }), false), 'poor');
check('порок → Faulty', suggestQuality(blic({ balance: 'strong', length: 'strong', intensity: 'strong', complexity: 'strong' }), faultAnalysisOf(faultyRec).faultyMode), 'faulty');
check('неполный BLIC → null', suggestQuality(blic({ balance: 'strong', length: 'strong' }), false), null);

console.log(`\n${failed === 0 ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : `❌ ПРОВАЛЕНО: ${failed}`}`);
process.exit(failed === 0 ? 0 : 1);
