"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-[#5b1f1f] bg-[#331414] p-5 text-center">
            <div className="mb-2 text-sm font-semibold text-danger">
              Terjadi kesalahan sisi-klien
            </div>
            <p className="mb-4 break-words text-xs text-[#e6b0b0]">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="rounded border border-[#5b1f1f] px-3 py-1.5 text-xs text-fg-primary hover:bg-[#5b1f1f]"
            >
              Coba lagi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
