import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GraduationCap, Dumbbell, Mic } from "lucide-react";

export type Mode = "learn" | "practice" | "mock";

const ITEMS = [
  { key: "learn", label: "Learn", Icon: GraduationCap },
  { key: "practice", label: "Practice", Icon: Dumbbell },
  { key: "mock", label: "Mock", Icon: Mic },
] as const;

/**
 * Premium top navigation — sticky glass bar with a brand lockup, a segmented
 * switcher for the three modes (Learn → Practice → Mock) whose active "pill"
 * slides on the aurora gradient, and a live claude/résumé status chip.
 */
export default function TopNav({
  mode,
  onNavigate,
  onBrand,
  claudeOk,
  ready,
}: {
  mode: Mode;
  onNavigate: (m: Mode) => void;
  onBrand: () => void;
  claudeOk: boolean;
  ready: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({ left: 0, width: 0, visible: false });

  const measure = useCallback(() => {
    const el = btnRefs.current[mode];
    const wrap = wrapRef.current;
    if (!el || !wrap) {
      setInd((s) => ({ ...s, visible: false }));
      return;
    }
    const w = wrap.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setInd({ left: b.left - w.left, width: b.width, visible: true });
  }, [mode]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-edge/55 bg-ink/55 backdrop-blur-xl">
      {/* warm hairline that catches the eye along the bottom edge */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,93,143,.35) 30%, rgba(139,124,255,.35) 70%, transparent)" }}
      />
      <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-4 px-5">
        {/* Brand */}
        <button onClick={onBrand} className="group flex shrink-0 items-center gap-2.5">
          <span className="orb h-7 w-7"><span className="orb-ring" /></span>
          <span className="text-left leading-none">
            <span className="block font-display text-sm font-semibold tracking-tight text-bright transition-colors group-hover:text-aurora">
              Interview Cracking Machine
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.22em] text-faint">
              Learn · Practice · Mock
            </span>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-3">
          {/* Status chip */}
          <span className="hidden items-center gap-1.5 rounded-full border border-edge/70 bg-panel/50 px-2.5 py-1 text-[11px] font-medium text-muted sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${claudeOk ? "bg-teal" : "bg-bad"}`}
              style={{ boxShadow: claudeOk ? "0 0 8px rgba(70,224,168,.75)" : "0 0 8px rgba(255,107,107,.75)" }}
            />
            {claudeOk ? (ready ? "Ready" : "Résumé optional") : "AI offline"}
          </span>

          {/* Segmented nav with sliding aurora indicator */}
          <nav
            ref={wrapRef}
            className="relative flex items-center gap-1 rounded-full border border-edge/80 bg-panel/55 p-1 backdrop-blur"
          >
            {ind.visible && (
              <span
                aria-hidden
                className="absolute bottom-1 top-1 rounded-full border border-coral/25"
                style={{
                  left: ind.left,
                  width: ind.width,
                  background:
                    "linear-gradient(120deg, rgba(255,177,61,.22), rgba(255,93,143,.20) 55%, rgba(139,124,255,.22))",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.10), 0 6px 18px -10px rgba(255,93,143,.6)",
                  transition: "left .34s cubic-bezier(.22,1,.36,1), width .34s cubic-bezier(.22,1,.36,1)",
                }}
              />
            )}
            {ITEMS.map(({ key, label, Icon }) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    btnRefs.current[key] = el;
                  }}
                  onClick={() => onNavigate(key)}
                  className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "text-bright" : "text-muted hover:text-soft"
                  }`}
                >
                  <Icon size={14} className={active ? "text-amber" : ""} /> {label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
