/**
 * Паспорт вина (v18) — рерайт «Титула» по одобренной компоновке
 * «Три касания / Три полосы» (Сборка-V2):
 *
 *   шаг 1 «Что в бокале» — название (призрак), тип (шапка карты реагирует),
 *                          цвет-основа, флаги слепой/из погреба;
 *   шаг 2 «Откуда»       — страна · регион · сорт, призрак из памяти дегустаций;
 *   шаг 3 «Детали»       — хронограф X (винтаж, линейка во всю ширину,
 *                          максимум = год устройства), крепость ±0,5, дата
 *                          дегустации (авто-сегодня), цена (Pro), производитель.
 *
 * Справа живёт визитка «Бумага», внизу — фотоальбом (4 слота) с честной
 * установкой фото «на карточку». Пресеты стилей сохранены (кнопка в шапке).
 */
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { TastingRecord, WineIdentity } from '@/types/tasting';
import type { PhotoRole } from '@/types/wset';
import { WINE_PRESETS, type WinePreset } from '@/lib/catalog';
import { Modal } from '@/components/common/Modal';
import { SectionCard } from '@/components/common/SectionCard';
import { GhostInput } from '@/components/passport/GhostInput';
import { VintageChrono } from '@/components/passport/VintageChrono';
import { WinePassportCard } from '@/components/passport/WinePassportCard';
import { PassportAlbum } from '@/components/passport/PassportAlbum';
import {
  ABV_MAX,
  ABV_MIN,
  STYLE_TRIO,
  TYPE_ABV,
  f1,
  ghostEntriesFor,
  typeOf,
  typeFlags,
  type WineTypeKey,
} from '@/lib/passport';
import { listTastings } from '@/db';
import { vibrate } from '@/lib/haptics';
import { useTasting } from '@/state/TastingProvider';
import { T } from '@/lib/tr';

/** Метка поля в панели шага. */
function FLab({ children }: { children: React.ReactNode }) {
  return <div className="pw-flab">{children}</div>;
}

/** Модалка выбора пресетов — сохранена с прежнего Титула. */
function PresetModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (preset: WinePreset) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={T('Пресеты стилей')} wide>
      <p className="text-[12px] text-ink-faint mb-3.5">
        {T('Типовая карточка известного стиля: паспорт, цвет, ароматы и структура заполняются в один тап. Дальше просто правьте значения под ваше вино.')}
      </p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {WINE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              vibrate(10);
              onApply(preset);
            }}
            className="text-left rounded-xl border border-hairline bg-cellar-deep/50 p-3.5 hover:border-gold/60 hover:bg-gold/5 transition-all active:scale-[0.98]"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-xl leading-none mt-0.5">{preset.emoji}</span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink">{T(preset.title)}</p>
                <p className="text-[11.5px] text-ink-dim mt-0.5 leading-snug">{T(preset.desc)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

const STEPS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: 'Что в бокале' },
  { n: 2, label: 'Откуда' },
  { n: 3, label: 'Детали' },
];

export function TitulSection({
  record,
  onPatchIdentity,
  onApplyPreset,
  onAddPhoto,
  onRemovePhoto,
  onSetCardPhoto,
}: {
  record: TastingRecord;
  onPatchIdentity: (patch: Partial<WineIdentity>) => void;
  onApplyPreset: (preset: WinePreset) => void;
  onAddPhoto: (role: PhotoRole, photo: { dataUrl: string; width: number; height: number; sizeKb: number }) => void;
  onRemovePhoto: (photoId: string) => void;
  onSetCardPhoto: (photoId: string | null) => void;
}) {
  const { isPro, libIdentities } = useTasting();
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recordNumber, setRecordNumber] = useState<number | null>(null);

  const id = record.identity;
  const t = typeOf(id);

  /* Номер записи в погребе — порядок создания; до явного «Сохранить» — черновик. */
  useEffect(() => {
    let alive = true;
    void listTastings().then((all) => {
      if (!alive) return;
      if (record.draft) {
        setRecordNumber(null);
        return;
      }
      const chrono = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const idx = chrono.findIndex((r) => r.id === record.id);
      setRecordNumber(idx >= 0 ? idx + 1 : null);
    });
    return () => {
      alive = false;
    };
  }, [record.id, record.draft]);

  /* Память призрака: частоты паспортных полей по всем дегустациям погреба. */
  const ghostEntries = useMemo(
    () => ({
      name: ghostEntriesFor(libIdentities, 'name'),
      country: ghostEntriesFor(libIdentities, 'country'),
      region: ghostEntriesFor(libIdentities, 'region'),
      grapes: ghostEntriesFor(libIdentities, 'grapes'),
      producer: ghostEntriesFor(libIdentities, 'producer'),
    }),
    [libIdentities],
  );

  const setType = (k: WineTypeKey): void => {
    vibrate(8);
    onPatchIdentity({ ...typeFlags(k), abv: TYPE_ABV[k] });
  };

  const abvAdj = (d: number): void => {
    const base = id.abv ?? TYPE_ABV[t];
    const next = Math.min(ABV_MAX, Math.max(ABV_MIN, base + d));
    vibrate(6);
    onPatchIdentity({ abv: Math.round(next * 10) / 10 });
  };

  /* Сумма-строка: паспорт собрался сам, как только есть имя и происхождение. */
  const assembled = id.name.trim() !== '' && (id.country.trim() !== '' || id.grapes.trim() !== '');
  const sumParts = [id.name, (/^\d{4}$/.test(id.vintage.trim()) ? id.vintage.trim() : ''), id.grapes, [id.region, id.country].filter(Boolean).join(' · ')].filter(Boolean);

  return (
    <SectionCard
      title={T('Паспорт вина')}
      subtitle={T('Три касания: бокал · происхождение · детали')}
      badge={
        /* v19: пресеты — Pro-поверхность; в WSET-проходе кнопки нет. */
        isPro ? (
          <button
            type="button"
            onClick={() => {
              vibrate(8);
              setPresetsOpen(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl border border-gold/50 bg-gold/10 text-[12px] font-semibold text-gold-soft hover:bg-gold/15 transition-all active:scale-[0.97]"
          >
            <Sparkles size={14} /> {T('Пресеты')}
          </button>
        ) : undefined
      }
    >
      {isPro && (
        <PresetModal
          open={presetsOpen}
          onClose={() => setPresetsOpen(false)}
          onApply={(preset) => {
            setPresetsOpen(false);
            onApplyPreset(preset);
          }}
        />
      )}

      {/* ── Шаги + панель · визитка ── */}
      <div className="pw-grid">
        <div className="pw-main min-w-0">
          <div className="pw-steps" role="tablist" aria-label={T('Шаги паспорта')}>
            {STEPS.map((s) => (
              <button
                key={s.n}
                type="button"
                role="tab"
                aria-selected={step === s.n}
                className={`pw-step${step === s.n ? ' on' : ''}`}
                onClick={() => {
                  vibrate(6);
                  setStep(s.n);
                }}
              >
                <b>{s.n}</b> {T(s.label)}
              </button>
            ))}
          </div>

          <div className="pw-panel">
            {step === 1 && (
              <>
                <div className="pw-frow">
                  <FLab>{T('название')}</FLab>
                  <GhostInput
                    kind="name"
                    entries={ghostEntries.name}
                    value={id.name}
                    onChange={(v) => onPatchIdentity({ name: v })}
                    placeholder={T('например, Бароло Ризерва')}
                  />
                </div>
                <div className="pw-frow">
                  <FLab>{T('тип · шапка реагирует')}</FLab>
                  <div className="pw-chips">
                    {(['q', 'p', 'f'] as WineTypeKey[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`pw-mchip${t === k ? ' on' : ''}`}
                        onClick={() => setType(k)}
                      >
                        {k === 'q' ? T('тихое') : k === 'p' ? T('игристое · мюзле') : T('креплёное · янтарь')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pw-frow">
                  <FLab>{T('цвет')}</FLab>
                  <div className="pw-bigcards">
                    {(Object.entries(STYLE_TRIO) as [keyof typeof STYLE_TRIO, (typeof STYLE_TRIO)[keyof typeof STYLE_TRIO]][]).map(
                      ([k, st]) => (
                        <button
                          key={k}
                          type="button"
                          className={`pw-bc${id.style === k ? ' on' : ''}`}
                          onClick={() => {
                            vibrate(8);
                            onPatchIdentity({ style: k });
                          }}
                        >
                          <span className="cdot" style={{ background: st.trio[0] }} />
                          <span className="t">{T(st.w)}</span>
                          <span className="d">{T(st.d)}</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div className="pw-frow" style={{ marginBottom: 2 }}>
                  <FLab>{T('флаги')}</FLab>
                  <div className="pw-flags">
                    <button
                      type="button"
                      className={`pw-flag${id.blind ? ' on' : ''}`}
                      onClick={() => {
                        vibrate(6);
                        onPatchIdentity({ blind: !id.blind });
                      }}
                    >
                      {T('слепая дегустация')}
                    </button>
                    <button
                      type="button"
                      className={`pw-flag${id.cellar ? ' on' : ''}`}
                      onClick={() => {
                        vibrate(6);
                        onPatchIdentity({ cellar: !id.cellar });
                      }}
                    >
                      {T('из погреба')}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="pw-frow">
                  <FLab>{T('страна')}</FLab>
                  <GhostInput
                    kind="country"
                    entries={ghostEntries.country}
                    value={id.country}
                    onChange={(v) => onPatchIdentity({ country: v })}
                    placeholder={T('например, Италия')}
                  />
                </div>
                <div className="pw-frow">
                  <FLab>{T('регион')}</FLab>
                  <GhostInput
                    kind="region"
                    entries={ghostEntries.region}
                    value={id.region}
                    onChange={(v) => onPatchIdentity({ region: v })}
                    placeholder={T('например, Пьемонт')}
                  />
                </div>
                <div className="pw-frow" style={{ marginBottom: 9 }}>
                  <FLab>{T('сорт')}</FLab>
                  <GhostInput
                    kind="grapes"
                    entries={ghostEntries.grapes}
                    value={id.grapes}
                    onChange={(v) => onPatchIdentity({ grapes: v })}
                    placeholder={T('например, Неббиоло')}
                  />
                </div>
                <div className="pw-gstatus">
                  {T('Призрак приходит из памяти дегустаций — серый хвост вдоль текста и кнопка справа, никаких всплывающих списков. Enter — запомнить новое.')}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="pw-frow" style={{ marginBottom: 8 }}>
                  <VintageChrono vintage={id.vintage} onChange={(v) => onPatchIdentity({ vintage: v })} />
                </div>
                <div className="pw-detgrid">
                  <div>
                    <FLab>{T('крепость · ±0,5')}</FLab>
                    <div className="pw-ystp">
                      <button type="button" aria-label={T('−0,5')} onClick={() => abvAdj(-0.5)}>
                        −
                      </button>
                      <span className="pw-yval">
                        <b>{f1(id.abv ?? TYPE_ABV[t])}%</b>
                      </span>
                      <button type="button" aria-label={T('+0,5')} onClick={() => abvAdj(0.5)}>
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <FLab>{T('дата дегустации')}</FLab>
                    <input
                      className="pw-in"
                      type="date"
                      value={id.dateTasted}
                      onChange={(e) => {
                        if (e.target.value) onPatchIdentity({ dateTasted: e.target.value });
                      }}
                    />
                  </div>
                  {isPro && (
                    <div>
                      <FLab>{T('цена')}</FLab>
                      <input
                        className="pw-in"
                        value={id.price}
                        onChange={(e) => onPatchIdentity({ price: e.target.value })}
                        placeholder="38 €"
                      />
                    </div>
                  )}
                  <div className={isPro ? '' : 'pw-span2'}>
                    <FLab>{T('производитель · призрак')}</FLab>
                    <GhostInput
                      kind="producer"
                      entries={ghostEntries.producer}
                      value={id.producer}
                      onChange={(v) => onPatchIdentity({ producer: v })}
                      placeholder={T('например, Fontanafredda')}
                    />
                  </div>
                </div>
                <div className="pw-gstatus">
                  {T('Максимум — год устройства')} ({new Date().getFullYear()}) · {T('дата — авто-сегодня')}
                </div>
              </>
            )}
          </div>

          <div className={`pw-sum${assembled ? '' : ' idle'}`}>
            {assembled ? (
              <span>
                {T('Паспорт собран:')} {sumParts.join(' · ')}
              </span>
            ) : (
              <span>{T('Заполните шаги — паспорт соберётся сам')}</span>
            )}
          </div>
        </div>

        {/* ── Визитка «Бумага» ── */}
        <div className="pw-cardcol">
          <WinePassportCard record={record} recordNumber={recordNumber} />
        </div>
      </div>

      {/* ── Фотоальбом: внизу паспорта, фото не обязательны ── */}
      <PassportAlbum
        photos={record.photos}
        cardPhotoId={record.cardPhotoId}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
        onSetCardPhoto={onSetCardPhoto}
      />
    </SectionCard>
  );
}
