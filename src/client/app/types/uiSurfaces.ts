/** Superfícies oficiais do cliente online — screen / hud / overlay / render. */
export type UiSurface = 'screen' | 'hud' | 'overlay' | 'render';

/** Modo único — sem ramos legacy-dom / react-hybrid. */
export type UiRuntimeMode = 'online-react-v1' | 'phaser-v1';

export type RenderEngine = 'canvas-legacy' | 'phaser';

export type ViewMode = 'world' | 'battle';
