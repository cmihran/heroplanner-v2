import { Component, type ErrorInfo, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const isTauri = '__TAURI_INTERNALS__' in window;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const message = `[REACT ERROR] ${error.message}\n${info.componentStack ?? ''}`;
    if (isTauri) {
      invoke('log_frontend_error', { message });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', backgroundColor: '#1a1a2e', fontFamily: 'monospace', height: '100vh' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: '#ccc' }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
