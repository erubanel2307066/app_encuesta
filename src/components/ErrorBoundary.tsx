import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-red-50 rounded-[2rem] border-2 border-red-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-red-100 text-red-600 rounded-full mb-4">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-red-900 mb-2">Oops, algo salió mal.</h2>
            <p className="text-red-600 font-medium mb-6 max-w-md mx-auto">
              {this.state.error?.message || "Ha ocurrido un error inesperado al renderizar este componente."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
            >
              <RefreshCcw size={20} />
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
