/**
 * Безопасный UUID v4.
 *
 * crypto.randomUUID() существует только в secure context (https, localhost,
 * file://). Если файл открыт по http://<LAN-IP> — например, когда дегустатор
 * раздаёт компаньон на телефон по локальной сети, — вызов падает с
 * «crypto.randomUUID is not a function» и роняет всё приложение на старте
 * (createEmptyTasting). Здесь — канонический фолбэк через getRandomValues.
 */
export function uuid(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;

  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // версия 4
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // вариант RFC 4122
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /* Последний рубеж (экзотика без WebCrypto): уникальности хватает на сессию. */
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
