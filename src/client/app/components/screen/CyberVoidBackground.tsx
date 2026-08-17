import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  z: number;
  speed: number;
  glyph: string;
};

const GRID_COLOR = 'rgba(0, 212, 255, 0.22)';
const GRID_COLOR_FAINT = 'rgba(0, 212, 255, 0.08)';
const PARTICLE_GLYPHS = ['0', '1', '·', '+', ''] as const;
const PARTICLE_COUNT = 46;
const MAX_DPR = 1.25;

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: 0.25 + Math.random() * 0.75,
    speed: 0.008 + Math.random() * 0.018,
    glyph: PARTICLE_GLYPHS[Math.floor(Math.random() * PARTICLE_GLYPHS.length)] ?? '',
  }));
}

/**
 * Fundo Cyber-Void — grade em perspectiva + partículas leves.
 * Fica atrás da HUD; o canvas não captura clique.
 */
export function CyberVoidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const particles = createParticles(PARTICLE_COUNT);
    let rafId = 0;
    let running = true;
    let gridShift = 0;
    let lastTs = 0;

    const onMouseMove = (event: MouseEvent): void => {
      const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      mouse.tx = Math.max(-1, Math.min(1, nx));
      mouse.ty = Math.max(-1, Math.min(1, ny));
    };

    const resize = (): void => {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(window.innerWidth));
      const h = Math.max(1, Math.floor(window.innerHeight));
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawGrid = (w: number, h: number): void => {
      const vanishX = w * 0.5 + mouse.x * 36;
      const vanishY = h * 0.38 + mouse.y * 10;
      const floorTop = vanishY;
      const rows = 18;
      const cols = 22;

      ctx.lineWidth = 1;
      ctx.strokeStyle = GRID_COLOR;

      ctx.beginPath();
      for (let i = 0; i <= rows; i += 1) {
        const t = (i + (reducedMotion ? 0 : gridShift)) / rows;
        const wrapped = t - Math.floor(t);
        const y = floorTop + wrapped * wrapped * (h - floorTop);
        if (y < floorTop + 2) continue;
        const fade = 1 - wrapped;
        ctx.globalAlpha = 0.18 + fade * 0.45;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = GRID_COLOR_FAINT;
      ctx.beginPath();
      for (let i = -cols; i <= cols; i += 1) {
        const xBottom = w * 0.5 + i * (w / cols) * 1.15;
        ctx.moveTo(vanishX, vanishY);
        ctx.lineTo(xBottom, h + 8);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, vanishY);
      ctx.lineTo(w, vanishY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const drawParticles = (w: number, h: number, dt: number): void => {
      const parallaxX = mouse.x * 28;
      const parallaxY = mouse.y * 16;
      ctx.font = '11px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      for (const particle of particles) {
        if (!reducedMotion) {
          particle.y -= particle.speed * particle.z * dt * 0.045;
          if (particle.y < -0.04) {
            particle.y = 1.04;
            particle.x = Math.random();
          }
        }
        const px = particle.x * w + parallaxX * particle.z;
        const py = particle.y * h + parallaxY * (1 - particle.z);
        const alpha = 0.12 + particle.z * 0.35;
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
        if (particle.glyph) {
          ctx.fillText(particle.glyph, px, py);
        } else {
          ctx.fillRect(px, py, 1.4, 1.4 + particle.z * 2);
        }
      }
    };

    const tick = (ts: number): void => {
      if (!running || document.hidden) return;
      const dt = lastTs === 0 ? 16 : Math.min(48, ts - lastTs);
      lastTs = ts;

      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      if (!reducedMotion) {
        gridShift = (gridShift + dt * 0.0065) % 1;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const haze = ctx.createRadialGradient(w * 0.5, h * 0.36, 12, w * 0.5, h * 0.42, h * 0.72);
      haze.addColorStop(0, 'rgba(0, 40, 55, 0.35)');
      haze.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);

      drawGrid(w, h);
      drawParticles(w, h, dt);
      rafId = window.requestAnimationFrame(tick);
    };

    const onVisibility = (): void => {
      if (document.hidden || !running) return;
      lastTs = 0;
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="cyber-void" aria-hidden="true">
      <canvas ref={canvasRef} className="cyber-void__canvas" />
      <div className="cyber-void__scanline" />
    </div>
  );
}
