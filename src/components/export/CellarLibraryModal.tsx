import { useEffect, useRef, useState } from 'react';
import { DatabaseBackup, FileUp, HardDrive, Trash2, UploadCloud } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { useTasting } from '@/state/TastingProvider';
import {
  BackupValidationError,
  backupAll,
  deleteTasting,
  listTastings,
  onStorageMode,
  restoreBackup,
  type StorageMode,
} from '@/db';
import type { TastingRecord } from '@/types/tasting';
import { QUALITY_OPTS } from '@/lib/catalog';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';
import { downloadFile } from './buildStandaloneHtml';

const QUALITY_TONE: Record<string, 'sage' | 'gold' | 'neutral' | 'danger'> = {
  outstanding: 'sage',
  'very-good': 'sage',
  good: 'gold',
  acceptable: 'neutral',
  poor: 'danger',
  faulty: 'danger',
};

/** Библиотека сохранённых дегустаций («погреб») + импорт бэкапа. */
export function CellarLibraryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { loadRecord, startNew } = useTasting();
  const { lang } = useLang();
  const toast = useToast();
  const [items, setItems] = useState<TastingRecord[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(
    () =>
      onStorageMode((m) => {
        setStorageMode(m);
      }),
    [],
  );

  const refresh = (): void => {
    void listTastings().then(setItems);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const onImport = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const isFullBackup = (typeof json === 'object' && json !== null && 'app' in json) as boolean;
      const count = await restoreBackup(json, { merge: true });
      refresh();
      toast(`${T('Импортировано записей:')} ${count}`, 'ok');
      void isFullBackup;
    } catch (e) {
      if (e instanceof BackupValidationError) toast(T(e.message), 'warn');
      else toast(T('Не удалось прочитать файл: это не корректный JSON'), 'warn');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Погреб дегустаций" wide>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant="outline" icon={<DatabaseBackup size={15} />} onClick={() => {
          void backupAll().then((payload) => {
            downloadFile(JSON.stringify(payload, null, 2), `sommelier-sat-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
            toast(T('Бэкап скачан'));
          });
        }}>
          {T('Бэкап всех')}
        </Button>
        <Button size="sm" variant="outline" icon={<FileUp size={15} />} onClick={() => fileRef.current?.click()}>
          {T('Импорт JSON')}
        </Button>
        <Button size="sm" variant="ghost" icon={<UploadCloud size={15} />} onClick={() => {
          void startNew().then(() => {
            onClose();
            toast(T('Новая дегустация начата'), 'info');
          });
        }}>
          {T('Новая дегустация')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
      </div>

      {storageMode === 'local' ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 mb-4 text-[11.5px] text-gold-soft">
          <HardDrive size={13} className="shrink-0" />
          {T('IndexedDB недоступна — включён фолбэк на localStorage (~5 МБ). Данные живут в этом браузере.')}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-[13px] text-ink-faint py-6 text-center">{T('Погреб пуст. Сохраните первую дегустацию кнопкой «В погреб».')}</p>
      ) : (
        <ul className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-cellar-deep/50 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink truncate">
                  {r.identity.name || r.identity.producer || T('Без названия')}
                  {r.identity.vintage ? <span className="text-gold-soft"> · {r.identity.vintage}</span> : null}
                </p>
                <p className="text-[11.5px] text-ink-faint truncate">
                  {[r.identity.producer, r.identity.region ? T(r.identity.region) : '', r.identity.country ? T(r.identity.country) : ''].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {r.conclusion.quality && (
                    <Badge tone={QUALITY_TONE[r.conclusion.quality] ?? 'neutral'}>
                      {T(QUALITY_OPTS.find((q) => q.value === r.conclusion.quality)?.label ?? '')}
                    </Badge>
                  )}
                  <Badge tone="neutral">{new Date(r.updatedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU')}</Badge>
                  {r.draft ? <Badge tone="gold">{T('черновик')}</Badge> : null}
                  {r.photos.length > 0 ? <Badge tone="neutral">{r.photos.length} {T('фото')}</Badge> : null}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void loadRecord(r.id).then((ok) => {
                      if (ok) {
                        onClose();
                        toast(T('Дегустация загружена'));
                      }
                    });
                  }}
                >
                  {T('Открыть')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={14} />}
                  onClick={() => {
                    void deleteTasting(r.id).then(refresh);
                  }}
                  aria-label={T('Удалить')}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
