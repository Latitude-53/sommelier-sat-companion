/**
 * Автономный HTML-экспорт (v19) — один самодостаточный файл в дизайн-системе
 * «Витрина»: та же ось, что и у печати, визитка в теме пользователя
 * (Слоновая кость / Бургундия / Терруар) с тиснением «П4», мета и секции SAT
 * по центральной оси. Ассоциации и фотографии — на «странице 2»
 * (при печати из файла честно уезжают на отдельный лист).
 *
 * Инлайновые стили, сенсорная лента профиля, сжатые фото data-URL.
 * Открывается офлайн в любом браузере.
 */
import type { TastingRecord } from '@/types/tasting';
import { T, getTrLang } from '@/lib/tr';
import type { ProfileAxis } from '@/engine/structuralProfile';
import type { Digest } from './digest';
import { buildTxt } from './serializers';
import { PHOTO_ROLE_LABELS, QUALITY_OPTS } from '@/lib/catalog';
import { TYPE_WORDS, STYLE_TRIO, IDLE_TRIO, f1, ruDate, typeOf, type StyleTrio } from '@/lib/passport';
import type { CardThemeId } from '@/lib/exportTheme';

/* v22 hardening: + одинарная кавычка — полное закрытие атрибутного контекста
 * (все интерполяции в двойных кавычках, но защита не полагается на дисциплину). */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* v22 hardening: HEX-цвет валидируется белым списком до попадания в SVG-атрибут.
 * Ядро/кайма летят в fill="..." без esc — злая запись из бэкапа (тот же
 * threat-model, что и у фото-белого списка M4) не должна вырваться из атрибута. */
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeHex(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX_RE.test(v) ? v : fallback;
}

/* M4 (аудит v12): фото попадают в экспорт только в строгом формате
 * data:image/<png|jpeg|jpg|webp|gif>;base64 — белый список гарантирует,
 * что злая запись из бэкапа не может вырваться из атрибута src и внедрить
 * HTML/JS в автономный файл. svg+xml сознательно исключён: SVG умеет нести
 * скрипты. Компрессор выдаёт только webp/jpeg — легитимные фото проходят. */
const DATA_URL_RE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/** Валидирует формат dataUrl и санитизирует кавычки (вторая линия обороны). */
function safePhotoSrc(dataUrl: string): string | null {
  if (typeof dataUrl !== 'string' || !DATA_URL_RE.test(dataUrl)) return null;
  return dataUrl.replace(/["'\\]/g, '');
}

/** Короткая дата «24·09·26» для штампов. */
function shortDate(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}·${p[1]}·${(p[0] ?? '').slice(2)}` : esc(iso);
}

/** Сенсорная лента строкой: бары по всем осям, отсутствие данных —
 *  честные пунктирные прочерки «н/о» на своих строках. */
function sensoryBarsHtml(allAxes: ProfileAxis[]): string {
  const row = (a: ProfileAxis): string => {
    const label = esc(T(a.label));
    if (a.contributions.length === 0) {
      return `<div class="brow brow-na"><span class="bl">${label}</span><span class="btrack-na"></span><span class="bna">${esc(T('н/о'))}</span></div>`;
    }
    const val = Math.max(0, Math.min(10, a.value));
    return `<div class="brow"><span class="bl">${label}</span><span class="btrack"><span class="bfill" style="width:${(val * 10).toFixed(1)}%"></span><span class="bticks"></span></span><span class="bval">${val.toFixed(1)}</span></div>`;
  };
  return `<div class="bars">${allAxes.map(row).join('')}</div>`;
}

function discSvg(record: TastingRecord, size = 34): string {
  const style: StyleTrio = record.identity.style ? STYLE_TRIO[record.identity.style] ?? IDLE_TRIO : IDLE_TRIO;
  const core = safeHex(record.eye.coreHex, style.trio[1] ?? '#7a2e35');
  const rim = safeHex(record.eye.rimHex, style.trio[0] ?? core);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="47" fill="${rim}"/>
    <circle cx="50" cy="50" r="38" fill="${core}"/>
    <circle cx="50" cy="50" r="43.5" fill="none" stroke="${rim}" stroke-width="6" stroke-opacity="0.6"/>
  </svg>`;
}

function discSvgBig(record: TastingRecord, size = 110): string {
  const style: StyleTrio = record.identity.style ? STYLE_TRIO[record.identity.style] ?? IDLE_TRIO : IDLE_TRIO;
  const core = safeHex(record.eye.coreHex, style.trio[1] ?? '#4a3b3b');
  const rim = safeHex(record.eye.rimHex, style.trio[0] ?? core);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="47" fill="${rim}"/>
    <circle cx="50" cy="50" r="38" fill="${core}"/>
    <circle cx="50" cy="50" r="43.5" fill="none" stroke="${rim}" stroke-width="6" stroke-opacity="0.65"/>
    <circle cx="50" cy="50" r="47" fill="none" stroke="#00000022" stroke-width="1"/>
  </svg>`;
}

function table(pairs: [string, string][]): string {
  if (pairs.length === 0) return '<p class="muted">—</p>';
  return `<table>${pairs.map(([k, v]) => `<tr><th>${esc(T(k))}</th><td>${esc(T(v))}</td></tr>`).join('')}</table>`;
}

/* ── Визитка «Витрина» (строковая версия для автономного файла) ─────────── */

function embossHtml(record: TastingRecord): string {
  return `<div class="ec-emboss" aria-hidden="true"><span>${esc(T('собрано'))}</span><i></i><span>${esc(T('в погреб'))}</span><em>${shortDate(record.identity.dateTasted)}</em></div>`;
}

function exportCardHtml(record: TastingRecord, theme: CardThemeId, recordNumber: number | null): string {
  const id = record.identity;
  const t = typeOf(id);
  const style: StyleTrio = id.style ? STYLE_TRIO[id.style] ?? IDLE_TRIO : IDLE_TRIO;
  const vintageYear = /^\d{4}$/.test(id.vintage.trim()) ? esc(id.vintage.trim()) : '';
  const typeLine = esc([T(TYPE_WORDS[t]), id.style ? T(style.w) : ''].filter(Boolean).join(' '));
  const cy = esc([id.region, id.country].filter(Boolean).join(' · '));
  const abvShown = id.abv !== null ? f1(id.abv) : null;
  const no = recordNumber !== null ? `${esc(T('запись'))} № ${recordNumber}` : esc(T('черновик'));
  const date = esc(ruDate(id.dateTasted));
  const nm = esc(id.name) || esc(T('Название вина'));

  if (theme === 'burgundy') {
    return `<div class="ec-card ec-burgundy">
      <div class="ec-band"><div class="ec-nm">${nm}</div>${vintageYear ? `<div class="ec-year">${vintageYear}</div>` : ''}</div>
      <div class="ec-grid">
        <div class="ec-cell"><u>${esc(T('регион'))}</u><s>${cy || '—'}</s></div>
        <div class="ec-cell"><u>${esc(T('сорт'))}</u><s>${esc(id.grapes) || '—'}</s></div>
        <div class="ec-cell"><u>${esc(T('алкоголь'))}</u><s>${abvShown ? `${abvShown}%` : '—'}</s></div>
        <div class="ec-cell"><u>${esc(T('дегустация'))}</u><s>${date}</s></div>
      </div>
      <div class="ec-prod">${esc(id.producer) || esc(T('производитель'))} · ${no}</div>
      ${embossHtml(record)}
    </div>`;
  }

  if (theme === 'terroir') {
    return `<div class="ec-card ec-terroir">
      <div class="ec-inkstamp">${esc(T('дегустировано'))}<br>${shortDate(record.identity.dateTasted)}</div>
      <div class="ecc">
        <div class="ec-nm">${nm}</div>
        <div class="ec-tp">${typeLine}</div>
        <div class="ec-rg">${cy || esc(T('страна · регион'))}${vintageYear ? ` · ${vintageYear}` : ''}</div>
        <div class="ec-leaddot"></div>
        <div class="ec-mt">${esc([id.grapes || T('сорт'), abvShown ? `${abvShown}%` : null].filter(Boolean).join(' — '))}</div>
      </div>
      ${embossHtml(record)}
    </div>`;
  }

  /* ivory */
  return `<div class="ec-card ec-ivory">
    <div class="ecc">
      <div class="ec-cap">${esc(T('паспорт вина'))}</div>
      ${discSvg(record)}
      <div class="ec-nm">${nm}</div>
      <div class="ec-tp">${typeLine}${vintageYear ? ` · ${vintageYear}` : ''}</div>
      <div class="ec-rule"></div>
      <div class="ec-rg">${cy || esc(T('страна · регион'))}</div>
      <div class="ec-gr">${esc(id.grapes) || esc(T('сорт'))}</div>
      <div class="ec-mt">${[abvShown ? `${abvShown}%` : null, date, no].filter((x): x is string => x !== null).map(esc).join(' · ')}</div>
    </div>
    ${embossHtml(record)}
  </div>`;
}

/* ── Общие стили визитки (копия печатных токенов из index.css) ──────────── */

const CARD_CSS = `
  .ec-card{position:relative;width:100%;max-width:440px;aspect-ratio:85/55;border-radius:5px;overflow:hidden;
    box-shadow:0 6px 22px rgba(0,0,0,.26);margin:0 auto;font-family:Georgia,'Times New Roman',serif;text-align:center}
  .ecc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5.5% 9%}
  .ec-cap{font-size:9px;letter-spacing:.3em;text-transform:uppercase;position:absolute;top:8.5%;opacity:.7}
  .ec-nm{font-size:25px;font-weight:600;letter-spacing:.06em;line-height:1.1}
  .ec-tp{font-size:9.5px;letter-spacing:.24em;text-transform:uppercase;margin-top:4px}
  .ec-rule{height:0;width:30%;border-top:1px solid #b08d3f;margin:7px auto 0;position:relative}
  .ec-rule:after{content:"";position:absolute;left:50%;top:50%;width:5px;height:5px;transform:translate(-50%,-50%) rotate(45deg);background:#b08d3f}
  .ec-rg{font-size:12.5px;font-style:italic;margin-top:3px}
  .ec-gr{font-size:10.5px;margin-top:2px;color:#5c5140}
  .ec-mt{font-size:8.5px;letter-spacing:.18em;text-transform:uppercase;margin-top:6px;color:#7a6c4e}
  .ec-ivory{background:#f4eedc;color:#33291d;border:1px solid #d9cdb0;outline:1px solid #b08d3f;outline-offset:-9px}
  .ec-ivory .ec-tp{color:#7a6c4e}
  .ec-burgundy{background:#fbf8f1;color:#2b241a}
  .ec-band{position:absolute;top:0;left:0;right:0;height:44%;background:linear-gradient(160deg,#8a3a40,#7a2e35 60%,#5f1f26);
    display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f4eedc}
  .ec-band .ec-nm{letter-spacing:.06em}
  .ec-year{font-size:21px;font-weight:600;color:#e5c179;margin-top:2px}
  .ec-grid{position:absolute;top:46%;left:8%;right:8%;bottom:16%;display:grid;grid-template-columns:1fr 1fr;gap:0 8%}
  .ec-cell{border-bottom:1px solid #e2d9c4;padding:5% 0 3%;display:flex;flex-direction:column;justify-content:flex-end;text-align:center}
  .ec-cell u{font-size:7px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;color:#9a8d70}
  .ec-cell s{text-decoration:none;font-size:11px;margin-top:2px}
  .ec-prod{position:absolute;bottom:5.5%;left:8%;right:8%;text-align:center;font-size:8px;letter-spacing:.26em;text-transform:uppercase;color:#7a6c4e}
  .ec-terroir{background:#d9c6a3;color:#3a2f20;font-family:-apple-system,'Segoe UI',Arial,sans-serif}
  .ec-terroir .ecc{padding:5.5% 22% 5.5% 9%}
  .ec-terroir .ec-nm{font-weight:800;letter-spacing:-.01em;font-size:23px}
  .ec-terroir .ec-rg{font-style:italic;font-family:Georgia,serif;font-size:13px}
  .ec-inkstamp{position:absolute;right:6%;top:12%;width:22%;aspect-ratio:1;border:1.6px solid #8a4a2e;border-radius:50%;
    display:flex;align-items:center;justify-content:center;text-align:center;transform:rotate(-12deg);color:#8a4a2e;
    font-size:6.5px;letter-spacing:.12em;text-transform:uppercase;line-height:1.35;
    box-shadow:inset 0 0 0 2px #d9c6a3,inset 0 0 0 3px #8a4a2e;opacity:.85}
  .ec-leaddot{border-bottom:1px dotted #8a6a48;width:46%;margin:8px auto 0}
  .ec-emboss{position:absolute;right:4.5%;bottom:6%;width:62px;height:62px;border-radius:50%;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    color:rgba(0,0,0,.30);font-size:6.5px;letter-spacing:.14em;text-transform:uppercase;text-align:center;transform:rotate(-8deg);
    box-shadow:-2px -2px 4px rgba(0,0,0,.16),2px 2px 4px rgba(255,255,255,.9),inset 2px 2px 5px rgba(0,0,0,.12),inset -2px -2px 5px rgba(255,255,255,.8)}
  .ec-emboss:before{content:"";position:absolute;inset:7px;border-radius:50%;border:1px solid rgba(0,0,0,.10)}
  .ec-emboss i{width:16px;height:1px;background:rgba(0,0,0,.18);margin:2px 0}
  .ec-emboss em{font-style:normal;letter-spacing:.08em;margin-top:1px;color:rgba(0,0,0,.22)}
`;

/* ── Сборка файла ────────────────────────────────────────────────────────── */

export function buildStandaloneHtml(record: TastingRecord, d: Digest, theme: CardThemeId, recordNumber: number | null): string {
  const isPro = record.mode === 'sommelier-pro';
  /* v22 hardening: числа окна приводятся явно — из бэкапа/IDB может прилететь
   * произвольная строка (TS-типы не защищают рантайм). */
  const winFrom = Number(record.conclusion.windowFrom);
  const winTo = Number(record.conclusion.windowTo);
  const ownWindow =
    record.conclusion.windowFrom !== null && record.conclusion.windowTo !== null
      && Number.isFinite(winFrom) && Number.isFinite(winTo)
      ? `${Math.round(winFrom)}–${Math.round(winTo)}`
      : null;

  const validPhotos = record.photos
    .filter((p) => p.dataUrl.startsWith('data:image/'))
    .slice(0, 8)
    .map((p) => {
      const src = safePhotoSrc(p.dataUrl);
      if (!src) return '';
      const caption = esc(T(PHOTO_ROLE_LABELS[p.role] ?? p.role));
      return `<figure class="photo"><img src="${src}" alt="${caption}"/><figcaption>${caption}</figcaption></figure>`;
    })
    .join('');

  const qualityLabel = record.conclusion.quality
    ? (QUALITY_OPTS.find((q) => q.value === record.conclusion.quality)?.label ?? '')
    : null;

  const hasPage2 = d.media.length > 0 || validPhotos !== '';
  const page2 = hasPage2
    ? `<div class="page2">
        <div class="p2head"><span class="line"></span><span class="cap">${esc(T('страница 2'))} · ${esc(T('ассоциации и фотографии'))}</span><span class="line"></span></div>
        ${d.media.length > 0 ? `<h2>${esc(T('Ассоциативный ряд'))}</h2><div class="card">${table(d.media)}</div>` : ''}
        ${validPhotos ? `<h2>${esc(T('Фотографии'))}</h2><div class="photos">${validPhotos}</div>` : ''}
      </div>`
    : '';

  return `<!doctype html>
<html lang="${getTrLang()}">
<head>
<meta charset="utf-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"/>
<meta name="referrer" content="no-referrer"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(d.title)} — ${esc(T('Дегустационная карта'))}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; background:#ece5d4; color:#2b241a; font:14px/1.55 Georgia,'Times New Roman',serif; }
  .sheet { max-width:840px; margin:26px auto; background:#fbf8f1; padding:42px 50px; box-shadow:0 8px 44px rgba(0,0,0,.14); border-top:6px solid #8a1f2b; text-align:center; }
  .sbrand { font-size:9.5px; letter-spacing:.26em; text-transform:uppercase; color:#8a1f2b; border-bottom:1px solid #e2d9c4; padding-bottom:8px; margin-bottom:14px; }
  h1 { font-size:30px; margin:0 0 4px; letter-spacing:.01em; }
  .sub { color:#6f6a5e; font-style:italic; margin-bottom:20px; }
  .vwrap { display:flex; justify-content:center; margin:4px 0 20px; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:2px 26px; width:86%; margin:0 auto 6px; }
  .mrow { display:flex; justify-content:space-between; gap:12px; border-bottom:1px dotted #d8d1c0; padding:3.5px 0; font-size:12.5px; text-align:left; }
  .mrow b { color:#6f6a5e; font-weight:600; white-space:nowrap; }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:.22em; color:#8a1f2b; margin:22px 0 8px; font-weight:700; }
  .card { background:#fff; border:1px solid #e4ddcc; border-radius:6px; padding:16px 18px; width:86%; margin:0 auto; text-align:left; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; color:#6f6a5e; font-weight:600; width:215px; padding:3.5px 12px 3.5px 0; vertical-align:top; }
  td { padding:3.5px 0; }
  .viz { display:flex; gap:26px; align-items:center; justify-content:center; flex-wrap:wrap; margin:4px 0; }
  .bars { flex:1; min-width:280px; max-width:430px; }
  .brow { display:grid; grid-template-columns:118px 1fr 40px; gap:10px; align-items:center; padding:4px 0; }
  .bl { font-size:12.5px; color:#55504a; font-weight:600; }
  .btrack { position:relative; display:block; height:10px; border-radius:999px; background:#f3efe6; border:1px solid #ddd6c8; }
  .bfill { position:absolute; top:0; bottom:0; left:0; border-radius:999px; background:linear-gradient(90deg,#8a1f2b,#b3524a); }
  .bticks { position:absolute; inset:0; border-radius:999px; background:repeating-linear-gradient(90deg, rgba(29,26,21,.10) 0 1px, transparent 1px 10%); }
  .bval { font-size:12.5px; font-weight:700; color:#8a1f2b; text-align:right; font-variant-numeric:tabular-nums; }
  .brow-na .bl { color:#9a937f; font-weight:500; }
  .btrack-na { display:block; height:10px; border-radius:999px; border:1px dashed #cfc7b2; }
  .bna { font-size:10.5px; color:#9a937f; font-style:italic; text-align:right; }
  .muted { color:#9a937f; }
  .pills { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; justify-content:center; }
  .pill { border:1px solid #8a1f2b; color:#8a1f2b; padding:3px 12px; border-radius:999px; font-size:11px; letter-spacing:.08em; }
  .photos { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
  .photo { margin:0; width:200px; break-inside:avoid; }
  .photo img { width:100%; border-radius:6px; display:block; }
  .photo figcaption { font-size:11px; color:#9a937f; text-transform:uppercase; letter-spacing:.14em; padding-top:4px; }
  .page2 { margin-top:26px; }
  .p2head { display:flex; align-items:center; gap:14px; margin:6px 0 4px; }
  .p2head .line { flex:1; height:1px; background:linear-gradient(90deg,transparent,#c9bd9d,transparent); }
  .p2head .cap { font-size:9.5px; letter-spacing:.3em; text-transform:uppercase; color:#8a1f2b; white-space:nowrap; }
  footer { margin-top:30px; border-top:1px solid #e4ddcc; padding-top:12px; font-size:11.5px; color:#9a937f; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; text-align:left; }
  pre.notes { text-align:left; font:12.5px/1.5 ui-monospace,monospace; background:#faf7f2; padding:14px; border:1px solid #e4ddcc; white-space:pre-wrap; border-radius:6px; }
${CARD_CSS}
  @media print {
    body { background:#fff; }
    .sheet { box-shadow:none; margin:0; max-width:none; padding:0; }
    h2, .card, .viz, table, .photo, .p2head { break-inside:avoid; page-break-inside:avoid; }
    .page2 { break-before:page; page-break-before:always; margin-top:0; }
    @page { size:A4 portrait; margin:12mm 15mm; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="sbrand">Systematic Approach to Tasting® (SAT) · Level 3 · ${esc(T('Дегустационная карта'))}</div>
  <h1>${esc(d.title)}</h1>
  <div class="sub">${esc(d.subtitle)}</div>
  <div class="vwrap">${exportCardHtml(record, theme, recordNumber)}</div>

  ${d.meta.length > 0 ? `<div class="meta">${d.meta.map(([k, v]) => `<div class="mrow"><b>${esc(T(k))}</b><span>${esc(T(v))}</span></div>`).join('')}</div>` : ''}

  <h2>${esc(T('Визуальный паспорт'))}</h2>
  <div class="card"><div class="viz">
    ${discSvgBig(record)}
    <div style="flex:1;min-width:260px">${table(d.eye)}</div>
  </div></div>

  <h2>${esc(T('Нос'))}</h2>
  <div class="card">${table(d.nose)}</div>

  <h2>${esc(T('Рот'))}</h2>
  <div class="card">${table(d.palate)}</div>

  <h2>${esc(T('Структурный профиль (0–10)'))}</h2>
  <div class="card"><div class="viz">
    ${sensoryBarsHtml(d.profile.axes)}
    <div style="flex:1;min-width:260px">${table(d.profile.axes.map((a) => [T(a.label), `${a.value.toFixed(1)}/10 — ${a.contributions.map((c) => `${esc(T(c.label))} ${c.delta >= 0 ? '+' : ''}${c.delta}`).join(', ') || T('база')}`] as [string, string]))}</div>
  </div></div>

  <h2>${esc(T('Итог'))} · BLIC</h2>
  <div class="card">
    ${table(d.conclusion)}
    <div class="pills">
      ${qualityLabel ? `<span class="pill">${esc(T(qualityLabel))}</span>` : ''}
      ${isPro && record.conclusion.score100 !== null && Number.isFinite(Number(record.conclusion.score100))
        ? `<span class="pill">${Math.round(Number(record.conclusion.score100))}/100</span>` : ''}
      ${isPro ? `<span class="pill">${esc(T(d.serving.temperature))}</span>` : ''}
      ${(isPro ? d.serving.window : ownWindow) ? `<span class="pill">${esc(T('Окно питья'))}: ${esc(isPro ? T(d.serving.window) : (ownWindow ?? ''))}</span>` : ''}
    </div>
  </div>

  ${page2}

  <h2>${esc(T('Полная заметка (TXT)'))}</h2>
  <pre class="notes">${esc(buildTxt(record, d))}</pre>

  <footer>
    <span>${esc(T('Дегустационный компаньон'))} · Systematic Approach to Tasting® (SAT) · Level 3</span>
    <span>${esc(record.identity.taster || '—')} · ${esc(record.identity.dateTasted || '—')}</span>
  </footer>
</div>
</body>
</html>`;
}

/** Триггер скачивания файла из строки. */
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Безопасное имя файла по вину. */
export function fileSlug(record: TastingRecord): string {
  const base = [record.identity.producer, record.identity.name, record.identity.vintage]
    .filter(Boolean)
    .join('-')
    .replace(/[^\p{L}\p{N}-]+/gu, '_')
    .slice(0, 60);
  return base || 'degustaciya';
}
