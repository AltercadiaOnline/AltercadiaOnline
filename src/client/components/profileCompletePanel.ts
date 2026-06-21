import { getAuthScreenController } from '../app/screen/authScreenController.js';

export type ProfileCompletePanelOptions = {
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
};

/** Tela pós-OAuth / contas sem dataNascimento no metadata — React AuthScreen. */
export function showProfileCompletePanel(options: ProfileCompletePanelOptions): void {
  getAuthScreenController().showProfileComplete(options);
}
