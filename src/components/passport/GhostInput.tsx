/**
 * GhostInput (v18) — поле с призраком-подсказкой из памяти дегустаций.
 *
 * Одобренный вид (И9/Сборка-V2): серый хвост-продолжение вдоль текста
 * + кнопка-пилюля справа «✦ полное · ×частота». Никаких всплывающих
 * списков. Tab и клик по пилюле — принять подсказку; Enter — запомнить
 * новое (черновик автосохраняется, значение попадает в память погреба).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { bestGhostMatch, type GhostEntry, type GhostKind } from '@/lib/passport';
import { T } from '@/lib/tr';
import { vibrate } from '@/lib/haptics';

export function GhostInput({
  kind,
  entries,
  value,
  onChange,
  placeholder,
}: {
  kind: GhostKind;
  entries: GhostEntry[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState('');
  const [flashKey, setFlashKey] = useState(0);

  const match = bestGhostMatch(entries, value);
  const tail = match ? match.label.slice(value.length) : '';

  /* Позиция хвоста: ширина набранного текста меряется зеркалом. */
  useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    const tailEl = tailRef.current;
    const input = inputRef.current;
    if (!mirror || !tailEl || !input) return;
    mirror.textContent = value;
    const w = mirror.offsetWidth;
    tailEl.style.left = `${12 + w}px`;
    tailEl.style.display = w > input.clientWidth - 14 ? 'none' : 'block';
  }, [value, match, tail]);

  /* Статус тает через 3.4 с (как в одобренном макете). */
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 3400);
    return () => clearTimeout(t);
  }, [status, flashKey]);

  const accept = (): void => {
    if (!match) return;
    vibrate(8);
    onChange(match.label);
  };

  return (
    <div>
      <div className="pw-ghost">
        <input
          ref={inputRef}
          className="pw-gin"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          data-ghost-kind={kind}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && match) {
              e.preventDefault();
              accept();
            } else if (e.key === 'Enter') {
              const val = value.trim();
              if (val && !entries.some((p) => p.label.toLowerCase() === val.toLowerCase())) {
                setStatus(T(`✓ «${val}» — запомню, буду подсказывать`));
                setFlashKey((k) => k + 1);
              } else if (val) {
                setStatus(T(`«${val}» уже в памяти — призрак подхватит`));
                setFlashKey((k) => k + 1);
              } else {
                setStatus(T('Начните писать — подхвачу из памяти. Enter — запомнить новое.'));
                setFlashKey((k) => k + 1);
              }
            }
          }}
        />
        <span ref={mirrorRef} className="pw-gmirror" aria-hidden />
        {match && tail ? (
          <>
            <span ref={tailRef} className="pw-ghx" aria-hidden>
              {tail}
            </span>
            <button type="button" tabIndex={-1} className="pw-gbtn" onClick={accept}>
              ✦ {match.label} <i className="n">×{match.freq}</i>
            </button>
          </>
        ) : null}
      </div>
      <div className="pw-gstatus" data-ghost-status={kind}>
        {status}
      </div>
    </div>
  );
}
