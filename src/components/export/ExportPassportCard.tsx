/**
 * ExportPassportCard (v19) — визитка для печатного листа и экспорта.
 *
 * Три печатные темы (одобрены на «Редизайн-экспорта»):
 *   ivory    — V1 «Слоновая кость»: двойная рамка с золотым контуром,
 *              диск цвета вина над именем, золотой разделитель с ромбом;
 *   burgundy — V3 «Бургундия»: шапка-лента бордо с именем и годом золотом,
 *              сетка фактов на волосках, подвал производителя;
 *   terroir  — V7 «Терруар»: крафт-бумага, рубленый шрифт, чернильный
 *              штамп «дегустировано» и пунктирный лидер.
 *
 * Ось у карточки одна — центральная: всё содержание стоит по центру,
 * никакой флотации влево (главная жалоба на старый вывод).
 *
 * Печать «П4 · тиснение» (emboss) — круглый слепой оттиск без краски:
 * свет/тень + тонкое кольцо. Живёт в правом нижнем углу визитки.
 */
import type { TastingRecord } from '@/types/tasting';
import type { CardThemeId } from '@/lib/exportTheme';
import { IDLE_TRIO, STYLE_TRIO, TYPE_WORDS, f1, ruDate, typeOf, type StyleTrio } from '@/lib/passport';
import { T } from '@/lib/tr';

/** Диск цвета вина: ядро/кайма из «Глаза», фолбэк — по цвету-основе. */
export function wineDisc(record: TastingRecord): { core: string; rim: string } {
  const style: StyleTrio = record.identity.style ? STYLE_TRIO[record.identity.style] ?? IDLE_TRIO : IDLE_TRIO;
  const core = record.eye.coreHex ?? style.trio[1] ?? '#7a2e35';
  const rim = record.eye.rimHex ?? style.trio[0] ?? core;
  return { core, rim };
}

/** Диск вина inline-SVG (для React-визитки и для печатной секции «Глаз»). */
export function DiscSvg({ core, rim, size = 34 }: { core: string; rim: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill={rim} />
      <circle cx="50" cy="50" r="38" fill={core} />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke={rim} strokeWidth="6" strokeOpacity=".6" />
    </svg>
  );
}

/** Круглое тиснение «П4»: слепой оттиск без единого пятна краски. */
export function Emboss({ dateIso, testid }: { dateIso: string; testid?: string }) {
  const p = dateIso.split('-');
  const short = p.length === 3 ? `${p[2]}·${p[1]}·${(p[0] ?? '').slice(2)}` : dateIso;
  return (
    <div className="ec-emboss" data-testid={testid} aria-hidden="true">
      <span>{T('собрано')}</span>
      <i />
      <span>{T('в погреб')}</span>
      <em>{short}</em>
    </div>
  );
}

export function ExportPassportCard({
  record,
  recordNumber,
  theme,
  stamp = true,
}: {
  record: TastingRecord;
  /** Номер записи в погребе; null — черновик. */
  recordNumber: number | null;
  theme: CardThemeId;
  /** Тиснение «П4» — на печатных поверхностях включено по умолчанию. */
  stamp?: boolean;
}) {
  const id = record.identity;
  const t = typeOf(id);
  const style: StyleTrio = id.style ? STYLE_TRIO[id.style] ?? IDLE_TRIO : IDLE_TRIO;
  const { core, rim } = wineDisc(record);

  const vintageYear = /^\d{4}$/.test(id.vintage.trim()) ? id.vintage.trim() : '';
  const typeLine = [T(TYPE_WORDS[t]), id.style ? T(style.w) : ''].filter(Boolean).join(' ');
  const cy = [id.region, id.country].filter(Boolean).join(' · ');
  const abvShown = id.abv !== null ? f1(id.abv) : null;
  const no = recordNumber !== null ? `${T('запись')} № ${recordNumber}` : T('черновик');
  const date = ruDate(id.dateTasted);

  const cls = `ec-card ec-${theme}`;

  if (theme === 'burgundy') {
    return (
      <div className={cls} data-testid="export-card">
        <div className="ec-band">
          <div className="ec-nm">{id.name || T('Название вина')}</div>
          {vintageYear && <div className="ec-year">{vintageYear}</div>}
        </div>
        <div className="ec-grid">
          <div className="ec-cell"><u>{T('регион')}</u><s>{cy || '—'}</s></div>
          <div className="ec-cell"><u>{T('сорт')}</u><s>{id.grapes || '—'}</s></div>
          <div className="ec-cell"><u>{T('алкоголь')}</u><s>{abvShown ? `${abvShown}%` : '—'}</s></div>
          <div className="ec-cell"><u>{T('дегустация')}</u><s>{date}</s></div>
        </div>
        <div className="ec-prod">
          {id.producer ? id.producer : <span className="wght">{T('производитель')}</span>} · {no}
        </div>
        {stamp && <Emboss dateIso={id.dateTasted} testid="export-emboss" />}
      </div>
    );
  }

  if (theme === 'terroir') {
    return (
      <div className={cls} data-testid="export-card">
        <div className="ec-inkstamp">
          {T('дегустировано')}
          <br />
          {date.replace(/\./g, '·').split('·').slice(0, 3).map((x, i) => (
            <span key={i}>{i > 0 ? '·' : ''}{x}</span>
          ))}
        </div>
        <div className="ec-c">
          <div className="ec-nm">{id.name || T('Название вина')}</div>
          <div className="ec-tp">{typeLine}</div>
          <div className="ec-rg">{cy || T('страна · регион')}{vintageYear ? ` · ${vintageYear}` : ''}</div>
          <div className="ec-leaddot" />
          <div className="ec-mt">{[id.grapes || T('сорт'), abvShown ? `${abvShown}%` : null].filter(Boolean).join(' — ')}</div>
        </div>
        {stamp && <Emboss dateIso={id.dateTasted} testid="export-emboss" />}
      </div>
    );
  }

  /* ivory — V1 «Слоновая кость» (дефолт) */
  return (
    <div className={cls} data-testid="export-card">
      <div className="ec-c">
        <div className="ec-cap">{T('паспорт вина')}</div>
        <DiscSvg core={core} rim={rim} />
        <div className="ec-nm">{id.name || T('Название вина')}</div>
        <div className="ec-tp">
          {typeLine}
          {vintageYear ? ` · ${vintageYear}` : ''}
        </div>
        <div className="ec-rule" />
        <div className="ec-rg">{cy || T('страна · регион')}</div>
        <div className="ec-gr">{id.grapes || T('сорт')}</div>
        <div className="ec-mt">
          {[abvShown ? `${abvShown}%` : null, date, no].filter(Boolean).join(' · ')}
        </div>
      </div>
      {stamp && <Emboss dateIso={id.dateTasted} testid="export-emboss" />}
    </div>
  );
}
