import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./page-primitives";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Title of the fallback card. Name the thing that failed, not the app. */
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  /**
   * Remount the subtree when this changes. A boundary that has caught stays
   * caught until something asks it to try again, so pass the value the subtree
   * is keyed on — filters, a route — or a stuck card survives a scope change.
   */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps one failing subtree from taking the page with it.
 *
 * Charts are the reason this exists: recharts drives its layout through an
 * internal store, and a measure/re-render loop there throws React's
 * "Maximum update depth exceeded" (error #185) from inside the chart. Without a
 * boundary that error reaches the router, which replaces the entire authenticated
 * app with its own developer error screen — a whole dashboard lost to one card.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Production stacks are minified, so the component stack is the only clue
    // about which card failed. Keep it on the console rather than swallowing it.
    console.error("[error-boundary]", error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <ErrorState
        className={this.props.className}
        description={
          this.props.description ??
          "ส่วนนี้แสดงผลไม่สำเร็จ ส่วนอื่นของหน้ายังใช้งานได้ตามปกติ"
        }
        onRetry={this.retry}
        title={this.props.title ?? "แสดงผลส่วนนี้ไม่สำเร็จ"}
      />
    );
  }
}
