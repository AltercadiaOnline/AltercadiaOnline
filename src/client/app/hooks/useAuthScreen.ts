import { useEffect, useState } from 'react';
import {
  getAuthScreenController,
  type AuthScreenSnapshot,
} from '../screen/authScreenController.js';

export function useAuthScreen(): AuthScreenSnapshot {
  const [snapshot, setSnapshot] = useState<AuthScreenSnapshot>(
    () => getAuthScreenController().snapshot(),
  );

  useEffect(() => getAuthScreenController().subscribe(setSnapshot), []);

  return snapshot;
}

export function useAuthScreenActions() {
  const controller = getAuthScreenController();

  return {
    setField: controller.setField.bind(controller),
    goToLogin: controller.goToLogin.bind(controller),
    goToRegister: controller.goToRegister.bind(controller),
    goToForgotPassword: controller.goToForgotPassword.bind(controller),
    handleLogin: () => { void controller.handleLogin(); },
    handleRegister: () => { void controller.handleRegister(); },
    handleGoogleLogin: () => { void controller.handleGoogleLogin(); },
    handleSendPasswordReset: () => { void controller.handleSendPasswordReset(); },
    handleApplyNewPassword: () => { void controller.handleApplyNewPassword(); },
    handleResendConfirmation: () => { void controller.handleResendConfirmation(); },
    handleProfileComplete: () => { void controller.handleProfileComplete(); },
    handleProfileCancel: controller.handleProfileCancel.bind(controller),
    handleContinuePersistedSession: () => { void controller.handleContinuePersistedSession(); },
  };
}
