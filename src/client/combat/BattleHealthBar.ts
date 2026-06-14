import { CombatAnimator } from './CombatAnimator.js';

export type HpBarTargets = {
  readonly fill: HTMLElement;
  readonly text: HTMLElement | null;
  readonly maxHp: number;
  readonly currentHp: number;
};

export function parseHpFromBarText(text: string | null | undefined): { current: number; max: number } | null {
  if (!text) return null;
  const match = text.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { current: Number(match[1]), max: Number(match[2]) };
}

/**
 * Animação suave da barra de HP — espelha hpAfter do servidor.
 */
export class BattleHealthBar {
  async animateTo(
    targets: HpBarTargets,
    hpAfter: number,
    durationMs: number,
  ): Promise<void> {
    const maxHp = Math.max(1, targets.maxHp);
    const fromHp = targets.currentHp;
    const toHp = Math.max(0, Math.min(maxHp, hpAfter));

    if (durationMs <= 0 || Math.abs(fromHp - toHp) < 0.5) {
      this.applyInstant(targets.fill, targets.text, toHp, maxHp);
      return;
    }

    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 2;
        const hp = fromHp + (toHp - fromHp) * eased;
        this.applyInstant(targets.fill, targets.text, hp, maxHp);
        if (t >= 1) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  applyInstant(
    fill: HTMLElement,
    text: HTMLElement | null,
    hp: number,
    maxHp: number,
  ): void {
    const max = Math.max(1, maxHp);
    const ratio = Math.min(100, Math.max(0, (hp / max) * 100));
    fill.style.width = `${ratio}%`;
    if (text) text.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
  }

  /** Fallback quando requestAnimationFrame não está disponível (testes). */
  async animateToWithWait(
    targets: HpBarTargets,
    hpAfter: number,
    durationMs: number,
  ): Promise<void> {
    const maxHp = Math.max(1, targets.maxHp);
    const fromHp = targets.currentHp;
    const toHp = Math.max(0, Math.min(maxHp, hpAfter));
    const steps = Math.max(1, Math.ceil(durationMs / 16));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const eased = 1 - (1 - t) ** 2;
      const hp = fromHp + (toHp - fromHp) * eased;
      this.applyInstant(targets.fill, targets.text, hp, maxHp);
      await CombatAnimator.wait(durationMs / steps);
    }
  }
}
