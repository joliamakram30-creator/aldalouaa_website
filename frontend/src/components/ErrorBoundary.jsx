import { Component } from "react";

// If a page crashes, show a friendly message instead of a blank screen.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Page crashed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="store-state" style={{ minHeight: "100vh" }}>
        <h2>Something went wrong · حصلت مشكلة</h2>
        <p>Please refresh the page. · من فضلك حدّثي الصفحة.</p>
        <button className="btn btn-primary" onClick={() => window.location.assign("/")}>
          AL DALOUAA
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
