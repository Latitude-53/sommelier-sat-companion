/**
 * Функциональный тест v15: сенсорная лента вместо радара.
 *  • buildStandaloneHtml рисует ленту (bfill/brow/btrack) по всем осям;
 *  • оси без вкладов движка — пунктирные прочерки «н/о» (RU) / «n/a» (EN);
 *  • радарных polygon/подписей «вне паутины» больше нет;
 *  • градации согласованы по родам и переводятся (низкие танины → low).
 * Запуск: npx esbuild scripts/test-v15-bars.ts --bundle --platform=node --format=cjs && node /tmp/test-v15.cjs
 */
import { buildStandaloneHtml } from '../src/components/export/buildStandaloneHtml';
import { buildDigest } from '../src/components/export/digest';
import { T, setTrLang } from '../src/lib/tr';
import { SensoryBarsPrint } from '../src/components/visualizers/SensoryBars';
import { createEmptyTasting } from '../src/types/tasting';

/* In-memory localStorage — как в verify_p1_fixes (в Node его нет). */
const mem = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string): string | null => mem.get(k) ?? null,
  setItem: (k: string, v: string): void => void mem.set(k, String(v)),
  removeItem: (k: string): void => void mem.delete(k),
};

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    pass++;
    console.log(`✓ ${name}${detail ? ': ' + detail : ''}`);
  } else {
    fail++;
    console.log(`✗ ${name}${detail ? ': ' + detail : ''}`);
  }
}

/* Сухое красное: оценены кислотность/танины/тело, фрукта и минеральности нет,
 * сладость не выбрана → 3 заливки + 3 честных прочерка. */
const rec = {
  ...createEmptyTasting(),
  id: 'rec-v15',
  palate: {
    ...createEmptyTasting().palate,
    acidity: 'medium+' as const,
    tanninLevel: 'medium+' as const,
    body: 'full' as const,
  },
};

/* ── RU: лента в автономном экспорте ──────────────────────────────────────── */
setTrLang('ru');
const html = buildStandaloneHtml(rec, buildDigest(rec));
check('лента: класс .bars на месте', html.includes('class="bars"'));
check('лента: CSS шаблона обновлён', html.includes('.bfill') && html.includes('.btrack-na'));
check('лента: 3 заливки (кислота/танины/тело)', (html.match(/class="bfill"/g) ?? []).length === 3);
check('лента: 3 прочерка «н/о» (фрукт/минеральность/сладость)', (html.match(/class="brow brow-na"/g) ?? []).length === 3);
check('лента: ширина заливки кислоты 70%', html.includes('width:70.0%'));
check('лента: ширина заливки тела 85%', html.includes('width:85.0%'));
check('радар исчез: ни одного polygon', !html.includes('polygon'));
check('радар исчез: нет «вне паутины»', !html.includes('вне паутины'));
check('радар исчез: нет «Оценено меньше трёх осей»', !html.includes('Оценено меньше трёх осей'));

/* ── EN: переводы ленты ───────────────────────────────────────────────────── */
setTrLang('en');
check('EN: н/о → n/a', T('н/о') === 'n/a');
check('EN: не оценивалось → not assessed', T('не оценивалось') === 'not assessed');
check('EN: высокие → high', T('высокие') === 'high');
check('EN: высокое → high', T('высокое') === 'high');
check('EN: низкие → low', T('низкие') === 'low');
check('EN: среднее → medium', T('среднее') === 'medium');
const htmlEn = buildStandaloneHtml(rec, buildDigest(rec));
check('EN: экспорт содержит n/a-прочерки', htmlEn.includes('n/a'));
check('EN: подписи осей переведены (Acidity)', htmlEn.includes('Acidity'));

/* ── Градации согласованы по родам (RU) ───────────────────────────────────── */
setTrLang('ru');
/* SensoryBars* — React-компоненты: здесь проверяем только чистые слова-градации
 * через словарь, рендер ленты живьём смотрит agent-browser-смоук. */
check('RU: словарь градаций полный', [T('низкая'), T('высокая'), T('низкие'), T('высокие'), T('низкое'), T('высокое'), T('среднее')].every((w) => w.length > 0));
check('компонент SensoryBars экспортирован', typeof SensoryBarsPrint === 'function');

/* ── Итог ─────────────────────────────────────────────────────────────────── */
console.log(`\n${fail === 0 ? '✅' : '❌'} v15 лента: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
