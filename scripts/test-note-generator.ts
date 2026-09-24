/**
 * Смоук-тест мастер-генератора заметок v11 (двуязычный):
 *  • 4 регистра выдают непустой текст с фактами карточки — в RU и в EN;
 *  • academic — без метафор и без 100-балльной (канон WSET);
 *  • «Перефразировать» (variant) меняет текст, не факты;
 *  • score100 утекает только в режиме sommelier-pro;
 *  • переключение языка (setTrLang) полностью меняет регистр текста.
 */
import { createEmptyTasting } from '../src/types/tasting';
import { buildCustomNote, DEFAULT_NOTE_OPTIONS } from '../src/engine/narrativeGenerator';
import { setTrLang } from '../src/lib/tr';

let failures = 0;
function check(name: string, cond: boolean, extra = ''): void {
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? `: ${extra}` : ''}`);
  if (!cond) failures++;
}

function makeRecord() {
  const rec = createEmptyTasting('sommelier-pro', 'Тестер');
  rec.identity = { ...rec.identity, name: 'Barolo DOCG', producer: 'G. Conterno', vintage: '2019', region: 'Пьемонт', country: 'Италия', grapes: 'Неббиоло' };
  rec.nose.aromas = { 'red-cherry': 3, vanilla: 2, leather: 2 };
  rec.palate = { ...rec.palate, acidity: 'high', tanninLevel: 'high', body: 'full', finish: 'long', tanninTexture: 'grippy', caudalieSeconds: 12 };
  rec.conclusion.blic = { balance: 'strong', length: 'strong', intensity: 'adequate', complexity: 'strong' };
  rec.conclusion.quality = 'very-good';
  rec.conclusion.score100 = 93;
  rec.conclusion.windowFrom = 2033;
  rec.conclusion.windowTo = 2057;
  rec.media.gastronomy = ['трюфельная паста', 'дичь'];
  return rec;
}

/* ═══ Блок RU (язык по умолчанию для теста задан явно) ═══ */
setTrLang('ru');
{
  const rec = makeRecord();
  const academic = buildCustomNote(rec, undefined, 'academic', DEFAULT_NOTE_OPTIONS, 0);
  check('RU academic: ВИД/НОС/РОТ/BLIC присутствуют', academic.includes('ВИД:') && academic.includes('НОС:') && academic.includes('РОТ:') && academic.includes('BLIC'));
  check('RU academic: ВЕРДИКТ очень хорошее (uppercase)', academic.includes('ВЕРДИКТ: ОЧЕНЬ ХОРОШЕЕ'));
  check('RU academic: БЕЗ 100-балльной (WSET запрещает)', !academic.includes('93/100') && !academic.includes('(93'));
  check('RU academic: окно по тумблеру window', academic.includes('2033–2057'));

  const somm1 = buildCustomNote(rec, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 0);
  const somm2 = buildCustomNote(rec, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 1);
  check('RU sommelier: факты — Пьемонт и вишня', somm1.includes('Пьемонт') && somm1.toLowerCase().includes('вишн'));
  check('RU sommelier: балл 93/100 в Pro', somm1.includes('93/100'));
  check('RU sommelier: подача по тумблеру serving', somm1.toLowerCase().includes('подача'));
  check('RU sommelier: гастрономия по тумблеру gastro', somm1.includes('трюфельная'));
  check('RU rephrase меняет текст (variant 0 ≠ 1)', somm1 !== somm2);
  const somm1b = buildCustomNote(rec, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 0);
  check('RU rephrase детерминирован (variant 0 == 0)', somm1 === somm1b);

  const shelf = buildCustomNote(rec, undefined, 'shelf', DEFAULT_NOTE_OPTIONS, 0);
  check('RU shelf: 🏷️ и ПРОФИЛЬ', shelf.includes('🏷️') && shelf.toUpperCase().includes('BAROLO DOCG'));
  const social = buildCustomNote(rec, undefined, 'social', DEFAULT_NOTE_OPTIONS, 0);
  check('RU social: маркеры 👃/👅 и хэштег', social.includes('👃') && social.includes('👅') && social.includes('#дегустация'));

  const bare = buildCustomNote(rec, undefined, 'sommelier', { score: false, gastro: false, serving: false, window: false }, 0);
  check('RU тумблеры score=false убирают балл', !bare.includes('93/100') && !bare.toLowerCase().includes('оценка'));
  check('RU тумблеры gastro=false убирают гастрономию', !bare.includes('трюфельная'));
  check('RU тумблеры window=false убирают окно', !bare.includes('2033'));

  const recWset = { ...rec, mode: 'wset3' as const };
  const sommWset = buildCustomNote(recWset, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 0);
  check('RU wset3: score100 не утекает в sommelier-заметку', !sommWset.includes('93/100'));
}

/* ═══ Блок EN (v11: нативные английские шаблоны) ═══ */
setTrLang('en');
{
  const rec = makeRecord();
  const academic = buildCustomNote(rec, undefined, 'academic', DEFAULT_NOTE_OPTIONS, 0);
  check('EN academic: APPEARANCE/NOSE/PALATE/BLIC', academic.includes('APPEARANCE:') && academic.includes('NOSE:') && academic.includes('PALATE:') && academic.includes('BLIC'));
  check('EN academic: VERDICT very good (uppercase)', academic.includes('VERDICT: VERY GOOD'));
  check('EN academic: no 100-point (WSET canon)', !academic.includes('93/100') && !academic.includes('(93'));
  check('EN academic: window via the toggle', academic.includes('2033–2057'));
  check('EN academic: no Cyrillic left', !/[А-Яа-яЁё]/.test(academic));

  const somm1 = buildCustomNote(rec, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 0);
  const somm2 = buildCustomNote(rec, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 1);
  check('EN sommelier: facts — Piedmont and cherry', somm1.includes('Piedmont') && somm1.toLowerCase().includes('cherr'));
  check('EN sommelier: score 93/100 in Pro', somm1.includes('93/100'));
  check('EN sommelier: serving via the toggle', somm1.toLowerCase().includes('serving'));
  check('EN sommelier: pairing via the toggle', somm1.toLowerCase().includes('truffle'));
  check('EN rephrase changes the text (variant 0 ≠ 1)', somm1 !== somm2);
  check('EN no Cyrillic left', !/[А-Яа-яЁё]/.test(somm1));

  const shelf = buildCustomNote(rec, undefined, 'shelf', DEFAULT_NOTE_OPTIONS, 0);
  check('EN shelf: 🏷️ and PROFILE', shelf.includes('🏷️') && shelf.toUpperCase().includes('BAROLO DOCG'));
  const social = buildCustomNote(rec, undefined, 'social', DEFAULT_NOTE_OPTIONS, 0);
  check('EN social: 👃/👅 markers and hashtag', social.includes('👃') && social.includes('👅') && social.includes('#tasting'));

  const bare = buildCustomNote(rec, undefined, 'sommelier', { score: false, gastro: false, serving: false, window: false }, 0);
  check('EN toggles score=false remove the score', !bare.includes('93/100') && !bare.toLowerCase().includes('assessment'));

  const recWset = { ...rec, mode: 'wset3' as const };
  const sommWset = buildCustomNote(recWset, undefined, 'sommelier', DEFAULT_NOTE_OPTIONS, 0);
  check('EN wset3: score100 does not leak', !sommWset.includes('93/100'));
}

if (failures > 0) {
  console.error(`\n❌ ПРОВАЛОВ: ${failures}`);
  process.exit(1);
} else {
  console.log('\n✅ ГЕНЕРАТОР ЗАМЕТОК (RU+EN): ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
}
