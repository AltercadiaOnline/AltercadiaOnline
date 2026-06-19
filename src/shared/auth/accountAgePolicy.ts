export const ADULT_AGE_YEARS = 18;

export type MinorAccountNotice = {
  readonly isMinor: true;
  readonly consentimentoResponsavel: boolean;
  readonly ageYears: number;
};

export function parseBirthDateIso(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function computeAgeYears(birthDateIso: string, referenceDate = new Date()): number | null {
  const birth = parseBirthDateIso(birthDateIso);
  if (!birth) return null;

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAtLeastAge(birthDateIso: string, minYears: number): boolean {
  const age = computeAgeYears(birthDateIso);
  return age !== null && age >= minYears;
}

export function readBirthDateFromUserMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;
  const raw = metadata.dataNascimento ?? metadata.birth_date ?? metadata.data_nascimento;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim();
}

export function readConsentimentoResponsavel(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.consentimento_responsavel === true;
}

/** Flags de conta menor — usado no world-login (servidor) e UI de cadastro (cliente). */
export function resolveMinorAccountNotice(
  metadata: Record<string, unknown> | null | undefined,
): MinorAccountNotice | null {
  const birthDate = readBirthDateFromUserMetadata(metadata);
  if (!birthDate) return null;

  const age = computeAgeYears(birthDate);
  if (age === null || age >= ADULT_AGE_YEARS) return null;

  return {
    isMinor: true,
    consentimentoResponsavel: readConsentimentoResponsavel(metadata),
    ageYears: age,
  };
}

/**
 * Mensagem informativa para menores — null se adulto ou data ausente.
 * O servidor envia como `aviso_menor` no world-login-result; o cliente só exibe.
 */
export function buildAvisoMenor(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const notice = resolveMinorAccountNotice(metadata);
  if (!notice) return null;

  if (notice.consentimentoResponsavel) {
    return 'Conta de menor de idade. Jogue com moderação e siga as regras do Altercadia.';
  }

  return 'Conta de menor de idade. Recomendamos jogar com a orientação de um responsável.';
}
