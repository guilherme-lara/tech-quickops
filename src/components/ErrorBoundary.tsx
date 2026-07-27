import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional label to identify the boundary in logs (e.g. route name). */
  scope?: string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Centralized error boundary with rich stack traces.
 * - Prevents full-app crash: isolates errors to the wrapped subtree.
 * - Logs `[ErrorBoundary:<scope>]` with component stack + JS stack for fast triage.
 * - Provides "Copy stack" + "Reset" actions.
 * - In dev, listens to Vite HMR to auto-reset when the offending module updates,
 *   so TS/runtime fixes flow in without a full page reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };
  private hmrDispose: (() => void) | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const scope = this.props.scope ?? "root";
    // Rich structured log — copy/paste-friendly for issue triage.
    console.group(`%c[ErrorBoundary:${scope}] ${error.name}: ${error.message}`, "color:#ef4444;font-weight:bold");
    console.error(error);
    console.error("Component stack:", info.componentStack);
    if (error.stack) console.error("JS stack:", error.stack);
    console.groupEnd();
    this.setState({ info });

    // HMR guard: on next hot update to any module, auto-reset the boundary
    // so a TS/runtime error in one file doesn't require a full page reload.
    if (import.meta.hot && !this.hmrDispose) {
      const handler = () => this.reset();
      import.meta.hot.on("vite:afterUpdate", handler);
      import.meta.hot.on("vite:beforeUpdate", handler);
      this.hmrDispose = () => {
        import.meta.hot?.off("vite:afterUpdate", handler);
        import.meta.hot?.off("vite:beforeUpdate", handler);
      };
    }
  }

  componentWillUnmount() {
    this.hmrDispose?.();
    this.hmrDispose = null;
  }

  reset = () => {
    this.hmrDispose?.();
    this.hmrDispose = null;
    this.setState({ error: null, info: null });
  };

  copyStack = async () => {
    const { error, info } = this.state;
    if (!error) return;
    const payload = [
      `[${this.props.scope ?? "root"}] ${error.name}: ${error.message}`,
      "",
      "JS stack:",
      error.stack ?? "(no stack)",
      "",
      "Component stack:",
      info?.componentStack ?? "(no component stack)",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Stack trace copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Algo quebrou{this.props.scope ? ` em ${this.props.scope}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono">{error.name}</span>: {error.message}
              </p>
            </div>
          </div>

          {(error.stack || info?.componentStack) && (
            <details className="text-xs" open={import.meta.env.DEV}>
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ver stack trace
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
{error.stack}
{info?.componentStack ? `\n\nComponent stack:${info.componentStack}` : ""}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={this.reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button size="sm" variant="outline" onClick={this.copyStack}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar stack
            </Button>
            <Button size="sm" variant="ghost" onClick={() => (window.location.href = "/")}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Install global handlers once. Captures errors that never reach React
 * (async rejections, event handlers) so nothing goes silent.
 */
let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    console.error("[GlobalError]", e.error ?? e.message, e.error?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    console.error("[UnhandledRejection]", r, r?.stack);
  });
}
