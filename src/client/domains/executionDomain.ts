/** Barreira de domínio — login/char select vs mundo/jogo. */
export type ExecutionDomain = 'login' | 'game';

let activeDomain: ExecutionDomain = 'login';

export function getExecutionDomain(): ExecutionDomain {
  return activeDomain;
}

export function isLoginDomainActive(): boolean {
  return activeDomain === 'login';
}

export function isGameDomainActive(): boolean {
  return activeDomain === 'game';
}

export function activateGameDomain(): void {
  activeDomain = 'game';
}

export function deactivateGameDomain(): void {
  activeDomain = 'login';
}
