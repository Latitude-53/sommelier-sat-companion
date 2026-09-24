/** Тактильный отклик на поддерживаемых устройствах. */
export function vibrate(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // устройства без поддержки — молча
    }
  }
}
