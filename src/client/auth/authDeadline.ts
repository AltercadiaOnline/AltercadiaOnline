const DEFAULT_AUTH_DEADLINE_MS = 25_000;

export class AuthOperationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthOperationTimeoutError';
  }
}

/** Evita UI presa em "Criando conta…" se Supabase/rede não responder. */
export async function withAuthDeadline<T>(
  operation: Promise<T>,
  message: string,
  deadlineMs = DEFAULT_AUTH_DEADLINE_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AuthOperationTimeoutError(message));
    }, deadlineMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
