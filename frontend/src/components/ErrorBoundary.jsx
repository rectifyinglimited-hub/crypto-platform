import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  render() {
    if (this.state.err) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-sm text-[#39FF14]">Section failed to load.</div>
        )
      );
    }
    return this.props.children;
  }
}
