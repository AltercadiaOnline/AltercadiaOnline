import { useEffect } from 'react';
import { tryCloseReactWorldPanel, tryOpenReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldDiaryPanelProps = {
  zIndex: number;
  focused: boolean;
};

/**
 * Legado — Diário de Memórias migrou para a Ficha do Personagem (conquistas).
 * Se algo ainda abrir `diary`, redireciona.
 */
export function WorldDiaryPanel(_props: WorldDiaryPanelProps) {
  useEffect(() => {
    tryCloseReactWorldPanel('diary');
    tryOpenReactWorldPanel('characters');
  }, []);

  return null;
}
