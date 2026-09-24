/**
 * Номер записи в погребе (v19) — общий хук печатного листа и экспортов:
 * порядок createdAt по всему погребу; до явного «Сохранить» — черновик (null).
 */
import { useEffect, useState } from 'react';
import type { TastingRecord } from '@/types/tasting';
import { listTastings } from '@/db';

export function useRecordNumber(record: TastingRecord): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    if (record.draft) {
      setN(null);
      return;
    }
    void listTastings().then((all) => {
      if (!alive) return;
      const chrono = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const idx = chrono.findIndex((r) => r.id === record.id);
      setN(idx >= 0 ? idx + 1 : null);
    });
    return () => {
      alive = false;
    };
  }, [record.id, record.draft]);
  return n;
}
