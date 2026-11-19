import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
    this.handleReset = this.handleReset.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Caught in ErrorBoundary:", error?.message, errorInfo);
  }

  private handleReset() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase">Application Recovery</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              A temporary display error was safely intercepted. You can reset your session or reload the application to continue.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
