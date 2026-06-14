/**
 * Conversão teclado → vetor de movimento no mundo.
 *
 * Não usa `Camera.transform` nem coordenadas de tela — WASD mapeia para eixos
 * fixos do mundo (cima = norte = −Y, equivalente ao +Z / frente do personagem).
 */
export {
  composeKeyboardMoveVector as keyboardToWorldMoveVector,
  composeKeyboardGridStep as keyboardToWorldGridStep,
  composeWorldAlignedMoveVector,
  composeWorldAlignedGridStep,
  createWorldAxisBasis,
  WORLD_AXIS_IDENTITY,
  type WorldAxisBasis,
  type CardinalInput as MovementCardinalInput,
} from '../../shared/world/worldMovementAxis.js';
