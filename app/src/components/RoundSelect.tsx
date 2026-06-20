import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { roundIcon, LEVELS } from "../lib/roundMeta";
import type { Round } from "../lib/api";

/**
 * Reusable round + seniority picker (the start screen for Learn and Practice).
 * `badge` lets a module decorate each round card — e.g. Learn's progress count.
 */
export default function RoundSelect({
  rounds,
  round,
  setRound,
  level,
  setLevel,
  badge,
}: {
  rounds: Round[];
  round: string;
  setRound: (id: string) => void;
  level: string;
  setLevel: (l: string) => void;
  badge?: (id: string) => ReactNode;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {rounds.map((r) => {
          const Icon = roundIcon(r.id);
          const on = r.id === round;
          const [a, b] = r.label.split(" / ");
          return (
            <button
              key={r.id}
              onClick={() => setRound(r.id)}
              className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                on
                  ? "hairline glow-coral text-bright"
                  : "border-edge bg-panel2/50 text-soft hover:-translate-y-0.5 hover:border-violet"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                  on ? "text-coral" : "text-violet2 group-hover:text-coral"
                }`}
                style={{ background: on ? "rgba(255,93,143,.12)" : "rgba(139,124,255,.1)" }}
              >
                <Icon size={17} />
              </span>
              <span className="text-sm font-medium leading-tight">
                {a}
                {b ? <span className="block text-xs font-normal text-faint">{b}</span> : null}
              </span>
              {badge?.(r.id)}
              {on && (
                <span className="absolute right-2.5 top-2.5 text-coral">
                  <Check size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">Seniority</div>
        <div className="inline-flex rounded-xl border border-edge bg-panel2/60 p-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-lg px-4 py-1.5 text-sm capitalize transition-all ${
                level === l ? "btn-primary" : "text-muted hover:text-soft"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
