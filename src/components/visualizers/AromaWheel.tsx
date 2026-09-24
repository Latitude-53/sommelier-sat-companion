import { useEffect, useMemo, useRef, useState } from 'react';
import { AROMA_GROUP_HINTS, AROMA_WHEEL, FAULT_TYPE_OPTS } from '@/lib/catalog';
import type { AromaFamily, AromaSelection, DescriptorLevel, FaultType, SatIntensity } from '@/types/wset';
import type { FaultRecord, NoseCustomTag } from '@/types/tasting';
import { energyOf, extrusionOf, FRESH_REGISTER_LABELS, isDenseFruit, sensoryPowerOf, weightOf, zipfRawScore } from '@/engine/aromaEngine';
import { vibrate } from '@/lib/haptics';
import { useLang } from '@/lib/i18n';
import { T } from '@/lib/tr';

/**
 * Колесо ароматов 2.1 — «живая геометрия».
 *
 * ● Динамические доли: вес сектора растёт с суммой уровней отмеченных
 *   дескрипторов — вино, на 100% фруктово-минеральное, распирает эти секторы,
 *   а пустые «Ферментация» и «Цветы» скромно жмутся к ступице.
 * ● Кинематика «сдвиг и поворот»: клик по сектору уводит колесо влево,
 *   активный сектор пружинно поворачивается ровно направо (на панель),
 *   справа выезжает панель дескрипторов. «Далее ➔» крутит кольцо к следующей
 *   группе; клик мимо / Esc / ступица / ✕ — колесо возвращается в центр.
 * ● Сектор «Пороки и химия» включается тумблером внизу: плавно вырастает
 *   из ступицы, при выключении схлопывается и выпадает из кольца.
 * ● Векторная отрисовка: точные дуги, радиальные градиенты, золотое свечение
 *   активного сектора, контрастная типографика. Пружины (rAF) уважают
 *   prefers-reduced-motion.
 */

/* ── Геометрия ────────────────────────────────────────────────────────────── */

const R_HUB = 50;
const R_IN = 58;
const R_BASE = 122;
const GAP_DEG = 1.6;
const START_AT = -90; // шов кольца на 12 часах

/** Лимит активных дескрипторов колеса (включая свои теги). */
export const MAX_DESCRIPTORS = 10;
/** Лимит своих тегов в одном семействе. */
export const MAX_CUSTOM_PER_FAMILY = 10;

const polar = (aDeg: number, r: number): [number, number] => {
  const a = (aDeg * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

/** Точный кольцевой сектор: две дуги + замыкание, с зазором между сегментами. */
function donutPath(a0: number, a1: number, rIn: number, rOut: number): string {
  const span = a1 - a0;
  if (span <= GAP_DEG * 2.2) return '';
  const gap = Math.min(GAP_DEG, span * 0.24);
  const s = a0 + gap;
  const e = a1 - gap;
  const large = e - s > 180 ? 1 : 0;
  const [x1, y1] = polar(s, rOut);
  const [x2, y2] = polar(e, rOut);
  const [x3, y3] = polar(e, rIn);
  const [x4, y4] = polar(s, rIn);
  const f = (v: number): string => v.toFixed(2);
  return `M ${f(x1)} ${f(y1)} A ${rOut} ${rOut} 0 ${large} 1 ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} A ${rIn} ${rIn} 0 ${large} 0 ${f(x4)} ${f(y4)} Z`;
}

/** Затемнение/осветление HEX (pct −100…+100) для радиальных градиентов. */
function shade(hex: string, pct: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  const mix = (c: number): number => Math.round(c + (t - c) * p);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const shortestTo = (from: number, to: number): number => {
  let t = to;
  while (t - from > 180) t -= 360;
  while (t - from < -180) t += 360;
  return t;
};

/* ── Данные семейств ──────────────────────────────────────────────────────── */

interface WheelItem {
  id: string;
  label: string;
  hint?: string;
}
interface WheelFamily {
  key: string;
  label: string;
  short: string;
  hue: string;
  isFault?: boolean;
  groups: { label: string; items: WheelItem[] }[];
}

const SHORT_LABEL: Record<string, string> = {
  fruit: 'Фрукты',
  floral: 'Цветы',
  herbal: 'Травы',
  spice: 'Специи',
  oak: 'Дуб',
  ferment: 'Ферментация',
  mineral: 'Минералы',
  tertiary: 'Выдержка',
};

const BASE_FAMILIES: WheelFamily[] = AROMA_WHEEL.map((f) => ({
  key: f.family,
  label: f.label,
  short: SHORT_LABEL[f.family] ?? f.label,
  hue: f.hue,
  groups: f.groups.map((g) => ({ label: g.label, items: g.items.map((i) => ({ id: i.id, label: i.label })) })),
}));

const FAULT_FAMILY: WheelFamily = {
  key: 'faults',
  label: 'Пороки и химия',
  short: 'Пороки',
  hue: '#b05750',
  isFault: true,
  groups: [
    {
      label: 'Дефекты и химические тона',
      items: FAULT_TYPE_OPTS.map((ft) => ({ id: ft.value, label: ft.label, hint: ft.hint })),
    },
  ],
};

const SEVERITY_LEVEL: Record<string, DescriptorLevel> = { light: 1, distinct: 2, heavy: 3 };

/** Цвет микроподписи регистра свежести. */
const REGISTER_COLOR: Record<string, string> = {
  'primary-crunch': '#a8c686',
  'ripe-balance': '#e5c179',
  'tertiary-depth': '#c98c3c',
};

/* ── Пружины ──────────────────────────────────────────────────────────────── */

interface SlicePhys {
  w: number;
  wv: number;
  r: number;
  rv: number;
}
const SPRING = { wK: 170, wD: 16, rK: 150, rD: 13, rotK: 120, rotD: 15 };
const CLOSED_W = 0.015;
const CLOSED_R = R_HUB + 4;

/* ── Компонент ────────────────────────────────────────────────────────────── */

export function AromaWheel({
  selection,
  onChange,
  faults,
  onFaultLevel,
  customTags,
  libraryTags,
  onAddCustom,
  onRemoveCustom,
  onUseLibraryTag,
  intensity = null,
}: {
  selection: AromaSelection;
  onChange: (aromas: AromaSelection) => void;
  faults: FaultRecord[];
  onFaultLevel: (type: FaultType, level: DescriptorLevel | null) => void;
  /** Свои дескрипторы текущей карточки (уровни живут в selection по tag.id). */
  customTags: NoseCustomTag[];
  /** Глобальная библиотека своих дескрипторов — переживает дегустации. */
  libraryTags: NoseCustomTag[];
  onAddCustom: (family: AromaFamily, label: string) => void;
  onRemoveCustom: (tagId: string) => void;
  /** Первый тап по библиотечному тегу: прикрепить к карточке и дать •. */
  onUseLibraryTag: (tag: NoseCustomTag) => void;
  /** Глобальная громкость вина (нос → иначе вкус) — модуляция P_F. */
  intensity?: SatIntensity | null;
}) {
  /* Язык подписывается в контекст: смена EN↔RU перерисовывает колесо. */
  useLang();
  const reducedMotion = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )[0];

  /* Активный сектор переживает переходы между табами (Нос → Рот → Нос). */
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('wheel-active-family') || null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (activeId) sessionStorage.setItem('wheel-active-family', activeId);
      else sessionStorage.removeItem('wheel-active-family');
    } catch {
      /* приватный режим — живём сессией вкладки */
    }
  }, [activeId]);
  const [showFaults, setShowFaults] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wheel-show-faults') === '1';
    } catch {
      return false;
    }
  });
  const [closing, setClosing] = useState<string[]>([]);
  const [pulse, setPulse] = useState<{ key: string; seq: number }>({ key: '', seq: 0 });
  const [, setTick] = useState(0); // перерисовка на каждом кадре пружины

  /* Видимые семейства: базовые 8 + сектор пороков (включён или схлопывается). */
  const families = useMemo<WheelFamily[]>(() => {
    const list: WheelFamily[] = [...BASE_FAMILIES];
    if (showFaults || closing.includes('faults')) list.push(FAULT_FAMILY);
    return list;
  }, [showFaults, closing]);

  /* Спектр семейств (ТЗ Engine §2.А): закон Ципфа + Вебер-Фехнер.
   * RawScore = L₁+0.5·L₂+0.25·L₃+0.1·хвост, Energy = √Raw·1.5,
   * Weight = 1 + Energy + 0.65·√N, экструзия 16px (•••) / 8px (••).
   * Свои теги учитываются в своих семействах наравне с каталогом. */
  const stats = useMemo(() => {
    const levelsByFamily = new Map<string, number[]>();
    const bump = (key: string, lvl: number): void => {
      const arr = levelsByFamily.get(key) ?? [];
      arr.push(lvl);
      levelsByFamily.set(key, arr);
    };
    for (const fam of families) {
      for (const g of fam.groups) {
        for (const item of g.items) {
          const lvl = fam.isFault
            ? SEVERITY_LEVEL[faults.find((f) => f.type === item.id)?.severity ?? ''] ?? 0
            : selection[item.id] ?? 0;
          if (lvl > 0) bump(fam.key, lvl);
        }
      }
      if (!fam.isFault) {
        for (const tag of customTags) {
          if (tag.family !== fam.key) continue;
          const lvl = selection[tag.id] ?? 0;
          if (lvl > 0) bump(fam.key, lvl);
        }
      }
    }
    const map = new Map<
      string,
      { score: number; count: number; maxLevel: 0 | 1 | 2 | 3; weight: number; extrusionPx: number; power: number }
    >();
    for (const [key, levels] of levelsByFamily) {
      const raw = zipfRawScore(levels);
      const energy = energyOf(raw);
      const maxLevel = Math.max(...levels) as 0 | 1 | 2 | 3;
      map.set(key, {
        score: levels.reduce((s, l) => s + l, 0),
        count: levels.length,
        maxLevel,
        weight: weightOf(energy, levels.length),
        extrusionPx: extrusionOf(maxLevel),
        /* ТЗ v3 §3.2: сила семейства на лепестке — независимая шкала P_F. */
        power: sensoryPowerOf(levels, intensity),
      });
    }
    return map;
  }, [families, selection, faults, customTags, intensity]);

  /* Последние цели для пружин (mirrored ref — читается rAF-циклом). */
  const targetsRef = useRef({ families, stats, activeId, closing });
  targetsRef.current = { families, stats, activeId, closing };

  const physRef = useRef<Map<string, SlicePhys>>(new Map());
  const rotRef = useRef({ a: 0, v: 0 });
  const rafRef = useRef(0);
  const runningRef = useRef(false);

  const physOf = (key: string): SlicePhys => {
    let p = physRef.current.get(key);
    if (!p) {
      p = reducedMotion
        ? { w: 1, wv: 0, r: R_BASE, rv: 0 }
        : { w: CLOSED_W, wv: 0, r: CLOSED_R, rv: 0 };
      physRef.current.set(key, p);
    }
    return p;
  };

  /* Пружинный цикл: веса → углы → поворот. Полу-неявный Эйлер. */
  const startLoop = (): void => {
    if (runningRef.current || reducedMotion) return;
    runningRef.current = true;
    let last = performance.now();

    const step = (now: number): void => {
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
      last = now;
      const t = targetsRef.current;

      let settled = true;
      const doneClosing: string[] = [];

      for (const fam of t.families) {
        const p = physOf(fam.key);
        const isClosing = t.closing.includes(fam.key);
        const st = t.stats.get(fam.key);
        /* ТЗ Engine §2.А: Weight = 1 + Energy + 0.65·√UniqueCount. */
        const wTarget = isClosing ? CLOSED_W : (st?.weight ?? 1);
        /* Экструзия: ••• выдвигает сектор на 16px наружу, •• — на 8px. */
        const rTarget = isClosing ? CLOSED_R : R_BASE + (st?.extrusionPx ?? 0);

        p.wv += (SPRING.wK * (wTarget - p.w) - SPRING.wD * p.wv) * dt;
        p.w += p.wv * dt;
        p.rv += (SPRING.rK * (rTarget - p.r) - SPRING.rD * p.rv) * dt;
        p.r += p.rv * dt;

        if (Math.abs(wTarget - p.w) > 0.003 || Math.abs(p.wv) > 0.003) settled = false;
        if (Math.abs(rTarget - p.r) > 0.3 || Math.abs(p.rv) > 0.3) settled = false;
        if (isClosing && p.w < 0.06 && Math.abs(p.wv) < 0.05) doneClosing.push(fam.key);
      }

      /* Поворот: активный сектор → на 3 часа (0°), иначе кольцо возвращается. */
      const rot = rotRef.current;
      let rotTarget = shortestTo(rot.a, 0);
      if (t.activeId) {
        const total = t.families.reduce((s, f) => s + physOf(f.key).w, 0) || 1;
        let acc = START_AT;
        for (const fam of t.families) {
          const w = physOf(fam.key).w;
          const span = (w / total) * 360;
          if (fam.key === t.activeId) {
            rotTarget = shortestTo(rot.a, -(acc + span / 2));
            break;
          }
          acc += span;
        }
      }
      rot.v += (SPRING.rotK * (rotTarget - rot.a) - SPRING.rotD * rot.v) * dt;
      rot.a += rot.v * dt;
      if (Math.abs(rotTarget - rot.a) > 0.05 || Math.abs(rot.v) > 0.05) settled = false;

      setTick((x) => x + 1);

      if (doneClosing.length > 0) setClosing((c) => c.filter((k) => !doneClosing.includes(k)));

      if (settled) {
        runningRef.current = false;
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    startLoop();
     
  });

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    },
    [],
  );

  /* Esc и клик мимо колеса закрывают панель (pointerdown вне корневого блока). */
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setActiveId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!activeId) return;
    const onDown = (e: PointerEvent): void => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setActiveId(null);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [activeId]);

  /* ── Действия ──────────────────────────────────────────────────────────── */

  const [limitFlash, setLimitFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashLimit = (): void => {
    setLimitFlash(true);
    vibrate([20, 60, 20]);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setLimitFlash(false), 2600);
  };

  const toggleAroma = (famKey: string, id: string): void => {
    const cur = selection[id] ?? 0;
    /* Лимит 10: новый дескриптор не добавится, пока не снят лишний. */
    if (cur === 0 && Object.keys(selection).length >= MAX_DESCRIPTORS) {
      flashLimit();
      return;
    }
    const next = (cur + 1) % 4;
    const updated: AromaSelection = { ...selection };
    if (next === 0) delete updated[id];
    else updated[id] = next as DescriptorLevel;
    onChange(updated);
    setPulse((p) => ({ key: famKey, seq: p.seq + 1 }));
    vibrate(next === 0 ? 6 : [8, 30, 8]);
  };

  const toggleFault = (id: string): void => {
    const cur = SEVERITY_LEVEL[faults.find((f) => f.type === id)?.severity ?? ''] ?? 0;
    const next = ((cur + 1) % 4) as 0 | 1 | 2 | 3;
    onFaultLevel(id as FaultType, next === 0 ? null : (next as DescriptorLevel));
    setPulse((p) => ({ key: 'faults', seq: p.seq + 1 }));
    vibrate(next === 0 ? 6 : [8, 30, 8]);
  };

  const toggleFaultsShown = (): void => {
    vibrate(12);
    const next = !showFaults;
    setShowFaults(next);
    try {
      localStorage.setItem('wheel-show-faults', next ? '1' : '0');
    } catch {
      // приватный режим — состояние живёт сессию
    }
    if (!next) {
      if (activeId === 'faults') setActiveId(null);
      setClosing((c) => (c.includes('faults') ? c : [...c, 'faults']));
    }
    startLoop();
  };

  const goToNextFamily = (): void => {
    const ids = families.map((f) => f.key);
    const idx = activeId ? ids.indexOf(activeId) : -1;
    setActiveId(ids[(idx + 1) % ids.length] ?? ids[0] ?? null);
    vibrate(8);
  };

  const clearAll = (): void => {
    if (Object.keys(selection).length > 0) onChange({});
    vibrate([10, 40, 10]);
  };

  /* ── Свои дескрипторы: ввод по Enter, цикл уровней, удаление ─────────── */

  const [customDraft, setCustomDraft] = useState('');
  /** Библиотечные теги активного семейства (глобальные + прикреплённые к карточке). */
  const familyTags = useMemo(
    () => (activeId && activeId !== 'faults' ? libraryTags.filter((t) => t.family === activeId) : []),
    [libraryTags, activeId],
  );

  const submitCustom = (): void => {
    const label = customDraft.trim().replace(/\s+/g, ' ');
    if (!label || !activeFamily || activeFamily.isFault) return;
    if (familyTags.length >= MAX_CUSTOM_PER_FAMILY) {
      flashLimit();
      return;
    }
    if (familyTags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setCustomDraft('');
      return;
    }
    onAddCustom(activeFamily.key as AromaFamily, label.slice(0, 28));
    setCustomDraft('');
    vibrate(10);
  };

  /** Тап по библиотечному тегу: не в карточке — прикрепить и дать •; иначе цикл. */
  const toggleLibraryTag = (tag: NoseCustomTag): void => {
    if (!activeFamily) return;
    const attached = customTags.some((t) => t.id === tag.id);
    if (!attached) {
      /* Лимит 10: новый дескриптор не добавится, пока не снят лишний. */
      if (Object.keys(selection).length >= MAX_DESCRIPTORS) {
        flashLimit();
        return;
      }
      onUseLibraryTag(tag);
      setPulse((p) => ({ key: activeFamily.key, seq: p.seq + 1 }));
      vibrate([8, 30, 8]);
      return;
    }
    toggleAroma(activeFamily.key, tag.id);
  };

  /* ── Геометрия кадра ───────────────────────────────────────────────────── */

  const rot = rotRef.current.a;
  const totalW = families.reduce((s, f) => s + physOf(f.key).w, 0) || 1;

  interface Slice {
    fam: WheelFamily;
    a0: number;
    a1: number;
    mid: number;
    rOut: number;
    score: number;
    count: number;
    power: number;
    isActive: boolean;
  }
  const slices: Slice[] = [];
  let acc = START_AT;
  for (const fam of families) {
    const p = physOf(fam.key);
    const span = (p.w / totalW) * 360;
    const st = stats.get(fam.key) ?? { score: 0, count: 0, power: 0 };
    slices.push({
      fam,
      a0: acc,
      a1: acc + span,
      mid: acc + span / 2,
      rOut: p.r,
      score: st.score,
      count: st.count,
      power: st.power,
      isActive: activeId === fam.key,
    });
    acc += span;
  }

  const totalCount =
    Object.keys(selection).length + (showFaults ? faults.length : 0);
  const activeFamily = families.find((f) => f.key === activeId) ?? null;
  const faultCount = faults.length;

  /* ТЗ v3 §3.1: доминанты — два ведущих семейства по силе P_F (пороки не
   * считаются доминантами вкуса — это дефекты, а не профиль). */
  const dominants = useMemo(() => {
    const noble = [...stats.entries()]
      .filter(([key, st]) => key !== 'faults' && st.power > 0)
      .sort((a, b) => b[1].power - a[1].power)
      .slice(0, 2);
    return noble.map(([key]) => key);
  }, [stats]);

  /* ТЗ v3 §3.1: мини-индикатор регистра свежести, если выбраны фрукты. */
  const fruitRegisterKey = useMemo(() => {
    const st = stats.get('fruit');
    if (!st || st.power <= 0) return null;
    let freshW = 0;
    let denseW = 0;
    for (const [id, lvl] of Object.entries(selection)) {
      if (!lvl || lvl <= 0) continue;
      const tag = customTags.find((t) => t.id === id);
      const famKey = tag
        ? tag.family
        : BASE_FAMILIES.find((f) => f.groups.some((g) => g.items.some((i) => i.id === id)))?.key;
      if (famKey !== 'fruit') continue;
      if (isDenseFruit(id, tag?.label ?? null)) denseW += lvl;
      else freshW += lvl;
    }
    if (freshW + denseW === 0) return null;
    const phi = freshW / (freshW + denseW + 0.0001);
    return phi >= 0.7 ? 'primary-crunch' : phi >= 0.35 ? 'ripe-balance' : 'tertiary-depth';
  }, [stats, selection, customTags]);

  const labelFs = (spanDeg: number, rMid: number, label: string): number => {
    const arcPx = rMid * ((spanDeg * Math.PI) / 180);
    // 0.68 — средняя ширина глифа; ×0.86 — запас, чтобы подписи соседей не слипались
    return Math.max(7.5, Math.min(10, (arcPx / (label.length * 0.68)) * 0.86));
  };

  /* ТЗ v3 §3.1: размер шрифта доминантов в ступице — влезть в диаметр 100. */
  const hubFs = (label: string): number => Math.max(6.6, Math.min(9, 88 / (label.length * 0.62)));

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative z-20 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 lg:gap-7">
        {/* ── Колесо ── */}
        <div className={`shrink-0 flex flex-col items-center gap-2.5 ${activeId ? 'wheel-glide' : ''}`}>
          <svg
            viewBox="-175 -175 350 350"
            className="w-[min(340px,86vw)] h-auto overflow-visible select-none"
            role="group"
            aria-label={T(`Колесо ароматов: отмечено дескрипторов ${totalCount}`)}
          >
            <defs>
              {families.map((f) => (
                <radialGradient key={f.key} id={`wg-${f.key}`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="142">
                  <stop offset="0" stopColor={shade(f.hue, -32)} />
                  <stop offset="0.62" stopColor={f.hue} />
                  <stop offset="1" stopColor={shade(f.hue, 16)} />
                </radialGradient>
              ))}
            </defs>

            {slices.map((s, i) => {
              const d = donutPath(s.a0 + rot, s.a1 + rot, R_IN, s.rOut);
              if (!d) return null;
              const rMid = (R_IN + s.rOut) / 2;
              const [lx, ly] = polar(s.mid + rot, rMid);
              const span = s.a1 - s.a0;
              const fs = labelFs(span, rMid, s.fam.short);
              const filled = s.count > 0 || s.isActive;
              const isPulse = pulse.key === s.fam.key;
              /* ТЗ v3 §3.2: благородное внутреннее свечение при P_F ≥ 7.0. */
              const glowing = s.power >= 7 && !s.isActive;
              return (
                <g key={s.fam.key}>
                  {/* Ореол активного сектора: слои обводок вместо CSS blur(9px).
                      CSS-фильтры на SVG-путях — известный триггер GPU-краша
                      рендерера Chrome («серый экран»); обводки дают тот же
                      мягкий ореол силами самой геометрии. */}
                  {s.isActive && (
                    <>
                      <path d={d} fill="none" stroke={s.fam.hue} strokeWidth="11" opacity="0.14" strokeLinejoin="round" aria-hidden />
                      <path d={d} fill="none" stroke={s.fam.hue} strokeWidth="5.5" opacity="0.2" strokeLinejoin="round" aria-hidden />
                      <path d={d} fill={s.fam.hue} opacity="0.32" aria-hidden />
                    </>
                  )}
                  {/* Благородное свечение P_F ≥ 7: подложка-обводка под сектором
                      вместо drop-shadow (тот же неон, нулевой GPU-риск). */}
                  {glowing && (
                    <path d={d} fill="none" stroke={s.fam.hue} strokeWidth="4.5" opacity="0.5" strokeLinejoin="round" aria-hidden />
                  )}
                  <path
                    d={d}
                    fill={`url(#wg-${s.fam.key})`}
                    fillOpacity={s.isActive ? 0.95 : s.count > 0 ? 0.78 : 0.3}
                    stroke={s.isActive ? '#e5c179' : '#121915'}
                    strokeWidth={s.isActive ? 2 : 1.4}
                    className="wheel-sector cursor-pointer"
                    style={{ animationDelay: `${i * 35}ms` }}
                    role="button"
                    aria-label={T(`${s.fam.label}: дескрипторов отмечено ${s.count}${s.power > 0 ? `, сила ${s.power.toFixed(1)} из 10` : ''}`)}
                    aria-pressed={s.isActive}
                    onClick={() => {
                      vibrate(10);
                      setActiveId(s.isActive ? null : s.fam.key);
                    }}
                  />
                  {isPulse && (
                    <path
                      key={`pulse-${pulse.seq}`}
                      d={d}
                      fill="none"
                      stroke={s.fam.hue}
                      strokeWidth="2.5"
                      className="wheel-pulse"
                    />
                  )}
                  <g transform={`translate(${lx.toFixed(2)} ${ly.toFixed(2)})`} className="pointer-events-none">
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={fs}
                      fontWeight={700}
                      letterSpacing="0.02em"
                      fill={filled ? '#171207' : '#d3d9c8'}
                    >
                      {T(s.fam.short)}
                    </text>
                    {s.power > 0 && (
                      <text
                        y={12}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={9}
                        fontWeight={800}
                        className="tnum"
                        fill={filled ? '#54431c' : '#8a9484'}
                      >
                        {s.power.toFixed(1)}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}

            {/* ── Ступица: число + доминанты + регистр свежести (ТЗ v3 §3.1) ── */}
            <g
              className="cursor-pointer"
              role="button"
              aria-label={activeId ? T('Закрыть панель дескрипторов') : T(`Всего дескрипторов: ${totalCount}${dominants.length > 0 ? `, доминанты: ${dominants.map((k) => SHORT_LABEL[k] ?? k).join(' · ')}` : ''}`)}
              onClick={() => setActiveId(null)}
            >
              <circle r={R_HUB} fill="#0d120f" stroke="#2b3d30" strokeWidth="1.5" />
              <circle r={R_HUB - 6.5} fill="none" stroke="#2b3d30" strokeWidth="0.75" opacity="0.6" />
              <text
                y={totalCount > 0 ? -21 : -3}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8.5"
                letterSpacing="0.18em"
                fill="#9da395"
                style={{ textTransform: 'uppercase' }}
              >
                {activeId ? T('закрыть') : T('ароматов')}
              </text>
              {totalCount > 0 && (
                <text
                  key={totalCount}
                  y={-2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="25"
                  fontWeight={800}
                  fill="#e5c179"
                  className="tnum pop-in"
                >
                  {totalCount}
                </text>
              )}
              {dominants.length > 0 && (
                <text
                  key={dominants.join('|')}
                  y={totalCount > 0 ? 16 : 0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={hubFs(dominants.map((k) => T(SHORT_LABEL[k] ?? k)).join(' · '))}
                  fontWeight={700}
                  fill="#e5c179"
                  className="pop-in"
                >
                  {dominants.map((k) => T(SHORT_LABEL[k] ?? k)).join(' · ')}
                </text>
              )}
              {fruitRegisterKey && (
                <text
                  y={dominants.length > 0 ? (totalCount > 0 ? 30 : 14) : totalCount > 0 ? 16 : 0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="6.6"
                  fontWeight={800}
                  letterSpacing="0.14em"
                  fill={REGISTER_COLOR[fruitRegisterKey] ?? '#e5c179'}
                  style={{ textTransform: 'uppercase' }}
                >
                  {FRESH_REGISTER_LABELS[fruitRegisterKey]}
                </text>
              )}
            </g>
          </svg>

          <div className="flex items-center justify-between gap-3 w-full max-w-[340px] px-1">
            <span className="text-[10.5px] text-ink-faint leading-snug">
              {T('Тап по сектору — панель дескрипторов')}
            </span>
            {totalCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] text-ink-faint hover:text-[#e8b3ac] transition whitespace-nowrap"
              >
                {T('Сбросить всё ×')}
              </button>
            )}
          </div>

          {limitFlash && (
            <p
              role="status"
              className="px-3 py-1.5 rounded-lg border border-garnet/50 bg-garnet/10 text-[11px] font-semibold text-[#f0a49b] text-center"
            >
              {T(`Лимит: не больше ${MAX_DESCRIPTORS} активных дескрипторов — снимите лишний, чтобы добавить новый`)}
            </p>
          )}
        </div>

        {/* ── Панель дескрипторов ── */}
        {activeFamily && (
          <div className="w-full lg:flex-1 min-w-0 wheel-panel-in rounded-2xl bg-cellar-deep/90 border border-hairline shadow-cellar overflow-hidden">
            <div key={activeFamily.key} className="wheel-panel-swap p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-hairline/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/30"
                    style={{ backgroundColor: activeFamily.hue, boxShadow: `0 0 10px ${activeFamily.hue}66` }}
                  />
                  <h4 className="text-[15px] font-bold text-ink truncate">{T(activeFamily.label)}</h4>
                  {activeFamily.isFault && (
                    <span className="hidden sm:inline text-[10px] font-semibold text-[#f0a49b] whitespace-nowrap">
                      {T('→ статус «С дефектом»')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={goToNextFamily}
                    className="px-2.5 py-1 rounded-lg border border-hairline bg-surface text-xs text-gold-soft hover:text-ink hover:border-gold transition"
                  >
                    {T('Далее ➔')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    aria-label={T('Закрыть панель')}
                    className="px-2.5 py-1 rounded-lg border border-hairline text-xs text-ink-faint hover:text-ink transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[300px] lg:max-h-[340px] overflow-y-auto pr-1">
                {activeFamily.groups.map((group, gi) => (
                  <div
                    key={group.label}
                    className="desc-group-in"
                    style={{ animationDelay: `${gi * 70}ms` }}
                  >
                    <p className="text-[11px] uppercase tracking-wider text-ink-faint mb-2">
                      {T(group.label)}
                      {(() => {
                        const hintVal = AROMA_GROUP_HINTS[group.label];
                        return hintVal ? (
                          <span className="normal-case tracking-normal text-ink-faint/70"> · {T(hintVal)}</span>
                        ) : null;
                      })()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const level = activeFamily.isFault
                          ? SEVERITY_LEVEL[faults.find((f) => f.type === item.id)?.severity ?? ''] ?? 0
                          : selection[item.id] ?? 0;
                        const selected = level > 0;
                        const bg = activeFamily.isFault
                          ? ['#7d403b', '#94504a', '#aa5f57'][level - 1] ?? '#7d403b'
                          : ['#a3824b', '#c59b4e', '#e5c179'][level - 1] ?? '#a3824b';
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={item.hint ? T(item.hint) : undefined}
                            aria-pressed={selected}
                            onClick={() =>
                              activeFamily.isFault ? toggleFault(item.id) : toggleAroma(activeFamily.key, item.id)
                            }
                            className={`min-h-[38px] px-3 rounded-xl text-xs sm:text-[13px] border transition-all active:scale-95 flex items-center gap-1.5 ${
                              selected
                                ? 'border-transparent font-semibold shadow-sm'
                                : 'border-hairline bg-surface text-ink-dim hover:text-ink hover:border-gold/40'
                            }`}
                            style={selected ? { backgroundColor: bg, color: activeFamily.isFault ? '#fbe9e5' : '#171207' } : undefined}
                          >
                            <span>{T(item.label)}</span>
                            {selected && (
                              <span key={level} className="level-dots font-mono text-[11px] tracking-tighter opacity-80" aria-label={T(`уровень ${level}`)}>
                                {'•'.repeat(level)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* ── Свои дескрипторы: глобальная библиотека (не для пороков) ── */}
                {!activeFamily.isFault && (
                  <div className="desc-group-in" style={{ animationDelay: `${activeFamily.groups.length * 70}ms` }}>
                    <p className="text-[11px] uppercase tracking-wider text-ink-faint mb-2">
                      {T('Свои дескрипторы')}
                      <span className="normal-case tracking-normal text-ink-faint/70"> · {T('привязаны к')} «{T(activeFamily.short)}», {T('тап — цикл • → •• → ••• → снять; сохраняются для всех дегустаций')}</span>
                    </p>
                    {familyTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {familyTags.map((tag) => {
                          const level = selection[tag.id] ?? 0;
                          const selected = level > 0;
                          const bg = ['#a3824b', '#c59b4e', '#e5c179'][level - 1] ?? '#a3824b';
                          return (
                            <span
                              key={tag.id}
                              className="inline-flex items-center overflow-hidden rounded-xl border"
                            >
                              <button
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleLibraryTag(tag)}
                                className={`min-h-[38px] px-3 text-xs sm:text-[13px] border-r border-black/20 transition-all active:scale-95 flex items-center gap-1.5 ${
                                  selected
                                    ? 'border-transparent font-semibold shadow-sm'
                                    : 'border-transparent bg-surface text-ink-dim hover:text-ink hover:border-gold/40'
                                }`}
                                style={selected ? { backgroundColor: bg, color: '#171207' } : undefined}
                              >
                                <span>{T(tag.label)}</span>
                                {selected && (
                                  <span key={level} className="level-dots font-mono text-[11px] tracking-tighter opacity-80" aria-label={T(`уровень ${level}`)}>
                                    {'•'.repeat(level)}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={T(`Удалить свой дескриптор «${tag.label}» из библиотеки`)}
                                title={T('Удалить из библиотеки (и из этой карточки)')}
                                onClick={() => {
                                  vibrate(8);
                                  onRemoveCustom(tag.id);
                                }}
                                className="min-h-[38px] px-2 text-ink-faint hover:text-[#e8b3ac] bg-surface transition"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        value={customDraft}
                        onChange={(e) => setCustomDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            submitCustom();
                          }
                        }}
                        maxLength={28}
                        placeholder={T(`+ Свой дескриптор (${activeFamily.short.toLowerCase()})…`)}
                        aria-label={T(`Новый свой дескриптор для семейства ${activeFamily.label}`)}
                        className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-cellar-deep border border-hairline text-[13px] text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={submitCustom}
                        disabled={!customDraft.trim()}
                        className="shrink-0 h-10 px-3.5 rounded-xl border border-hairline bg-surface text-xs text-ink-dim hover:text-ink hover:border-gold/60 disabled:opacity-40 disabled:hover:border-hairline transition"
                      >
                        Enter ↵
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-ink-faint mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between gap-3 flex-wrap">
                <span>
                  {activeFamily.isFault
                    ? T('Тап: 1 легко → 2 отчётливо → 3 сильно')
                    : T('Тап: 1 лёгкий → 2 выраженный → 3 интенсивный')}
                </span>
                {activeFamily.isFault && (
                  <span className="text-danger font-semibold">{T('Влияет на чистоту вина')}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Тумблер пороков / химии ── */}
      <div className="mt-5 flex items-center justify-between gap-3 p-3 rounded-xl bg-surface/50 border border-hairline">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className={`w-2 h-2 rounded-full shrink-0 ${showFaults ? 'bg-danger animate-pulse' : 'bg-ink-faint'}`}
          />
          <span className="text-xs text-ink-dim leading-snug">
            {T('Химические тона и пороки (TCA, редукция, бретт, уксус)')}
          </span>
          {!showFaults && faultCount > 0 && (
            <span className="shrink-0 text-[10px] font-semibold text-[#f0a49b] tnum">
              {T('отмечено')}: {faultCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleFaultsShown}
          aria-pressed={showFaults}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            showFaults
              ? 'border-danger/60 bg-danger/20 text-[#f0a49b]'
              : 'border-hairline bg-surface text-ink-faint hover:text-ink'
          }`}
        >
          {showFaults ? T('На колесе — убрать') : T('+ Добавить пороки')}
        </button>
      </div>
    </div>
  );
}
