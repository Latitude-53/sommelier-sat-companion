/**
 * Печатная дегустационная карта формата A4 — композиция «Витрина» (v19).
 *
 * Одобрено на «Редизайн-экспорта»: ось у листа одна — центральная.
 *   шапка: бренд-строка → имя вина → визитка в теме пользователя
 *   (Слоновая кость / Бургундия / Терруар) с тиснением «П4»;
 *   мета — сеткой в две колонки по центральной оси; секции SAT —
 *   белые плашки по центру, заголовки капсами по той же оси.
 *
 * Фото и ассоциативный ряд — опциональны, поэтому живут на ВТОРОЙ
 * странице (break-before: page): если их нет, второй страницы нет вовсе.
 *
 * Рендерится в .print-root (скрыт на экране, показывается только при печати).
 * `break-inside: avoid` на каждой логической секции и карточке фото.
 */
import type { TastingRecord } from '@/types/tasting';
import type { Digest } from './digest';
import type { CardThemeId } from '@/lib/exportTheme';
import { SensoryBarsPrint } from '@/components/visualizers/SensoryBars';
import { ExportPassportCard, DiscSvg } from './ExportPassportCard';
import { useRecordNumber } from './useRecordNumber';
import { PHOTO_ROLE_LABELS, QUALITY_OPTS } from '@/lib/catalog';
import { T } from '@/lib/tr';

function Rows({ pairs }: { pairs: [string, string][] }) {
  if (pairs.length === 0) return <p className="p-muted">—</p>;
  return (
    <table className="p-table">
      <tbody>
        {pairs.map(([k, v]) => (
          <tr key={k}>
            <th>{T(k)}</th>
            <td>{T(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="p-h2">{children}</h2>;
}

export function PrintableTastingSheet({
  record,
  digest,
  theme,
}: {
  record: TastingRecord;
  digest: Digest;
  theme: CardThemeId;
}) {
  const d = digest;
  const isPro = record.mode === 'sommelier-pro';
  const recordNumber = useRecordNumber(record);
  const qualityLabel = record.conclusion.quality
    ? (QUALITY_OPTS.find((q) => q.value === record.conclusion.quality)?.label ?? '')
    : null;
  const core = record.eye.coreHex ?? '#4a3b3b';
  const rim = record.eye.rimHex ?? core;

  /* Студентское окно питья (из «Итога») — не советник. */
  const ownWindow =
    record.conclusion.windowFrom !== null && record.conclusion.windowTo !== null
      ? `${record.conclusion.windowFrom}–${record.conclusion.windowTo}`
      : null;

  /* Вторая страница — только если есть что показывать. */
  const validPhotos = record.photos.filter((p) => p.dataUrl.startsWith('data:image/'));
  const hasPage2 = d.media.length > 0 || validPhotos.length > 0;

  return (
    <div className="p-sheet" data-theme={theme}>
      {/* ── Шапка «Витрины»: одна центральная ось ── */}
      <header className="p-head pb-avoid">
        <div className="p-brandline">Systematic Approach to Tasting® (SAT) · Level 3 · {T('Дегустационная карта')}</div>
        <h1 className="p-title">{d.title}</h1>
        <div className="p-sub">{d.subtitle}</div>
        <div className="p-vwrap">
          <ExportPassportCard record={record} recordNumber={recordNumber} theme={theme} />
        </div>
      </header>

      {/* ── Мета: две колонки по центральной оси ── */}
      {d.meta.length > 0 && (
        <div className="p-meta pb-avoid">
          {d.meta.map(([k, v]) => (
            <div key={k} className="p-mrow">
              <b>{T(k)}</b>
              <span>{T(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Визуальный паспорт ── */}
      <section className="p-sec pb-avoid">
        <H2>{T('Визуальный паспорт')}</H2>
        <div className="p-card">
          <div className="p-flex">
            <div className="p-disc">
              <DiscSvg core={core} rim={rim} size={110} />
            </div>
            <div className="p-grow">
              <Rows pairs={d.eye} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Нос ── */}
      <section className="p-sec pb-avoid">
        <H2>{T('Нос')}</H2>
        <div className="p-card">
          <Rows pairs={d.nose} />
        </div>
      </section>

      {/* ── Рот ── */}
      <section className="p-sec pb-avoid">
        <H2>{T('Рот')}</H2>
        <div className="p-card">
          <Rows pairs={d.palate} />
        </div>
      </section>

      {/* ── Структурный профиль ── */}
      <section className="p-sec pb-avoid">
        <H2>{T('Структурный профиль (0–10)')}</H2>
        <div className="p-card">
          <div className="p-flex">
            <div className="p-bars">
              <SensoryBarsPrint axes={d.profile.axes} />
            </div>
            <div className="p-grow">
              <table className="p-table">
                <tbody>
                  {d.profile.axes.map((a) => (
                    <tr key={a.key}>
                      <th>{T(a.label)}</th>
                      <td>
                        <b className="p-num">{a.value.toFixed(1)}</b>
                        <span className="p-muted"> · {a.contributions.map((c) => `${T(c.label)} ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(1)}`).join(', ') || T('база')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Итог · BLIC ── */}
      <section className="p-sec pb-avoid">
        <H2>{T('Итог')} · BLIC</H2>
        <div className="p-card">
          <Rows pairs={d.conclusion} />
          <div className="p-pills">
            {qualityLabel && <span className="p-pill">{T(qualityLabel)}</span>}
            {isPro && record.conclusion.score100 !== null && <span className="p-pill">{record.conclusion.score100}/100</span>}
            {isPro && <span className="p-pill">{d.serving.temperature}</span>}
            {(isPro ? d.serving.window : ownWindow) && (
              <span className="p-pill">{T('Окно питья')}: {isPro ? d.serving.window : ownWindow}</span>
            )}
          </div>
        </div>
      </section>

      <footer className="p-footer pb-avoid">
        <span>{T('Дегустационный компаньон')} · {T('структурный профиль и BLIC рассчитаны автоматически')}</span>
        <span>
          {record.identity.taster || '—'} · {record.identity.dateTasted || '—'}
        </span>
      </footer>

      {/* ── Страница 2 · ассоциации и фотографии (только если есть) ── */}
      {hasPage2 && (
        <div className="p-page2">
          <header className="p-page2-head pb-avoid">
            <span className="p-page2-line" />
            <span className="p-page2-cap">{T('страница 2')} · {T('ассоциации и фотографии')}</span>
            <span className="p-page2-line" />
          </header>

          {d.media.length > 0 && (
            <section className="p-sec pb-avoid">
              <H2>{T('Ассоциативный ряд')}</H2>
              <div className="p-card">
                <Rows pairs={d.media} />
              </div>
            </section>
          )}

          {validPhotos.length > 0 && (
            <section className="p-sec">
              <H2>{T('Фотографии')}</H2>
              <div className="p-photos">
                {validPhotos.slice(0, 8).map((p) => (
                  <figure key={p.id} className="p-photo pb-avoid">
                    <img src={p.dataUrl} alt={T(PHOTO_ROLE_LABELS[p.role] ?? p.role)} />
                    <figcaption>{T(PHOTO_ROLE_LABELS[p.role] ?? p.role)}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <footer className="p-footer pb-avoid">
            <span>{T('Дегустационный компаньон')} · Systematic Approach to Tasting® (SAT) · Level 3</span>
            <span>{record.identity.taster || '—'}</span>
          </footer>
        </div>
      )}
    </div>
  );
}
