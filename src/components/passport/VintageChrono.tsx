/**
 * VintageChrono (v18) — хронограф X: линейка винтажа во всю ширину.
 *
 * Одобрено на И10/И11 (Доводка-V3 → Сборка-V2):
 *  • год свободный — вписывается хоть 1920, окно 45 лет само переезжает;
 *  • максимум = год устройства (new Date().getFullYear()) — купят вино в
 *    27-м, и 2027 впишется без обновления приложения;
 *  • драг иглы; за краем окно едет за рукой (вперёд — до «сейчас»);
 *  • глубже 1500 не пускаем («там уже археология, а не вино»);
 *  • возраст и характер считаются от года устройства.
 *
 * React-нюанс: во время драга год живёт локально (визуал 60 fps),
 * в карточку дегустации уходит одним коммитом на pointerup — иначе
 * каждое движение иглы перерисовывало бы весь провайдер.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHRONO_FLOOR,
  CHRONO_WINDOW,
  ageCap,
  pluralRu,
} from '@/lib/passport';
import { T, getTrLang } from '@/lib/tr';
import { vibrate } from '@/lib/haptics';
import { useTasting } from '@/state/TastingProvider';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function VintageChrono({
  vintage,
  onChange,
}: {
  /** identity.vintage — строка; числовой год или пусто/NV. */
  vintage: string;
  onChange: (v: string) => void;
}) {
  const deviceYear = useMemo(() => new Date().getFullYear(), []);
  /* v19: слово-характер («в расцвете», «старое») — Pro-поверхность;
     в WSET-проходе пилюля показывает честный возраст без литературы. */
  const { isPro } = useTasting();
  const parsed = /^\d{4}$/.test(vintage.trim()) ? parseInt(vintage.trim(), 10) : null;

  const inputRef = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Локальный визуальный год (коммитится в onChange на концах жестов). */
  const [localYear, setLocalYear] = useState<number | null>(parsed);
  const [window_, setWindow] = useState(() => ({
    w0: deviceYear - CHRONO_WINDOW + 1,
    w1: deviceYear,
  }));
  const [hint, setHint] = useState('');
  const [hintOn, setHintOn] = useState(false);
  const [dragging, setDragging] = useState(false);

  /* Внешнее изменение (загрузка карточки, призрак, сброс) — подстройка окна
   * и поля ввода (пока пользователь не редактирует его прямо сейчас). */
  useEffect(() => {
    const y = parsed;
    setLocalYear(y);
    const inp = inputRef.current;
    if (inp && document.activeElement !== inp) inp.value = y === null ? '' : String(y);
    if (y === null) return;
    setWindow((st) => {
      const D = deviceYear;
      if (y > st.w1 - 2 || y < st.w0 + 2) {
        let w0 = y > D - CHRONO_WINDOW + 1 ? D - CHRONO_WINDOW + 1 : Math.max(y - Math.floor(CHRONO_WINDOW / 2), CHRONO_FLOOR);
        let w1 = Math.min(w0 + CHRONO_WINDOW - 1, D);
        if (w1 - w0 < CHRONO_WINDOW - 1) w0 = Math.max(CHRONO_FLOOR, w1 - CHRONO_WINDOW + 1);
        return { w0, w1 };
      }
      return st;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vintage, deviceYear]);

  const flash = (msg: string): void => {
    setHint(msg);
    setHintOn(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintOn(false), 3400);
  };

  /** Установка года с guard-rails: не из будущего, не глубже 1500. */
  const commitYear = (raw: number, opts: { silent?: boolean } = {}): void => {
    let y = Math.round(raw);
    if (y > deviceYear) {
      y = deviceYear;
      flash(T(`винтаж не из будущего — максимум ${deviceYear}, год взят с вашего устройства`));
    }
    if (y < CHRONO_FLOOR) {
      y = CHRONO_FLOOR;
      flash(T(`глубже ${CHRONO_FLOOR}-го не пускаю — там уже археология, а не вино`));
    }
    setLocalYear(y);
    if (!opts.silent) onChange(String(y));
    return;
  };

  /** Подгонка окна под год (переезд к 1920-м и обратно). */
  const fit = (y: number): void => {
    setWindow((st) => {
      const D = deviceYear;
      if (y > st.w1 - 2 || y < st.w0 + 2) {
        let w0 = y > D - CHRONO_WINDOW + 1 ? D - CHRONO_WINDOW + 1 : Math.max(y - Math.floor(CHRONO_WINDOW / 2), CHRONO_FLOOR);
        let w1 = Math.min(w0 + CHRONO_WINDOW - 1, D);
        if (w1 - w0 < CHRONO_WINDOW - 1) w0 = Math.max(CHRONO_FLOOR, w1 - CHRONO_WINDOW + 1);
        return { w0, w1 };
      }
      return st;
    });
  };

  /* ── Драг иглы ── */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const rail = railRef.current;
    if (!rail) return;
    e.preventDefault();
    rail.setPointerCapture(e.pointerId);
    setDragging(true);
    vibrate(6);

    const yearAt = (ev: React.PointerEvent | PointerEvent): number => {
      const rc = rail.getBoundingClientRect();
      return Math.round(window_.w0 + ((ev.clientX - rc.left) / rc.width) * (window_.w1 - window_.w0));
    };
    setLocalYear(clamp(yearAt(e), CHRONO_FLOOR, deviceYear));

    const move = (ev: PointerEvent): void => {
      const rc = rail.getBoundingClientRect();
      const x = ev.clientX - rc.left;
      /* За краем окно едет за рукой (вперёд — только до «сейчас»). */
      if (x > rc.width && window_.w1 < deviceYear) {
        const w0 = Math.min(window_.w0 + 2, deviceYear - CHRONO_WINDOW + 1);
        setWindow({ w0, w1: Math.min(w0 + CHRONO_WINDOW - 1, deviceYear) });
      } else if (x < 0 && window_.w0 > CHRONO_FLOOR) {
        const w0 = Math.max(window_.w0 - 2, CHRONO_FLOOR);
        setWindow({ w0, w1: Math.min(w0 + CHRONO_WINDOW - 1, deviceYear) });
      }
      setLocalYear(clamp(yearAt(ev), CHRONO_FLOOR, deviceYear));
    };
    const up = (ev: PointerEvent): void => {
      rail.removeEventListener('pointermove', move);
      rail.removeEventListener('pointerup', up);
      rail.removeEventListener('pointercancel', up);
      setDragging(false);
      const y = clamp(yearAt(ev), CHRONO_FLOOR, deviceYear);
      commitYear(y);
      vibrate(6);
    };
    rail.addEventListener('pointermove', move);
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
  };

  /* ── Ручной ввод: свободный год. Коммит — на 4+ цифрах, на blur или Enter;
   * во время набора коротких хвостов ничего не флешим. ── */
  const onInput = (): void => {
    const inp = inputRef.current;
    if (!inp) return;
    const v = inp.value.replace(/\D/g, '');
    if (!v) {
      onChange('');
      return;
    }
    if (v.length >= 4) {
      const y2 = parseInt(v, 10);
      commitYear(y2);
      fit(y2);
    }
    /* короткий ввод ждёт продолжения — тихо */
  };

  const onInputBlur = (): void => {
    const inp = inputRef.current;
    if (!inp) return;
    const v = inp.value.replace(/\D/g, '');
    if (v && v.length < 4) {
      flash(T('впишите год целиком — например, 1920'));
    }
    inp.value = localYear === null ? '' : String(localYear);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const shownYear = localYear;
  const span = Math.max(1, window_.w1 - window_.w0);
  const en = getTrLang() === 'en';

  const ticks = useMemo(() => {
    const list: { yy: number; maj: boolean }[] = [];
    for (let yy = window_.w0; yy <= window_.w1; yy++) list.push({ yy, maj: yy % 10 === 0 });
    return list;
  }, [window_.w0, window_.w1]);

  const bandVisible = shownYear !== null && shownYear < deviceYear && shownYear >= window_.w0;
  const nowVisible = deviceYear >= window_.w0 && deviceYear <= window_.w1;
  const age = shownYear !== null ? deviceYear - shownYear : null;
  const ageLabel =
    age === null
      ? T('NV · без года')
      : en
        ? `${age} ${age === 1 ? 'yr' : 'yrs'}${isPro ? ` · ${T(ageCap(age))}` : ''}`
        : `${age} ${pluralRu(age)}${isPro ? ` · ${T(ageCap(age))}` : ''}`;

  return (
    <div className="pw-chrono">
      <div className="pw-ch-top">
        <div>
          <span className="pw-ch-cap">{T('винтаж · хронограф')}</span>
          <input
            ref={inputRef}
            className="pw-ch-in"
            defaultValue={parsed ?? ''}
            inputMode="numeric"
            autoComplete="off"
            onFocus={(e) => e.currentTarget.select()}
            onChange={onInput}
            onBlur={onInputBlur}
            onKeyDown={onInputKey}
            aria-label={T('Винтаж')}
          />
        </div>
        <span className="pw-ch-age">{ageLabel}</span>
      </div>
      <div
        ref={railRef}
        className={`pw-ch-rail${dragging ? ' drag' : ''}`}
        onPointerDown={onPointerDown}
        role="slider"
        aria-label={T('Год винтажа')}
        aria-valuemin={CHRONO_FLOOR}
        aria-valuemax={deviceYear}
        aria-valuenow={shownYear ?? undefined}
        aria-valuetext={shownYear !== null ? `${shownYear}` : T('NV')}
        tabIndex={-1}
      >
        <span className="pw-ch-base" />
        {bandVisible && (
          <span
            className="pw-ch-band"
            style={{
              left: `${(((shownYear as number) - window_.w0) / span) * 100}%`,
              width: `${Math.max(0, (((deviceYear - window_.w0) / span) - ((shownYear as number) - window_.w0) / span) * 100)}%`,
            }}
          />
        )}
        {nowVisible && (
          <span
            className="pw-ch-nowm"
            style={{ left: `calc(${((deviceYear - window_.w0) / span) * 100}% - 1px)` }}
          />
        )}
        {nowVisible && age !== null && age >= 6 && (
          <span className="pw-ch-nowl" style={{ left: `${((deviceYear - window_.w0) / span) * 100}%` }}>
            {T('сейчас')}
          </span>
        )}
        {ticks.map(({ yy, maj }) =>
          maj ? (
            <span
              key={yy}
              className="pw-ch-tk maj"
              style={{ left: `${((yy - window_.w0) / span) * 100}%` }}
            />
          ) : (
            <span
              key={yy}
              className="pw-ch-tk"
              style={{ left: `${((yy - window_.w0) / span) * 100}%` }}
            />
          ),
        )}
        {ticks.filter(({ maj }) => maj).map(({ yy }) => (
          <span
            key={`l${yy}`}
            className="pw-ch-tkl"
            style={{ left: `${((yy - window_.w0) / span) * 100}%` }}
          >
            {yy}
          </span>
        ))}
        {shownYear !== null && (
          <span
            className="pw-ch-ndl"
            style={{ left: `calc(${clamp(((shownYear - window_.w0) / span) * 100, 0, 100)}% - 1px)` }}
          />
        )}
      </div>
      <div className={`pw-ch-hint${hintOn ? ' on' : ''}`}>{hint}</div>
    </div>
  );
}
