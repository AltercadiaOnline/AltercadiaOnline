export type WeightedEntry<T> = {
  readonly weight: number;
  readonly value: T;
};

/**
 * Sorteio ponderado — pesos ≤ 0 são ignorados.
 * @returns null se não houver candidatos com peso positivo.
 */
export function pickWeighted<T>(
  entries: readonly WeightedEntry<T>[],
  rng: () => number = Math.random,
): T | null {
  let total = 0;
  for (const entry of entries) {
    if (entry.weight > 0) total += entry.weight;
  }
  if (total <= 0) return null;

  let roll = rng() * total;
  for (const entry of entries) {
    if (entry.weight <= 0) continue;
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }

  return entries.find((entry) => entry.weight > 0)?.value ?? null;
}
