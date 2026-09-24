/**
 * Функциональная верификация P1-фиксов v12:
 *  H1 — restoreBackup теперь восстанавливает библиотеку customAromas из бэкапа;
 *  M4 — buildStandaloneHtml отбрасывает нестандартные dataUrl и не выпускает HTML-инъекции.
 * Запуск: npx esbuild scripts/verify_p1_fixes.ts --bundle --platform=node --format=cjs && node /tmp/verify_p1.cjs
 */
import { restoreBackup, listCustomAromas } from '../src/db/index';
import { buildStandaloneHtml } from '../src/components/export/buildStandaloneHtml';
import { buildDigest } from '../src/components/export/digest';
import { createEmptyTasting, type CustomAroma } from '../src/types/tasting';

/* In-memory localStorage: в Node его нет, фолбэк db-слоя терял бы записи
 * (в браузере это IndexedDB/настоящий localStorage — тест проверяет логику, не платформу). */
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

/* ── H1: бэкап с customAromas ─────────────────────────────────────────────── */
const validTag: CustomAroma = { id: 'tag-1', family: 'fruity', label: 'фейхоа', createdAt: '2026-01-01T00:00:00Z' };
const brokenTag = { id: 'tag-2', label: 42 }; // не пройдёт фильтр
const record = { ...createEmptyTasting(), id: 'rec-1' };
const backup = {
  app: 'sommelier-sat-companion',
  schemaVersion: 3,
  exportedAt: '2026-09-21T00:00:00Z',
  tastings: [record],
  customAromas: [validTag, brokenTag],
};

const restored = await restoreBackup(backup, { merge: true });
check('H1: рестор не падает', restored === 1, `записей: ${restored}`);

const lib = await listCustomAromas();
check('H1: валидный дескриптор восстановлен', lib.some((t) => t.id === 'tag-1' && t.label === 'фейхоа'), `в библиотеке: ${lib.length}`);
check('H1: битая запись отфильтрована', !lib.some((t) => t.id === 'tag-2'));

// Старый бэкап БЕЗ customAromas не должен ломаться (обратная совместимость)
const oldBackup = { ...backup, customAromas: undefined };
const restoredOld = await restoreBackup(oldBackup, { merge: true });
check('H1: старый бэкап без customAromas работает', restoredOld === 1);

/* ── M4: санитизация фото в standalone-экспорте ───────────────────────────── */
const GOOD_JPEG =
  'data:image/jpeg;base64,' +
  Buffer.from('fakejpeg').toString('base64');
const EVIL_QUOTE = '"><img src=x onerror=alert(1)>';
const EVIL_SVG = 'data:image/svg+xml;base64,' + Buffer.from('<svg onload=alert(1)/>').toString('base64');
const EVIL_EVENT = 'data:image/jpeg;base64,AAAA" onmouseover="alert(1)';

const rec = {
  ...createEmptyTasting(),
  id: 'rec-x',
  photos: [
    { id: 'p1', role: 'bottle' as const, dataUrl: GOOD_JPEG, width: 10, height: 10, sizeKb: 1 },
    { id: 'p2', role: 'label' as const, dataUrl: EVIL_QUOTE, width: 10, height: 10, sizeKb: 1 },
    { id: 'p3', role: 'moodboard' as const, dataUrl: EVIL_SVG, width: 10, height: 10, sizeKb: 1 },
    { id: 'p4', role: 'glass' as const, dataUrl: EVIL_EVENT, width: 10, height: 10, sizeKb: 1 },
  ],
};
// Настоящий digest движка — заодно проверяет совместимость экспорта с фиксом
const html = buildStandaloneHtml(rec, buildDigest(rec));
check('M4: хорошее jpeg-фото на месте', html.includes(`src="${GOOD_JPEG}"`));
check('M4: инъекция через кавычки отброшена', !html.includes('onerror=alert(1)'), 'evil-quote');
check('M4: svg+xml dataUrl отброшен', !html.includes(EVIL_SVG.slice(0, 40)), 'evil-svg');
check('M4: атрибутивная инъекция отброшена', !html.includes('onmouseover="alert(1)'), 'evil-event');
check('M4: нет разрыва атрибута src', !/<img src="[^"]*"/.test(html.replace(new RegExp(`src="${GOOD_JPEG}"`, 'g'), '')));

/* ── Итог ─────────────────────────────────────────────────────────────────── */
console.log(`\n${fail === 0 ? '✅' : '❌'} P1-фиксы: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
