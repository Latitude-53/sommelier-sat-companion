import { PenLine } from 'lucide-react';
import type { EyeData, PerlageData, TastingRecord } from '@/types/tasting';
import {
  CLARITY_CUES,
  CLARITY_OPTS,
  LEGS_OPTS,
  PERLAGE_CUES,
  PERLAGE_OPTS,
  VISUAL_INTENSITY_CUES,
  VISUAL_INTENSITY_OPTS,
  WINE_COLOR_META,
} from '@/lib/catalog';
import { CleanSensoryRail } from '@/components/common/CleanSensoryRail';
import { SectionCard } from '@/components/common/SectionCard';
import { Tooltip } from '@/components/common/Tooltip';
import { InteractiveDisc } from '@/components/visualizers/InteractiveDisc';
import { LivingPerlage } from '@/components/visualizers/LivingPerlage';
import { WineColorControls } from '@/components/visualizers/WineColorControls';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/** Раздел «Глаз»: прозрачность, цвет (диск), перляж, ножки (Pro). */
export function EyeSection({
  record,
  isPro,
  onPatch,
  onPatchPerlage,
}: {
  record: TastingRecord;
  isPro: boolean;
  onPatch: (patch: Partial<EyeData>) => void;
  onPatchPerlage: (patch: Partial<PerlageData>) => void;
}) {
  const eye = record.eye;
  const isSparkling = record.identity.sparkling;
  const { t } = useLang();

  return (
    <SectionCard
      title={t.sections.eye}
      subtitle="Прозрачность, интенсивность, цвет"
      badge={
        <Tooltip
          text="WSET L3: цвет — одна категория (Lemon, Gold, Ruby, Garnet…). Диск рисует градиент от ядра к кайме; «Цвет ядра» и «Цвет каймы (обода)» — независимые селекторы справа. Ножки и ширина каймы — Pro."
        />
      }
    >
      <div className="grid lg:grid-cols-[1fr_250px] gap-6">
        <div>
          <CleanSensoryRail
            label="Прозрачность"
            options={CLARITY_OPTS}
            value={eye.clarity}
            onChange={(v) => onPatch({ clarity: v })}
            cues={CLARITY_CUES}
            tone="sage"
          />
          <CleanSensoryRail
            label="Интенсивность"
            options={VISUAL_INTENSITY_OPTS}
            value={eye.intensity}
            onChange={(v) => onPatch({ intensity: v })}
            cues={VISUAL_INTENSITY_CUES}
          />

          <div className="pb-4 mb-4 border-b border-hairline/60">
            <WineColorControls
              style={record.identity.style}
              coreHex={eye.coreHex}
              rimHex={eye.rimHex}
              onCore={(opt) =>
                onPatch(opt.color ? { coreHex: opt.hex, color: opt.color } : { coreHex: opt.hex })
              }
              onRim={(opt) => onPatch({ rimHex: opt.hex })}
            />
            {/* Категория WSET — чистый appendix: выводится из цвета ядра, не активный контрол. */}
            <p className="mt-4 pt-3 border-t border-hairline/60 text-[11.5px] text-ink-faint leading-snug">
              {T('Приложение — категория WSET')}:{' '}
              <span className="font-semibold text-gold-soft">{eye.color ? T(WINE_COLOR_META[eye.color].label) : '—'}</span>
              {' '}· {T('определяется автоматически по цвету ядра')}
            </p>
          </div>

          {isPro && (
            <>
              <CleanSensoryRail
                label="Ширина каймы"
                options={[
                  { value: 'none', label: 'Нет' },
                  { value: 'narrow', label: 'Узкая' },
                  { value: 'medium', label: 'Средняя' },
                  { value: 'wide', label: 'Широкая' },
                ]}
                value={eye.rimWidth}
                onChange={(v) => onPatch({ rimWidth: v })}
                cues={{
                  none: 'Обода не видно: вино молодое или очень плотное',
                  narrow: 'Тонкая светлая кромка 1–2 мм — возраст не читается',
                  medium: 'Кромка 3–5 мм: первые признаки возраста',
                  wide: 'Широкий прозрачный обод: вино развивается или состарилось',
                }}
              />
              <CleanSensoryRail
                label="Ножки / вязкость"
                hint="авторская фича Pro — в WSET не используется"
                options={LEGS_OPTS}
                value={eye.legs}
                onChange={(v) => onPatch({ legs: v })}
                tone="sage"
                cues={{
                  watery: 'Ножек нет: низкий алкоголь или экстракт',
                  thin: 'Тонкие быстрые ножки — лёгкое тело',
                  medium: 'Умеренные ножки, стекают с секундной задержкой',
                  thick: 'Толстые медленные «слёзы» — глицерин и спирт',
                }}
              />
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint">{T('Диск: ядро → кайма')}</p>
          <InteractiveDisc
            coreHex={eye.coreHex}
            rimHex={eye.rimHex}
            color={eye.color}
            rimWidth={eye.rimWidth}
          />
          <p className="text-[10.5px] text-ink-faint text-center leading-snug">
            {T('Кайма — цвет у стенки бокала: у молодых вин светлее ядра, кирпичный ободок говорит о возрасте. Ядро и кайма задаются независимо; ширина обода управляет градиентом перехода.')}
          </p>
        </div>
      </div>

      {isSparkling && (
        <div className="mt-4 rounded-xl border border-hairline bg-cellar-deep/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-[13px] font-bold text-gold-soft">{T('Перляж и мусс')}</h3>
            <Tooltip text="Для игристых WSET ждёт наблюдения о пузырьках и характере мусса. Канвас ниже — живая визуализация." />
          </div>
          {/* Фикс релиза: с sm три рейки в колонках — при 640–1023px каждой
              достаётся ~215px, а три чипа min-w-max требуют ~260px → ряд «Мусс»
              вылезал за карточку. До lg рейки на всю ширину (чипы всегда
              помещаются), с lg колонки возвращаются. */}
          <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            <CleanSensoryRail
              label="Интенсивность"
              options={PERLAGE_OPTS}
              value={eye.perlage?.intensity ?? null}
              onChange={(v) => onPatchPerlage({ intensity: v })}
              cues={PERLAGE_CUES}
            />
            <CleanSensoryRail
              label="Размер пузырьков"
              options={[
                { value: 'fine', label: 'Мелкие' },
                { value: 'medium', label: 'Средние' },
                { value: 'coarse', label: 'Крупные' },
              ]}
              value={eye.perlage?.bubbleSize ?? null}
              onChange={(v) => onPatchPerlage({ bubbleSize: v })}
              cues={{
                fine: 'Деликатная нить: выдержанное вино на осадке',
                medium: 'Классический мюзе стандартной выдержки',
                coarse: 'Крупные пузыри: молодое вино или потеря давления',
              }}
            />
            <CleanSensoryRail
              label="Мусс"
              options={[
                { value: 'creamy', label: 'Сливочный' },
                { value: 'light', label: 'Лёгкий' },
                { value: 'aggressive', label: 'Агрессивный' },
              ]}
              value={eye.perlage?.mousse ?? null}
              onChange={(v) => onPatchPerlage({ mousse: v })}
              cues={{
                creamy: 'Гладкая кремовая пена — зрелый мюзе',
                light: 'Слаботурбулентная пена, быстро гаснет',
                aggressive: 'Яростная шипучесть — молодое/резкое вино',
              }}
            />
          </div>
          <LivingPerlage intensity={eye.perlage?.intensity ?? 'medium'} bubbleSize={eye.perlage?.bubbleSize ?? 'fine'} />
        </div>
      )}

      <label className="mt-4 block">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
          <PenLine size={12} /> {T('Заметки по виду')}
        </span>
        <textarea
          value={eye.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          rows={2}
          placeholder={T('Вязкость, CO₂, наблюдения о кольце смачивания…')}
          className="w-full px-3.5 py-3 rounded-xl bg-cellar-deep border border-hairline text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition resize-y"
        />
      </label>
    </SectionCard>
  );
}
