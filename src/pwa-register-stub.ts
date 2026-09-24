/**
 * Заглушка virtual:pwa-register для single-file сборки.
 * Сервис-воркер в самодостаточном HTML-файле невозможен (файл один, sw.js рядом нет),
 * поэтому регистрация заменяется no-op — остальной код main.tsx не меняется.
 */
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => undefined;
}
