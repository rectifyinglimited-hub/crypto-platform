import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    console.error("[equiti] section crash", err, info?.componentStack);
  }

  render() {
    if (this.state.err) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center">
          <p className="text-sm font-semibold text-rose-100">
            This section failed to load.
          </p>
          <p className="mt-1 text-xs text-rose-200/70">
            {this.state.err?.message || "Unexpected error"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ err: null })}
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
