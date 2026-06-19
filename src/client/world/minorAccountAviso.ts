import { alertSystem } from '../ui/alertSystem.js';

export type MinorAccountAvisoPresentation = 'toast' | 'modal';

let presentationMode: MinorAccountAvisoPresentation = 'toast';

/** Permite trocar toast por modal sem alterar o handler de world-login. */
export function configureMinorAccountAvisoPresentation(
  mode: MinorAccountAvisoPresentation,
): void {
  presentationMode = mode;
}

/**
 * Exibe aviso de conta menor após world-login-result.
 * Chamado assim que a sessão de mundo fica pronta — ponto único de UI para este fluxo.
 */
export function presentMinorAccountAviso(avisoMenor: string | undefined): void {
  const message = avisoMenor?.trim();
  if (!message) return;

  if (presentationMode === 'modal') {
    window.alert(message);
    return;
  }

  alertSystem(message);
}
