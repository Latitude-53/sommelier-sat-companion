import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav, SectionTabs } from '@/components/layout/SectionTabs';
import { TitulSection } from '@/components/modules/TitulSection';
import { EyeSection } from '@/components/modules/EyeSection';
import { NoseSection } from '@/components/modules/NoseSection';
import { PalateSection } from '@/components/modules/PalateSection';
import { ConclusionSection } from '@/components/modules/ConclusionSection';
import { MediaSection } from '@/components/modules/MediaSection';
import { SummarySection } from '@/components/modules/SummarySection';
import { ExportModal } from '@/components/export/ExportModal';
import { CellarLibraryModal } from '@/components/export/CellarLibraryModal';
import { PrintableTastingSheet } from '@/components/export/PrintableTastingSheet';
import { buildDigest } from '@/components/export/digest';
import { localizePreset } from '@/lib/catalog';
import { ToastProvider, useToast } from '@/components/common/Toast';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TastingProvider, useTasting } from '@/state/TastingProvider';
import { LangProvider, useLang } from '@/lib/i18n';
import { useSwipeNav } from '@/lib/useSwipeNav';
import { vibrate } from '@/lib/haptics';
import { SECTION_ORDER, type SectionKey } from '@/state/completion';
import { getCardTheme, setCardTheme, type CardThemeId } from '@/lib/exportTheme';
import { uuid } from '@/lib/uuid';
import { T } from '@/lib/tr';
import type { PhotoRole } from '@/types/wset';
import type { TastingMode } from '@/types/wset';

/**
 * SwipeHint (v12) — одноразовая подсказка о свайп-навигации для телефона.
 * Показывается один раз (localStorage), тает через 4.5 с или после первого
 * свайпа (событие 'sat-swiped', диспатчится из useSwipeNav-контейнера).
 */
function SwipeHint() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let shown = false;
    try {
      shown = localStorage.getItem('sat-swipe-hint') === 'done';
    } catch {
      /* приватный режим — показываем, но не сохраняем */
    }
    if (shown) return;
    setShow(true);
    const hide = (): void => {
      setShow(false);
      try {
        localStorage.setItem('sat-swipe-hint', 'done');
      } catch {
        /* приватный режим */
      }
    };
    const t = setTimeout(hide, 4500);
    window.addEventListener('sat-swiped', hide, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('sat-swiped', hide);
    };
  }, []);
  if (!show) return null;
  return (
    <div className="md:hidden flex justify-center px-3 -mt-1 mb-1 pointer-events-none" aria-hidden>
      <span className="swipe-hint inline-flex items-center gap-2 rounded-full border border-gold/30 bg-surface/80 px-3.5 py-1.5 text-[11px] text-gold-soft/90 backdrop-blur-sm">
        ← → {lang === 'en' ? 'Swipe to flip through sections' : 'Свайпните, чтобы листать разделы'}
      </span>
    </div>
  );
}

function AppShell() {
  const { record, dispatch, mode, isPro, persist, setSettings, settings } = useTasting();
  const { t, lang } = useLang();
  const toast = useToast();
  const [section, setSection] = useState<SectionKey>('titul');
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  /* v19: тема экспортной визитки («Витрина») — настройка вывода, живёт в localStorage. */
  const [cardTheme, setCardThemeState] = useState<CardThemeId>(() => getCardTheme());
  const firstRender = useRef(true);

  /* v19: раздел «Ассоциации» — Pro-поверхность; в WSET-проходе его нет
     (одобрено: Ассоциации скрыть в экзамене). */
  const sections = useMemo(() => SECTION_ORDER.filter((k) => isPro || k !== 'media'), [isPro]);

  useEffect(() => {
    if (!isPro && section === 'media') setSection('summary');
  }, [isPro, section]);

  /* v12: смена раздела → мгновенный скролл наверх (мобильный сценарий:
     нижняя навигация и свайпы не должны оставлять пользователя в хвосте
     длинной карточки). */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [section]);

  /* v12: перелистывание разделов — свайп по всему полю + стрелки ←/→
     (клавиатура — десктоп, свайп — телефон; в полях ввода стрелки живут
     своей жизнью, при открытых модалках навигация глушится). */
  const gotoSection = useCallback(
    (delta: number) => {
      const idx = sections.indexOf(section);
      const next = sections[idx + delta];
      if (!next) return;
      vibrate(8);
      setSection(next);
    },
    [section, sections],
  );
  const swipe = useSwipeNav({ onPrev: () => gotoSection(-1), onNext: () => gotoSection(1) });
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"], [data-modal-open="true"]')) return;
      gotoSection(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gotoSection]);

  /* Флаг «есть несохранённые изменения» (черновик и так автосейвится) */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setDirty(true);
  }, [record]);

  const digest = useMemo(() => buildDigest(record), [record, lang]);

  const handleModeChange = (m: TastingMode): void => {
    dispatch({ type: 'set-mode', mode: m });
    void setSettings({ ...settings, mode: m, tasterName: record.identity.taster || settings.tasterName });
    toast(m === 'wset3' ? t.toast.wsetOn : t.toast.proOn, 'info');
  };

  const handleSave = (): void => {
    void persist().then(() => {
      setDirty(false);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.75 },
        colors: ['#c59b4e', '#e5c179', '#9a4a44', '#8dc78a'],
        disableForReducedMotion: true,
      });
      toast(T('Сохранено в погреб'));
    });
  };

  const handleAddPhoto = (role: PhotoRole, photo: { dataUrl: string; width: number; height: number; sizeKb: number }): void => {
    dispatch({
      type: 'add-photo',
      photo: {
        id: uuid(),
        role,
        dataUrl: photo.dataUrl,
        width: photo.width,
        height: photo.height,
        sizeKb: photo.sizeKb,
      },
    });
  };

  return (
    <>
      <div className="app-shell min-h-screen flex flex-col">
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        onLibrary={() => setLibraryOpen(true)}
        onExport={() => setExportOpen(true)}
        onSave={handleSave}
        dirty={dirty}
      />

      <SectionTabs active={section} onChange={setSection} record={record} sections={sections} />

      <SwipeHint />

      <main
        className="app-main flex-1 mx-auto w-full max-w-4xl px-3 sm:px-6 pb-28 md:pb-10 pt-4"
        {...swipe}
      >
        <div key={section} className="section-swap">
        {section === 'titul' && (
          <ErrorBoundary kind="section" name="Паспорт">
            <TitulSection
              record={record}
              onPatchIdentity={(patch) => dispatch({ type: 'patch-identity', patch })}
              onApplyPreset={(preset) => {
                /* v22: пресет локализуется ДО входа в state — поля identity
                 * (регион/страна/сорта) вобьются в инпуты на языке интерфейса,
                 * а не сырым русским. В RU-режиме — тождественно. */
                dispatch({ type: 'apply-preset', preset: localizePreset(preset) });
                toast(T(`Пресет «${preset.title}» применён — поправьте под ваше вино`), 'info');
              }}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={(photoId) => dispatch({ type: 'remove-photo', photoId })}
              onSetCardPhoto={(photoId) => dispatch({ type: 'set-card-photo', photoId })}
            />
          </ErrorBoundary>
        )}
        {section === 'eye' && (
          <ErrorBoundary kind="section" name="Глаз">
            <EyeSection
              record={record}
              isPro={isPro}
              onPatch={(patch) => dispatch({ type: 'patch-eye', patch })}
              onPatchPerlage={(patch) => dispatch({ type: 'patch-eye', patch: { perlage: { ...(record.eye.perlage ?? { intensity: null, bubbleSize: null, mousse: null }), ...patch } } })}
            />
          </ErrorBoundary>
        )}
        {section === 'nose' && (
          <ErrorBoundary kind="section" name="Нос">
            <NoseSection
              record={record}
              onPatch={(patch) => dispatch({ type: 'patch-nose', patch })}
              onToggleFault={(fault) => {
                const exists = record.nose.faults.find((f) => f.type === fault.type);
                if (exists && exists.severity === fault.severity) {
                  dispatch({ type: 'patch-nose', patch: { faults: record.nose.faults.filter((f) => f.type !== fault.type) } });
                } else {
                  dispatch({ type: 'patch-nose', patch: { faults: [...record.nose.faults.filter((f) => f.type !== fault.type), fault] } });
                }
              }}
            />
          </ErrorBoundary>
        )}
        {section === 'palate' && (
          <ErrorBoundary kind="section" name="Рот">
            <PalateSection record={record} />
          </ErrorBoundary>
        )}
        {section === 'conclusion' && (
          <ErrorBoundary kind="section" name="Итог">
            <ConclusionSection record={record} />
          </ErrorBoundary>
        )}
        {section === 'media' && (
          <ErrorBoundary kind="section" name="Ассоциации">
            <MediaSection
              record={record}
              onPatch={(patch) => dispatch({ type: 'patch-media', patch })}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={(photoId) => dispatch({ type: 'remove-photo', photoId })}
            />
          </ErrorBoundary>
        )}
        {section === 'summary' && (
          <ErrorBoundary kind="section" name="Сводка">
            <SummarySection />
          </ErrorBoundary>
        )}
        </div>
      </main>

      <footer className="hidden md:block mt-auto border-t border-hairline no-print">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between text-[11px] text-ink-faint">
          <span>Sommelier SAT Companion · IndexedDB · ~100 KB</span>
          <span>{dirty ? t.draftUnsaved : t.allSaved}</span>
        </div>
      </footer>

      <MobileBottomNav active={section} onChange={setSection} record={record} sections={sections} />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onPrint={() => setTimeout(() => window.print(), 120)}
        theme={cardTheme}
        onThemeChange={(id) => {
          setCardTheme(id);
          setCardThemeState(id);
        }}
      />
      <CellarLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      </div>

      {/* Печатная карта: вне .app-shell, скрыта на экране, видна только при печати */}
      <div className="print-root" aria-hidden>
        <PrintableTastingSheet record={record} digest={digest} theme={cardTheme} />
      </div>
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ErrorBoundary kind="root">
        <ToastProvider>
          <TastingProvider>
            <AppShell />
          </TastingProvider>
        </ToastProvider>
      </ErrorBoundary>
    </LangProvider>
  );
}
