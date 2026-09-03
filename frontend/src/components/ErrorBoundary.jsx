import { Component } from "react";
import { isChunkLoadError, reloadOnceForChunkError } from "../lib/chunkRecovery.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null, reloading: false };
  }

  static getDerivedStateFromError(err) {
    if (isChunkLoadError(err)) {
      return { err, reloading: true };
    }
    return { err, reloading: false };
  }

  componentDidCatch(err, info) {
    if (reloadOnceForChunkError(err)) return;
    console.error("[equiti] section crash", err, info?.componentStack);
  }

  render() {
    if (this.state.reloading) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-sm text-[#00C2B3]">Opening exchange…</p>
        </div>
      );
    }
    if (this.state.err) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center">
          <p className="text-sm font-semibold text-rose-100">
            This section failed to load.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ err: null, reloading: false })}
            className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
