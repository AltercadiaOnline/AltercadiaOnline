/** Duração visível do balão (ms). */
export const SPEECH_BUBBLE_LIFETIME_MS = 3000;

/** Fade-out nos últimos N ms de vida. */
export const SPEECH_BUBBLE_FADE_MS = 500;

/** Deslocamento vertical entre balões no mesmo tile (px mundo). */
export const SPEECH_BUBBLE_STACK_STEP_PX = 26;

/** Deslocamento horizontal — balão à direita do centro do personagem (px mundo). */
export const SPEECH_BUBBLE_OFFSET_X_PX = 32;

/** Deslocamento vertical a partir do topo visual — abaixo do nametag (px mundo, + = para baixo). */
export const SPEECH_BUBBLE_OFFSET_Y_PX = 28;

/** Máximo de linhas visíveis no balão sobre o personagem. */
export const SPEECH_BUBBLE_MAX_LINES = 3;

/**
 * Limite de caracteres no chat global / balão (~3 linhas no renderer).
 * Fonte única para cliente e servidor.
 */
export const SPEECH_BUBBLE_MAX_TEXT_CHARS = 72;
