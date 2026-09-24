import { useMemo, useState } from 'react';
import { Download, FileCode2, FileText, MessageCircle, Printer, DatabaseBackup, Upload } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { useTasting } from '@/state/TastingProvider';
import { buildDigest } from './digest';
import { buildMarkdownCard, buildTxt } from './serializers';
import { buildStandaloneHtml, downloadFile, fileSlug } from './buildStandaloneHtml';
import { useRecordNumber } from './useRecordNumber';
import { CARD_THEMES, type CardThemeId } from '@/lib/exportTheme';
import confetti from 'canvas-confetti';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

type Tab = 'print' | 'html' | 'text' | 'backup';

/** Выбор темы экспортной визитки (v19 «Витрина»): 3 печатные бумаги. */
function ThemePicker({ value, onChange }: { value: CardThemeId; onChange: (id: CardThemeId) => void }) {
  return (
    <div className="rounded-xl border border-hairline bg-cellar-deep/40 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h4 className="text-[12px] uppercase tracking-widest text-ink-faint">{T('Тема визитки')}</h4>
        <span className="text-[10.5px] text-ink-faint">{T('тиснение «П4» ставится на визитку само')}</span>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={T('Тема визитки')}>
        {CARD_THEMES.map((th) => (
          <button
            key={th.id}
            type="button"
            role="radio"
            aria-checked={value === th.id}
            onClick={() => onChange(th.id)}
            className={`min-h-[40px] pl-2.5 pr-3.5 rounded-xl text-[12.5px] border inline-flex items-center gap-2 transition ${
              value === th.id
                ? 'border-gold bg-gold/12 text-gold-soft font-semibold'
                : 'border-hairline text-ink-dim hover:text-ink'
            }`}
          >
            <span
              className="w-6 h-6 rounded-md border border-black/20 shrink-0"
              style={{ background: `linear-gradient(135deg, ${th.swatch[0]} 0 55%, ${th.swatch[1]} 55% 100%)` }}
              aria-hidden
            />
            {T(th.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Модальное окно экспорта (v19): печать/PDF «Витрина», автономный HTML,
 * TXT, MD-карточка, бэкап JSON. Печать — одна центральная ось, визитка
 * в выбранной теме с тиснением, ассоциации и фото — на второй странице.
 */
export function ExportModal({
  open,
  onClose,
  onPrint,
  theme,
  onThemeChange,
}: {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  theme: CardThemeId;
  onThemeChange: (id: CardThemeId) => void;
}) {
  const { record, exportBackup } = useTasting();
  const { lang } = useLang();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('print');
  const recordNumber = useRecordNumber(record);

  const digest = useMemo(() => buildDigest(record), [record, lang]);
  const slug = useMemo(() => fileSlug(record), [record]);

  const doConfetti = (): void => {
    void confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.7 },
      colors: ['#c59b4e', '#e5c179', '#9a4a44', '#8dc78a'],
      disableForReducedMotion: true,
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'print', label: T('Печать / PDF'), icon: <Printer size={15} /> },
    { key: 'html', label: T('Автономный HTML'), icon: <FileCode2 size={15} /> },
    { key: 'text', label: 'TXT / MD', icon: <MessageCircle size={15} /> },
    { key: 'backup', label: 'JSON', icon: <DatabaseBackup size={15} /> },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Экспорт дегустации" wide>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-[40px] px-3.5 rounded-xl text-[12.5px] border inline-flex items-center gap-1.5 transition ${
              tab === t.key ? 'border-gold bg-gold/12 text-gold-soft font-semibold' : 'border-hairline text-ink-dim hover:text-ink'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'print' && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-dim leading-relaxed">
            {T('Лист A4 «Витрина»: одна центральная ось — визитка в выбранной теме с тихим тиснением, мета и секции SAT по центру. Фотографии и ассоциативный ряд живут на второй странице и печатаются, только если заполнены. «Сохранить как PDF» — на любом устройстве, включая iOS и Android.')}
          </p>
          <ThemePicker value={theme} onChange={onThemeChange} />
          <Button
            variant="gold"
            icon={<Printer size={16} />}
            onClick={() => {
              onClose();
              onPrint();
            }}
          >
            {T('Открыть диалог печати')}
          </Button>
        </div>
      )}

      {tab === 'html' && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-dim leading-relaxed">
            {T('Самодостаточный файл в той же дизайн-системе: визитка с тиснением, секции по центральной оси, вторая страница для фото и ассоциаций. Открывается офлайн и печатается в тот же лист A4.')}
          </p>
          <ThemePicker value={theme} onChange={onThemeChange} />
          <Button
            variant="gold"
            icon={<Download size={16} />}
            onClick={() => {
              downloadFile(buildStandaloneHtml(record, digest, theme, recordNumber), `${slug}.html`, 'text/html');
              doConfetti();
              toast(T('HTML-отчёт скачан'));
            }}
          >
            {T('Скачать HTML-отчёт')}
          </Button>
        </div>
      )}

      {tab === 'text' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[12px] uppercase tracking-widest text-ink-faint">{T('Карточка для мессенджера (Markdown)')}</h4>
              <Button
                size="sm"
                variant="ghost"
                icon={<Download size={14} />}
                onClick={() => {
                  downloadFile(buildMarkdownCard(record, digest), `${slug}.md`, 'text/markdown');
                  toast(T('Markdown-карточка скачана'));
                }}
              >
                .md
              </Button>
            </div>
            <pre className="max-h-64 overflow-y-auto rounded-xl bg-cellar-deep border border-hairline p-3.5 text-[12px] leading-relaxed text-ink-dim whitespace-pre-wrap">{buildMarkdownCard(record, digest)}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[12px] uppercase tracking-widest text-ink-faint">{T('Полная заметка (TXT)')}</h4>
              <Button
                size="sm"
                variant="ghost"
                icon={<FileText size={14} />}
                onClick={() => {
                  downloadFile(buildTxt(record, digest), `${slug}.txt`, 'text/plain');
                  toast(T('TXT скачан'));
                }}
              >
                .txt
              </Button>
            </div>
            <pre className="max-h-52 overflow-y-auto rounded-xl bg-cellar-deep border border-hairline p-3.5 text-[12px] leading-relaxed text-ink-dim whitespace-pre-wrap">{buildTxt(record, digest)}</pre>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-dim leading-relaxed">
            {T('Полный JSON-бэкап всех дегустаций погреба. Восстановление — в «Погребе» (кнопка «Импорт»), с валидацией схемы.')}
          </p>
          <Button
            variant="gold"
            icon={<DatabaseBackup size={16} />}
            onClick={() => {
              void exportBackup().then((json) => {
                downloadFile(json, `sommelier-sat-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
                doConfetti();
                toast(T('Бэкап скачан'));
              });
            }}
          >
            {T('Скачать бэкап погреба')}
          </Button>
          <div className="rounded-xl border border-hairline bg-cellar-deep/60 p-3.5 text-[12px] text-ink-faint flex items-start gap-2">
            <Upload size={14} className="mt-0.5 shrink-0" />
            {T('Импорт доступен в модалке «Погреб» — файл проверяется на метку приложения и версию схемы до записи в базу.')}
          </div>
        </div>
      )}
    </Modal>
  );
}
