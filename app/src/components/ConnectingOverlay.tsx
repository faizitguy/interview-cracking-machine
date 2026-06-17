import { useEffect, useState } from "react";
import { FileText, ListChecks, Radio, Check, Loader2, AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";

/**
 * Covers the call stage during the ~15–20s it takes the AI interviewer to wake
 * up and say its first words. Instead of staring at an idle screen, the
 * candidate sees a warm "we're setting things up" animation with progressive
 * steps — so the wait reads as deliberate preparation, not a frozen app.
 *
 * Also owns the failure case: if the first connect errors (or comes back
 * empty), it surfaces a friendly retry instead of a silent dead screen.
 */
const STEPS = [
  { icon: FileText, label: "Reading your résumé", at: 0 },
  { icon: ListChecks, label: "Tailoring your questions", at: 4 },
  { icon: Radio, label: "Connecting your interviewer", at: 9 },
];

export default function ConnectingOverlay({
  error,
  onRetry,
  onCancel,
}: {
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (error) return; // freeze the clock once we've failed
    setSecs(0); // fresh run (initial mount or after a retry)
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [error]);

  // The last step that has "started" given elapsed time. The final step never
  // completes on its own — it shimmers until the interviewer actually speaks
  // (which unmounts this overlay).
  const activeIdx = STEPS.reduce((acc, s, i) => (secs >= s.at ? i : acc), 0);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center rounded-2xl bg-ink/70 backdrop-blur-xl">
      <div className="step-in w-[min(90%,30rem)] px-6 text-center">
        {error ? (
          <Failed message={error} onRetry={onRetry} onCancel={onCancel} />
        ) : (
          <>
            {/* living aurora core with pulse rings */}
            <div className="relative mx-auto mb-7 grid h-36 w-36 place-items-center">
              <span className="conn-ring" />
              <span className="conn-ring" style={{ animationDelay: "0.9s" }} />
              <span className="conn-ring" style={{ animationDelay: "1.8s" }} />
              <span className="orb h-20 w-20">
                <span className="orb-ring" />
              </span>
            </div>

            <h2 className="font-display text-xl font-semibold text-aurora">Setting up your interview</h2>
            <p className="mt-1.5 text-sm text-muted">
              Your AI interviewer is getting ready — this takes a few seconds.
            </p>

            <div className="mx-auto mt-7 max-w-xs space-y-2.5 text-left">
              {STEPS.map((s, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${
                      done
                        ? "border-teal/30 bg-teal/5"
                        : active
                          ? "border-coral/40 bg-coral/5"
                          : "border-edge bg-panel/40 opacity-50"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                        done ? "bg-teal/15 text-teal" : active ? "bg-coral/15 text-coral" : "bg-panel2 text-faint"
                      }`}
                    >
                      {done ? <Check size={15} /> : active ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                    </span>
                    <span className={`text-sm ${active ? "shimmer font-medium" : done ? "text-soft" : "text-faint"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* indeterminate progress sweep */}
            <div className="mx-auto mt-6 h-1 w-44 overflow-hidden rounded-full bg-edge/60">
              <div className="bar-indet h-full w-1/3 rounded-full bg-gradient-to-r from-amber via-coral to-violet" />
            </div>

            <p className="mt-4 text-xs text-faint">
              {secs > 22
                ? "Still working — the first connect can take a moment. Hang tight."
                : "You can press End anytime to leave."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Failed({ message, onRetry, onCancel }: { message: string; onRetry: () => void; onCancel: () => void }) {
  return (
    <div className="step-in">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-bad/30 bg-bad/10 text-bad">
        <AlertTriangle size={26} />
      </div>
      <h2 className="font-display text-xl font-semibold text-bright">Couldn't reach your interviewer</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{message.replace(/^✗\s*/, "")}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={onRetry} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm">
          <RotateCw size={15} /> Try again
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-edge bg-panel px-4 py-2.5 text-sm text-soft hover:border-edge2 hover:text-bright"
        >
          <ArrowLeft size={15} /> Back to setup
        </button>
      </div>
    </div>
  );
}
