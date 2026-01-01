import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Layout } from './Layout';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  pageName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.pageName}] Error:`, error, errorInfo);

    // Aquí podrías enviar el error a un servicio como Sentry
    // sendErrorToService(error, errorInfo, this.props.pageName);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Recargar solo esta página
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Layout title="Error" subtitle={this.props.pageName}>
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-950/50 mb-6">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-5xl">
                error
              </span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
              Error en {this.props.pageName}
            </h2>

            <p className="text-slate-700 dark:text-slate-300 mb-6 text-center max-w-md">
              Ocurrió un error en esta página. Puedes intentar recargarla o volver al inicio.
            </p>

            {this.state.error && (
              <div className="w-full max-w-md mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/50">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  Detalles técnicos:
                </p>
                <p className="text-xs font-mono text-red-700 dark:text-red-400 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <Button
                onClick={this.handleReset}
                variant="primary"
                icon="refresh"
                fullWidth
              >
                Recargar página
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="secondary"
                icon="home"
                fullWidth
              >
                Ir al inicio
              </Button>
            </div>
          </div>
        </Layout>
      );
    }

    return this.props.children;
  }
}
