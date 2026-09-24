import { useEffect, useRef } from 'react';
import type { PerlageIntensity } from '@/types/wset';

/**
 * Живой холст перляжа: пузырьки поднимаются по «ножкам» потока,
 * мусс собирается сверху. Параметризуется интенсивностью.
 */
export function LivingPerlage({
  intensity = 'medium',
  bubbleSize = 'fine',
  height = 170,
}: {
  intensity?: PerlageIntensity | null;
  bubbleSize?: 'fine' | 'medium' | 'coarse' | null;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const speedMap = { delicate: 0.45, medium: 0.9, vigorous: 1.7 } as const;
    const sizeMap = { fine: [0.6, 1.6], medium: [1.0, 2.4], coarse: [1.6, 3.4] } as const;
    const speed = speedMap[intensity ?? 'medium'];
    const [bMin, bMax] = sizeMap[bubbleSize ?? 'fine'];
    const count = Math.round(w / 6 * speed);

    interface B {
      x: number;
      y: number;
      r: number;
      v: number;
      wob: number;
      phase: number;
    }
    const bubbles: B[] = Array.from({ length: count }, () => ({
      /* Фикс релиза: стартовая популяция — в той же полосе бокала (0.14–0.86),
       * что и респавн. Раньше спавнили по всей ширине холста, и пузыри
       * появлялись левее/правее стенок бокала (сторонний мусор на тёмном фоне). */
      x: w * (0.14 + Math.random() * 0.72),
      y: h + Math.random() * h,
      r: bMin + Math.random() * (bMax - bMin),
      v: (0.35 + Math.random() * 0.75) * speed,
      wob: 4 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = (): void => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      // бокал: стенки
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(229,193,121,0.05)');
      grad.addColorStop(1, 'rgba(197,155,78,0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(w * 0.12, 0, w * 0.76, h);
      ctx.strokeStyle = 'rgba(197,155,78,0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(w * 0.12, 0);
      ctx.lineTo(w * 0.12, h);
      ctx.moveTo(w * 0.88, 0);
      ctx.lineTo(w * 0.88, h);
      ctx.stroke();

      // мусс сверху
      ctx.fillStyle = 'rgba(232,229,167,0.10)';
      ctx.fillRect(w * 0.12, 0, w * 0.76, 8);

      /* Клип по геометрии бокала: даже при максимальном воббле пузырь
       * физически не может пересечь стенку. */
      ctx.save();
      ctx.beginPath();
      ctx.rect(w * 0.12, 0, w * 0.76, h);
      ctx.clip();

      for (const b of bubbles) {
        b.y -= b.v;
        if (b.y < 6) {
          b.y = h + 6;
          b.x = w * (0.14 + Math.random() * 0.72);
        }
        const x = b.x + Math.sin(t * 1.4 + b.phase) * b.wob * 0.35;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(232,229,167,0.75)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      ctx.restore();

      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [intensity, bubbleSize, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-hairline bg-cellar-deep"
      style={{ height }}
      aria-label="Живой перляж"
    />
  );
}
