import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'warn' | 'info';
}

const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rise-in flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-hairline shadow-cellar text-sm text-ink"
          >
            {t.tone === 'ok' ? (
              <CheckCircle2 size={16} className="text-sage-juicy" />
            ) : t.tone === 'warn' ? (
              <AlertTriangle size={16} className="text-gold-soft" />
            ) : (
              <Info size={16} className="text-ink-dim" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (text: string, tone?: Toast['tone']) => void {
  return useContext(ToastContext);
}
