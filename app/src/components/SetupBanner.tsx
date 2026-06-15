import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * First-run / resilience banner (spec section 5b + Phase 7). Shown when the
 * `claude` CLI is unavailable. The app still works as a read-only view of your
 * files; only AI actions are disabled — so this is a dismissible nudge, not a
 * hard gate.
 */
export default function SetupBanner({ error }: { error?: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 border-b border-warn/30 bg-warn/10 px-6 py-3 text-sm">
      <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
      <div className="text-yellow-100/90">
        <strong>AI engine unavailable.</strong> Your data is safe and fully viewable — only AI actions are
        paused. Make sure the <code className="text-yellow-200">claude</code> CLI is installed and logged in
        (<code className="text-yellow-200">claude login</code>) and the local server is running.
        {error && <span className="text-yellow-200/60"> ({error})</span>}
      </div>
      <button onClick={() => setDismissed(true)} className="ml-auto text-yellow-200/70 hover:text-yellow-100">
        <X size={16} />
      </button>
    </div>
  );
}
