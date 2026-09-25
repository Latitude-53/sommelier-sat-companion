import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { compressPhoto } from '@/db/imageCompressor';
import { vibrate } from '@/lib/haptics';
import { T } from '@/lib/tr';

/** Зона фото: загрузка → компрессия (1200px, WebP q0.75) → превью.
 *  variant: 'large' — крупные слоты этикеток, 'compact' — второстепенные (бокал, пробка). */
export function PhotoDrop({
  src,
  onPhoto,
  onRemove,
  label,
  role,
  variant = 'large',
}: {
  src: string | null;
  onPhoto: (p: { dataUrl: string; width: number; height: number; sizeKb: number }) => void;
  onRemove: () => void;
  label: string;
  role: string;
  variant?: 'large' | 'compact';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      /* v22 hardening: тип и размер проверяются ДО компрессии — гигантский
       * файл не должен даже заходить в decode/canvas (память, DoS себе же). */
      if (!file.type.startsWith('image/')) {
        setError(T('Это не изображение'));
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        setError(T('Файл слишком большой: лимит 30 МБ'));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const compressed = await compressPhoto(file);
        onPhoto({ dataUrl: compressed.dataUrl, width: compressed.width, height: compressed.height, sizeKb: compressed.sizeKb });
        vibrate(12);
      } catch (e) {
        setError(e instanceof Error ? e.message : T('Не удалось обработать фото'));
      } finally {
        setBusy(false);
      }
    },
    [onPhoto],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`relative rounded-xl border border-dashed transition-colors overflow-hidden ${drag ? 'border-gold bg-gold/10' : 'border-hairline bg-cellar-deep/50'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
      >
        {src ? (
          <div className="relative group">
            <img
              src={src}
              alt={label}
              className={`w-full object-cover ${variant === 'large' ? 'aspect-[4/3]' : 'aspect-[21/9]'}`}
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label={`${T('Удалить')} ${label.toLowerCase()}`}
              className="absolute top-2 right-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-black/65 text-[#f0a49b] hover:bg-black/85 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`w-full min-h-[44px] flex flex-col items-center justify-center gap-1.5 text-ink-faint hover:text-gold-soft transition ${
              variant === 'large' ? 'aspect-[4/3] gap-2' : 'aspect-[21/9] py-3'
            }`}
          >
            {busy ? <Loader2 size={variant === 'large' ? 24 : 18} className="animate-spin" /> : <ImagePlus size={variant === 'large' ? 24 : 18} />}
            <span className={variant === 'large' ? 'text-[12.5px] font-medium' : 'text-[11px]'}>{busy ? T('Сжимаю…') : label}</span>
            {!busy && variant === 'large' && <span className="text-[10px] opacity-70">{T('авто-сжатие до ~100 КБ')}</span>}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] uppercase tracking-widest text-ink-faint">{role}</span>
        {error ? <span className="text-[10px] text-[#f0a49b]">{T(error)}</span> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
