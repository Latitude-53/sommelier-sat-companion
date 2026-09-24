/**
 * PassportAlbum (v18) — фотоальбом внизу паспорта, 4 слота.
 *
 * Одобрено на И7/Сборка-V1/V2: пустой слот — пунктир-приглашение с пиктограммой
 * и подсказкой сжатия; у загруженного — вес, кнопка «на карточку» (окно на
 * визитке появляется ТОЛЬКО по этой кнопке, снимается повторным тапом) и ✕.
 * Сжатие — тот же пайплайн (1200px / WebP ~100 КБ), что и раньше.
 */
import { useRef, useState } from 'react';
import { compressPhoto } from '@/db/imageCompressor';
import type { PhotoAttachment } from '@/types/tasting';
import type { PhotoRole } from '@/types/wset';
import { T } from '@/lib/tr';
import { vibrate } from '@/lib/haptics';

interface SlotSpec {
  role: PhotoRole;
  icon: string;
  nm: string;
  cm: string;
}

const SLOTS: SlotSpec[] = [
  { role: 'label', icon: '▣', nm: 'Аверс', cm: 'этикетка · авто-сжатие ~100 КБ' },
  { role: 'label-back', icon: '▢', nm: 'Реверс', cm: 'контрэтикетка · ~100 КБ' },
  { role: 'glass', icon: '◍', nm: 'Бокал', cm: 'вид при свете' },
  { role: 'cork', icon: '✦', nm: 'Пробка · капсула', cm: 'осадок, год, печать' },
];

export function PassportAlbum({
  photos,
  cardPhotoId,
  onAddPhoto,
  onRemovePhoto,
  onSetCardPhoto,
}: {
  photos: PhotoAttachment[];
  cardPhotoId: string | null;
  onAddPhoto: (role: PhotoRole, photo: { dataUrl: string; width: number; height: number; sizeKb: number }) => void;
  onRemovePhoto: (photoId: string) => void;
  onSetCardPhoto: (photoId: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRole = useRef<PhotoRole | null>(null);
  const [busy, setBusy] = useState<PhotoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoOf = (role: PhotoRole): PhotoAttachment | null => photos.find((p) => p.role === role) ?? null;

  const handleFile = async (file: File, role: PhotoRole): Promise<void> => {
    busyRole.current = role;
    setBusy(role);
    setError(null);
    try {
      const compressed = await compressPhoto(file);
      onAddPhoto(role, compressed);
      vibrate(12);
    } catch (e) {
      setError(e instanceof Error ? e.message : T('Не удалось обработать фото'));
    } finally {
      setBusy(null);
      busyRole.current = null;
    }
  };

  return (
    <div className="pw-alb">
      <div className="pw-alb-h">
        <b>{T('Фотоальбом · внизу паспорта')}</b>
        <span>{T('пусто — фото не обязательны · загрузили — появилось и решайте сами')}</span>
      </div>
      <div className="pw-alg">
        {SLOTS.map((slot) => {
          const ph = photoOf(slot.role);
          const onCard = ph !== null && cardPhotoId === ph.id;
          return (
            <div key={slot.role} className="pw-aslot-wrap" data-slot={slot.role}>
              {ph ? (
                <div className="pw-afull">
                  <img src={ph.dataUrl} alt={T(slot.nm)} />
                  <div className="pw-afull-meta">
                    <span className="pw-anm">{T(slot.nm)}</span>
                    <span className="pw-acm">
                      {T('загружено')} · {ph.sizeKb} {T('КБ')}
                    </span>
                  </div>
                  <div className="pw-abtns">
                    <button
                      type="button"
                      className={`pw-abtn${onCard ? ' on' : ''}`}
                      onClick={() => {
                        vibrate(8);
                        onSetCardPhoto(onCard ? null : ph.id);
                      }}
                    >
                      {onCard ? T('на карте ✓') : T('на карточку')}
                    </button>
                    <button
                      type="button"
                      className="pw-abtn x"
                      aria-label={`${T('Удалить')}: ${T(slot.nm)}`}
                      onClick={() => {
                        vibrate(8);
                        if (onCard) onSetCardPhoto(null);
                        onRemovePhoto(ph.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`pw-aslot${busy === slot.role ? ' busy' : ''}`}
                  onClick={() => {
                    busyRole.current = slot.role;
                    inputRef.current?.click();
                  }}
                >
                  <span className="ic">{busy === slot.role ? '◌' : slot.icon}</span>
                  <span className="nm">{busy === slot.role ? T('Сжимаю…') : T(slot.nm)}</span>
                  <span className="cm">{T(slot.cm)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="pw-aerr">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const role = busyRole.current ?? 'label';
          if (f) void handleFile(f, role);
          e.target.value = '';
        }}
      />
    </div>
  );
}
