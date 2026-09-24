import { Image, PenLine, UtensilsCrossed, X } from 'lucide-react';
import type { MediaData, TastingRecord } from '@/types/tasting';
import type { PhotoRole } from '@/types/wset';
import { PHOTO_ROLE_LABELS } from '@/lib/catalog';
import { SectionCard } from '@/components/common/SectionCard';
import { PhotoDrop } from '@/components/common/PhotoDrop';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

const GASTRO_PRESETS = ['устрицы', 'белое мясо', 'большая рыба', 'ягнёнок', 'утка', 'трюфельная паста', 'сыры с голубой плесенью', 'дичь', 'суши', 'паэлья', 'ризотто с белыми грибами', 'бри'];
const EMOJI_PRESETS = ['🍷', '🥂', '🌊', '🔥', '🌲', '🍋', '🍒', '🫐', '🥩', '🧀', '💎', '🌙'];

/** Раздел «Ассоциации»: moodboard-фото, образ, эмодзи-теги, гастрономия, заметки. */
export function MediaSection({
  record,
  onPatch,
  onAddPhoto,
  onRemovePhoto,
}: {
  record: TastingRecord;
  onPatch: (patch: Partial<MediaData>) => void;
  onAddPhoto: (role: PhotoRole, photo: { dataUrl: string; width: number; height: number; sizeKb: number }) => void;
  onRemovePhoto: (photoId: string) => void;
}) {
  const media = record.media;
  const { t } = useLang();
  const moodboard = record.photos.find((ph) => ph.role === 'moodboard') ?? null;

  const toggleFrom = (list: string[], item: string): string[] =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  return (
    <SectionCard title={t.sections.media} subtitle="Moodboard, образ, гастрономия, свободные заметки">
      {/* Moodboard + ассоциативный образ: фото (закат, блюдо, атмосфера)
          и текст живут рядом — одно настроение, два носителя. */}
      <div className="mb-5 grid sm:grid-cols-2 gap-4">
        <div>
          <PhotoDrop
            label={T(PHOTO_ROLE_LABELS.moodboard)}
            role={T(PHOTO_ROLE_LABELS.moodboard)}
            src={moodboard?.dataUrl ?? null}
            onPhoto={(p) => onAddPhoto('moodboard', p)}
            onRemove={() => {
              if (moodboard) onRemovePhoto(moodboard.id);
            }}
          />
          <p className="text-[10.5px] text-ink-faint mt-1.5 leading-snug">
            {T('Закат, блюдо, атмосфера — тот же пайплайн сжатия: 1200px / WebP q0.75.')}
          </p>
        </div>
        <label className="block">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
            <Image size={12} /> {T('Ассоциативный образ')}
          </span>
          <textarea
            value={media.image}
            onChange={(e) => onPatch({ image: e.target.value })}
            rows={7}
            placeholder={T('Вечерний пляж после грозы: мокрые камни, соль на губах, лимонная цедра на ветру…')}
            className="w-full h-full min-h-[160px] px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
          />
        </label>
      </div>

      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-2">{T('Эмодзи-теги')}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onPatch({ emojis: toggleFrom(media.emojis, e) })}
              className={`min-h-[44px] min-w-[44px] text-xl rounded-xl border transition-all active:scale-[0.95] ${
                media.emojis.includes(e) ? 'border-gold bg-gold/15' : 'border-hairline opacity-60 hover:opacity-100'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        {media.emojis.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {media.emojis.map((e) => (
              <span key={e} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 border border-hairline text-sm">
                {e}
                <button type="button" aria-label={T('Убрать') + ` ${e}`} onClick={() => onPatch({ emojis: media.emojis.filter((x) => x !== e) })}>
                  <X size={12} className="text-ink-faint hover:text-ink" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-2">
          <UtensilsCrossed size={12} /> {T('Гастрономические пары')}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {GASTRO_PRESETS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onPatch({ gastronomy: toggleFrom(media.gastronomy, g) })}
              className={`min-h-[38px] px-3 rounded-lg text-[12px] border transition-all active:scale-[0.97] ${
                media.gastronomy.includes(g) ? 'border-sage bg-sage/15 text-sage-juicy font-semibold' : 'border-hairline text-ink-dim hover:text-ink'
              }`}
            >
              {T(g)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={T('Своя пара: каре ягнёнка в травах…')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) {
                  onPatch({ gastronomy: [...new Set([...media.gastronomy, v])] });
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
            className="flex-1 h-11 px-3.5 rounded-xl bg-cellar-deep border border-hairline text-sm focus:border-gold focus:outline-none"
          />
        </div>
        {media.gastronomy.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {media.gastronomy
              .filter((g) => !GASTRO_PRESETS.includes(g))
              .map((g) => (
                <span key={g} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 border border-hairline text-[12px]">
                  {g}
                  <button type="button" aria-label={T('Убрать') + ` ${g}`} onClick={() => onPatch({ gastronomy: media.gastronomy.filter((x) => x !== g) })}>
                    <X size={12} className="text-ink-faint hover:text-ink" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      <label className="block">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
          <PenLine size={12} /> {T('Свободные заметки')}
        </span>
        <textarea
          value={media.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
          rows={4}
          placeholder={T('Всё, что не влезло в шкалы: контекст, компания, погода, минеральные акценты…')}
          className="w-full px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
        />
      </label>
    </SectionCard>
  );
}
