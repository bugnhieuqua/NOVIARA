import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NOVIARA ErrorBoundary] Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-6 text-zinc-900 font-sans">
          <div className="card-3d max-w-lg w-full p-8 bg-white border border-slate-300 rounded-3xl shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-700" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-xl font-black text-zinc-950">
                {this.props.fallbackTitle || 'Đã xảy ra sự cố hiển thị'}
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Hệ thống NOVIARA đã phát hiện lỗi hiển thị giao diện. Bạn có thể tải lại trang hoặc khôi phục về trạng thái an toàn.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-xl text-left font-mono text-[11px] text-red-700 max-h-32 overflow-y-auto border border-slate-200">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-3d-emerald px-5 py-2.5 text-xs font-bold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="btn-3d-secondary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
              >
                <Home className="w-4 h-4 text-zinc-700" />
                <span>Về Trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
