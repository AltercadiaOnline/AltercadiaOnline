/** Marca pública — nunca usar URLs técnicas (Supabase API, Railway, Vercel) na UI. */
export const GAME_BRAND_NAME = 'Altercadia.online';
export const GAME_BRAND_SHORT = 'Altercadia';

/** Mensagens visíveis ao jogador (login, bootstrap, OAuth). */
export const USER_AUTH_UNAVAILABLE =
  `${GAME_BRAND_SHORT} está temporariamente indisponível. Tente novamente em instantes.`;

export const USER_AUTH_NOT_CONFIGURED =
  `Login indisponível no momento. Tente novamente mais tarde ou contate o suporte de ${GAME_BRAND_NAME}.`;

export const USER_REGISTER_UNAVAILABLE =
  `Cadastro indisponível no momento. Tente novamente mais tarde ou contate o suporte de ${GAME_BRAND_NAME}.`;

export const USER_GOOGLE_LOGIN_UNAVAILABLE =
  `Login com Google indisponível no momento. Tente novamente em instantes.`;

export const USER_PASSWORD_RESET_UNAVAILABLE =
  `Recuperação de senha indisponível no momento. Tente novamente mais tarde.`;

export const USER_EMAIL_CONFIRM_UNAVAILABLE =
  `Confirmação de email indisponível no momento. Tente novamente mais tarde.`;

export const USER_SERVER_OFFLINE =
  `${GAME_BRAND_SHORT} está offline. Tente novamente em alguns minutos.`;

export const USER_CONFIG_LOAD_FAILED =
  `Não foi possível conectar a ${GAME_BRAND_NAME}. Verifique sua internet e tente novamente.`;

export const USER_OAUTH_FAILED =
  `Não foi possível concluir o login com Google em ${GAME_BRAND_NAME}. Tente novamente.`;

export const USER_GOOGLE_REDIRECT = `Redirecionando para ${GAME_BRAND_NAME} (Google)…`;

export const USER_GOOGLE_CONNECTING = `Conectando com Google em ${GAME_BRAND_NAME}…`;

export const USER_WS_CONNECT_FAILED =
  `Não foi possível conectar a ${GAME_BRAND_NAME}. Tente novamente em instantes.`;

export const USER_GAME_HOST_MISSING =
  `${GAME_BRAND_NAME} não está configurado neste link. Use o endereço oficial do jogo (servidor Railway), não apenas a página estática da Vercel.`;
