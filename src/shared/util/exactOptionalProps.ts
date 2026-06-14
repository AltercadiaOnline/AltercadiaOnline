/**
 * Remove chaves com valor `undefined` — necessário com exactOptionalPropertyTypes.
 * Propriedades opcionais (`foo?: T`) não aceitam `undefined` explícito no assign.
 */
export type ExactOptionalProps<T extends Record<string, unknown>> = {
  [K in keyof T as T[K] extends undefined ? never : K]: Exclude<T[K], undefined>;
};

export function exactOptionalProps<T extends Record<string, unknown>>(
  input: T,
): ExactOptionalProps<T> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input) as (keyof T)[]) {
    const value = input[key];
    if (value !== undefined) {
      out[key as string] = value;
    }
  }
  return out as ExactOptionalProps<T>;
}
