import type { ReactNode } from 'react';
import { T } from '@/lib/tr';

/**
 * Tb — T() с поддержкой инлайновых <b>…</b>-фрагментов.
 *
 * Урок v12: строки шпаргалок хранят выделения прямо в тексте
 * («• <b>Низкая:</b> плоское…»), а React экранирует строковые узлы —
 * теги рисовались литерально в обоих языках. Tb разбирает их в
 * настоящие <strong>, сохранив перевод на обоих языках.
 */
export function Tb({ s }: { s: string }) {
  const text = T(s);
  const parts = text.split(/(<b>.*?<\/b>)/g);
  const nodes: ReactNode[] = parts.map((p, i) => {
    const m = p.match(/^<b>(.*)<\/b>$/);
    return m ? (
      <strong key={i} className="font-bold text-ink">
        {m[1]}
      </strong>
    ) : (
      p
    );
  });
  return <>{nodes}</>;
}
