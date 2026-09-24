import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Grape, RotateCcw, RefreshCw } from 'lucide-react';
import { T } from '@/lib/tr';

/**
 * Стена между ошибкой рендера и «серым экраном».
 *
 * Урок релиза v5: легаси-запись из старой версии роняла рендер «Носа» и
 * приложение умирало целиком — пользователь видел пустой тёмный экран без
 * единой подсказки. Теперь:
 *  • kind="section" — падение одной секции показывает читаемую карточку
 *    внутри её места, остальные разделы и шапка живут;
 *  • kind="root" — если упало что-то вне секций, показывается полный
 *    экран-заглушка в стиле погреба с кнопкой перезагрузки.
 */
interface BoundaryProps {
  children: ReactNode;
  kind?: 'root' | 'section';
  name?: string;
}

interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /* Диагностика в консоль: сообщение + стек компонентов. */
    console.error(`[ErrorBoundary:${this.props.name ?? 'root'}]`, error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.kind === 'root') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cellar px-4">
          <div className="w-full max-w-md rounded-2xl border border-garnet/50 bg-surface p-6 shadow-cellar text-center space-y-4">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-garnet/25 border border-garnet/50 text-gold-soft">
              <Grape size={26} />
            </span>
            <h1 className="display text-2xl text-ink">{T('Дегустация прервана ошибкой')}</h1>
            <p className="text-[13px] text-ink-dim leading-relaxed">
              {T('Приложение восстановится после перезагрузки. Данные черновика сохранены в погребе — они загрузятся автоматически.')}
            </p>
            <p className="text-[11px] text-ink-faint break-words rounded-lg bg-cellar-deep border border-hairline px-3 py-2 text-left font-mono">
              {error.message || T('неизвестная ошибка')}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded-xl bg-gold text-[#171207] text-sm font-bold hover:bg-gold-soft transition inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} /> {T('Перезагрузить приложение')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rise-in rounded-2xl border border-garnet/50 bg-garnet/10 p-5 space-y-3" role="alert">
        <p className="text-[13px] font-semibold text-[#f0a49b]">
          {T('Раздел')} «{T(this.props.name ?? '')}» {T('не удалось отобразить')}
        </p>
        <p className="text-[11px] text-ink-dim leading-relaxed">
          {T('Остальные разделы работают. Попробуйте повторить открытие — если ошибка повторяется, перезагрузите приложение (черновик сохранён).')}
        </p>
        <p className="text-[11px] text-ink-faint break-words rounded-lg bg-cellar-deep/70 border border-hairline px-3 py-2 font-mono">
          {error.message || T('неизвестная ошибка')}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={this.reset}
            className="h-9 px-4 rounded-xl border border-gold/50 bg-gold/15 text-gold-soft text-xs font-semibold hover:bg-gold/25 transition inline-flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> {T('Повторить')}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 px-4 rounded-xl border border-hairline bg-surface text-ink-dim text-xs hover:text-ink transition inline-flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> {T('Перезагрузить')}
          </button>
        </div>
      </div>
    );
  }
}
