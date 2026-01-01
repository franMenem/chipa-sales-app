import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 mb-4">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-4xl">
                  error
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Algo salió mal
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Ocurrió un error inesperado. Por favor intenta nuevamente.
              </p>

              {this.state.error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/50">
                  <p className="text-sm font-mono text-red-700 dark:text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full py-3 px-4 bg-primary text-background-dark font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Intentar nuevamente
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">home</span>
                  Volver al inicio
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
