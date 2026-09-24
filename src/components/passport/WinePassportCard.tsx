/**
 * WinePassportCard (v18) — визитка «Бумага»: живая карта дегустации.
 *
 * Одобренная тема V1: светлая бумага (#f2e8d2), триколор по цвету-основе,
 * шапка реагирует на тип (игристое — мюзле, креплёное — янтарь-штриховка).
 * Карта чистая: ничего не ставится само — окно фото появляется только после
 * «на карточку» в фотоальбоме (cardPhotoId), снимается повторным тапом.
 */
import type { TastingRecord } from '@/types/tasting';
import {
  IDLE_TRIO,
  STYLE_TRIO,
  TYPE_WORDS,
  f1,
  ruDate,
  typeOf,
  type StyleTrio,
} from '@/lib/passport';
import { T } from '@/lib/tr';

/** Короткое имя фото для ярлыка на карте. */
export function photoShortLabel(role: string): string {
  switch (role) {
    case 'label':
      return T('аверс');
    case 'label-back':
      return T('реверс');
    case 'glass':
      return T('бокал');
    case 'cork':
      return T('пробка');
    default:
      return T('снимок');
  }
}

export function WinePassportCard({
  record,
  recordNumber,
}: {
  record: TastingRecord;
  /** Номер записи в погребе (по порядку создания), null — ещё черновик без номера. */
  recordNumber: number | null;
}) {
  const id = record.identity;
  const t = typeOf(id);
  /* noUncheckedIndexedAccess: индексация Record может дать undefined — ?? IDLE_TRIO */
  const style: StyleTrio = id.style ? STYLE_TRIO[id.style] ?? IDLE_TRIO : IDLE_TRIO;
  const cardPhoto = record.cardPhotoId ? record.photos.find((p) => p.id === record.cardPhotoId) ?? null : null;

  const vintageYear = /^\d{4}$/.test(id.vintage.trim()) ? id.vintage.trim() : '';
  /* Для визитки слова типа переводим, пользовательский текст — никогда. */
  const typeLine = [T(TYPE_WORDS[t]), id.style ? T(style.w) : ''].filter(Boolean).join(' ');

  const cy = [id.region, id.country].filter(Boolean).join(' · ');
  const abvShown = id.abv !== null ? f1(id.abv) : null;
  const sxVars = {
    '--w1': style.trio[0],
    '--w2': style.trio[1],
    '--w3': style.trio[2],
    '--ink': id.style ? style.ink : '#6e6248',
  } as React.CSSProperties;

  return (
    <div className="pw-card" data-testid="passport-card">
      <div className={`pw-sx${t === 'p' ? ' musl' : t === 'f' ? ' hatch' : ''}`} style={sxVars} />
      <div className="pw-cbody">
        <div className="pw-bd">
          <div className="pw-cap">{T('что в бокале')}</div>
          {id.name ? (
            <div className="pw-nm">{id.name}</div>
          ) : (
            <div className="pw-nm wght">{T('Название вина')}</div>
          )}
          <div className="pw-tp">
            {typeLine}
            {vintageYear ? ` · ${vintageYear}` : ''}
          </div>
        </div>
        <div className="pw-bd">
          <div className="pw-cap">{T('откуда')}</div>
          {cy ? (
            <div className="pw-cy">{cy}</div>
          ) : (
            <div className="pw-cy wght">{T('страна · регион')}</div>
          )}
          {id.grapes ? (
            <div className="pw-gp">{id.grapes}</div>
          ) : (
            <div className="pw-gp wght">{T('сорт')}</div>
          )}
        </div>
        <div className="pw-bd">
          <div className="pw-cap">{T('детали')}</div>
          {/* v19: цена — Pro-поверхность; в WSET-проходе слот — «производитель» без цены. */}
          {record.mode === 'sommelier-pro' ? (
            id.producer || id.price ? (
              <div className="pw-dt">
                {id.producer || '—'} · <b>{id.price || '—'}</b>
              </div>
            ) : (
              <div className="pw-dt wght">{T('производитель · цена')}</div>
            )
          ) : id.producer ? (
            <div className="pw-dt">{id.producer}</div>
          ) : (
            <div className="pw-dt wght">{T('производитель')}</div>
          )}
        </div>
      </div>

      {/* Окно фото — ТОЛЬКО по установке с кнопки «на карточку». */}
      {cardPhoto && (
        <div className="pw-ph" data-testid="card-photo-window">
          <img src={cardPhoto.dataUrl} alt={photoShortLabel(cardPhoto.role)} />
          <span className="pw-ph-tag">
            {photoShortLabel(cardPhoto.role)} · {T('на карте')}
          </span>
        </div>
      )}

      <div className="pw-rr">
        {abvShown && (
          <>
            {t === 'f' ? (
              <span className="pw-pill">{abvShown}%</span>
            ) : (
              <b>{abvShown}%</b>
            )}
            <span>·</span>
          </>
        )}
        <span>{ruDate(id.dateTasted)}</span>
        <span>·</span>
        {recordNumber !== null ? (
          <span>
            {T('запись')} № {recordNumber}
          </span>
        ) : (
          <span className="wght">{T('черновик')}</span>
        )}
      </div>
    </div>
  );
}
