import type { AccountProfile } from './types/account.js';

/** Perfil mock até o gateway enviar snapshot autoritativo. */
export const DEV_ACCOUNT_PROFILE: AccountProfile = {
  userId: '123',
  characters: [
    { id: 1, name: 'CaelMartins', class: 'IMPETUS', level: 1 },
    { id: 2, name: 'Mirela', class: 'COGITOR', level: 5 },
  ],
};
