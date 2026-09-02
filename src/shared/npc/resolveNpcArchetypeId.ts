/**
 * Instâncias multi-spawn usam `{archetypeId}#{index}` (ex.: humano_1#2).
 * Bundles, colisão e definição visual usam sempre o archetype.
 */
export function resolveNpcArchetypeId(instanceOrArchetypeId: string): string {
  const hash = instanceOrArchetypeId.indexOf('#');
  return hash >= 0 ? instanceOrArchetypeId.slice(0, hash) : instanceOrArchetypeId;
}
