import type { ReactNode } from 'react';
import { Component } from 'react';

type Props = {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
};

type State = {
  readonly error: Error | null;
};

/** Isola falha de chunk lazy — sidebar não some com o world shell. */
export class HudErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    console.error('[HUD]', error);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
