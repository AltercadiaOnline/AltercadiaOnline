// @ts-nocheck
import { Component } from 'react';
/** Isola falha de chunk lazy — sidebar não some com o world shell. */
export class HudErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error) {
        console.error('[HUD]', error);
    }
    render() {
        if (this.state.error) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}
