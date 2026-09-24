import type { ReactNode } from 'react';
import { Modal } from '@/components/common/Modal';
import { Tb } from '@/components/common/Tb';
import { T } from '@/lib/tr';

/* ═══════════════════════════════════════════════════════════════════════════
 * ИНСПЕКТОР СОМЕЛЬЕ «Что под капотом?» (ТЗ §БЛОК 4).
 *
 * Концентрированная выжимка WSET по кнопке [Шпаргалка] в шапках разделов:
 *  • «Нос» → анатомия аромата: как работает математика колеса
 *    (психофизический якорь P_F, регистр свежести Φ_fresh, энтропия Шеннона);
 *  • «Рот» → калибровка вкуса: кислотность (вода → яблоко → лимон),
 *    танины (тест десны) и как отличить танины дуба от танинов винограда.
 *
 * v12: контент — render-функции, все строки через T()/Tb (ранее модалка
 * целиком выпадала из EN-перевода — самая крупная утечка аудита v12).
 * ═══════════════════════════════════════════════════════════════════════════ */

export type SensoryGuideTopic = 'nose' | 'palate';

const GUIDES: Record<SensoryGuideTopic, { title: string; render: () => ReactNode }> = {
  nose: {
    title: 'Анатомия аромата: как работает математика колеса',
    render: () => (
      <div className="space-y-3 text-xs text-ink-dim leading-relaxed">
        <div className="p-3 rounded-xl bg-cellar-deep border border-hairline">
          <h4 className="font-bold text-gold-soft mb-1">{T('1. Психофизический якорь (P F)')}</h4>
          <p>
            <Tb s="Если в вине есть одна вишня на ••• (3 балла), базовое ощущение фрукта уже высокое (7.6/10). Появление табака или кожи <b>не вычитает баллы из фрукта</b>, а добавляет комплексности. Ощущение растёт по Веберу–Фехнеру (логарифм), а не делится по остаточному принципу." />
          </p>
        </div>
        <div className="p-3 rounded-xl bg-cellar-deep border border-hairline">
          <h4 className="font-bold text-gold-soft mb-1">{T('2. Регистр свежести (Φ fresh)')}</h4>
          <p>
            <b>{T('Primary Crunch (≥0.70):')}</b> {T('свежие цитрусы, зеленые яблоки и ягоды.')}
            <br />
            <b>{T('Tertiary Depth (<0.35):')}</b> {T('инжир, изюм, джем, сушеная слива. Они снимают колючую свежесть и сигнализируют о развитии вина.')}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-cellar-deep border border-hairline">
          <h4 className="font-bold text-gold-soft mb-1">{T('3. Энтропия Шеннона (Сложность BLIC)')}</h4>
          <p>
            {T('Считает баланс между семействами. Вино с одними фруктами = «Моно-фокус». Вино с Фруктами + Дубом + Кожей + Специями = «Комплексное (полифония)».')}
          </p>
        </div>
      </div>
    ),
  },
  palate: {
    title: 'Калибровка вкуса: шпаргалка WSET L3',
    render: () => (
      <div className="space-y-3 text-xs text-ink-dim leading-relaxed">
        <div className="p-3 rounded-xl bg-cellar-deep border border-hairline">
          <h4 className="font-bold text-gold-soft mb-1">{T('Калибровка кислотности')}</h4>
          <p>
            <Tb s="• <b>Низкая:</b> плоское, как тёплая вода без лимона." />
            <br />
            <Tb s="• <b>Средняя:</b> спелое яблоко или персик — слюна собирается естественно." />
            <br />
            <Tb s="• <b>Высокая:</b> раскусить дольку лимона — челюсти сводит, слюна течёт ручьём по бокам языка." />
          </p>
        </div>
        <div className="p-3 rounded-xl bg-cellar-deep border border-hairline">
          <h4 className="font-bold text-gold-soft mb-1">{T('Калибровка танинов: тест десны')}</h4>
          <p>
            {T('Через 5 секунд после глотка проведите языком по дёснам над передними зубами. Гладкая поверхность — танины низкие. Десна прилипает к губе, как замша, — танины высокие.')}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-cellar-deep border border-hairline">
          <h4 className="font-bold text-gold-soft mb-1">{T('Танины дуба vs танины винограда')}</h4>
          <p>
            <Tb s="<b>Дуб (бочка):</b> приходит «с приправой» — ваниль, тост, кокос, гвоздика; вяжет аккуратно, чаще нёбо и передние десны." />
            <br />
            <Tb s="<b>Виноград (кожица, семена, гребни):</b> суше и горче, вяжет всю полость, горчинка чувствуется в финише." />
            <br />
            {T('Быстрый тест: если в аромате ваниль/дым/тост — часть танинов принесла бочка.')}
          </p>
        </div>
      </div>
    ),
  },
};

/** Модалка-шпаргалка: концентрированная выжимка по разделу. */
export function SensoryGuideModal({
  open,
  onClose,
  topic,
}: {
  open: boolean;
  onClose: () => void;
  topic: SensoryGuideTopic;
}) {
  if (!open) return null;
  const active = GUIDES[topic];
  return (
    <Modal open={open} onClose={onClose} title={T(active.title)}>
      {active.render()}
    </Modal>
  );
}
