import { useEffect, useRef, useState } from "react";
import {
  Trophy, Sparkles, Target, MessageSquareQuote, ScrollText, MessagesSquare, ChevronDown,
} from "lucide-react";
import Markdown from "./Markdown";
import Transcript from "./Transcript";

export const DIMS = ["communication", "depth", "problem_solving", "confidence"] as const;
const DIM_LABEL: Record<string, string> = {
  communication: "Communication",
  depth: "Depth",
  problem_solving: "Problem solving",
  confidence: "Confidence",
};
const DIM_BLURB: Record<string, string> = {
  communication: "Clarity & structure",
  depth: "Technical substance",
  problem_solving: "Reasoning out loud",
  confidence: "Poise under questions",
};

// Aurora-aligned stops: teal (great) → iris → amber → coral (low).
export const scoreHue = (s: number) =>
  s >= 3.5 ? "var(--color-teal)" : s >= 2.5 ? "var(--color-violet2)" : s >= 1.5 ? "var(--color-amber)" : "var(--color-coral)";
export const SCORE_COLOR = (s: number) =>
  s >= 3.5 ? "text-teal" : s >= 2.5 ? "text-violet2" : s >= 1.5 ? "text-amber" : "text-coral";

// A human verdict tier from the average, so the hero leads with a word, not a decimal.
export function tier(avg: number): { label: string; sub: string } {
  if (avg >= 3.5) return { label: "Excellent", sub: "Hire-strong signal" };
  if (avg >= 2.75) return { label: "Strong", sub: "Above the bar" };
  if (avg >= 2) return { label: "Promising", sub: "On the right track" };
  if (avg >= 1.25) return { label: "Developing", sub: "Room to grow" };
  return { label: "Needs work", sub: "Let's run it back" };
}

export interface ResultData {
  verdict: string;
  rubric: Record<string, number>;
  avg: number;
  improve?: string;
  summary?: string;
  evidence?: string;
  transcript?: string;
  /** The interviewer's spoken closing note (scored page only). */
  note?: string;
}

/** Animate a number from 0 → target once `run` flips true. */
function useCountUp(target: number, run: boolean, ms = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!run) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(+(target * eased).toFixed(2));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, ms]);
  return val;
}

/**
 * The premium interview result body — animated score ring + tier verdict, a
 * bento of rubric scores, markdown feedback, and a compact lazy transcript.
 * Shared by the just-scored page and the history detail view so both feel the same.
 */
export default function ResultDetail({
  data,
  roundLabel,
  level,
  date,
}: {
  data: ResultData;
  roundLabel: string;
  level: string;
  date: string;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const hasScore = data.avg > 0;
  const hasRubric = Object.keys(data.rubric).length > 0;
  const feedbackCount = [data.improve, data.summary, data.evidence, data.note].filter(Boolean).length;

  return (
    <>
      {/* Top board: verdict hero + rubric scoreboard side-by-side on wide screens. */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <div className={hasRubric ? "lg:col-span-7" : "lg:col-span-12"}>
          <Hero data={data} hasScore={hasScore} roundLabel={roundLabel} level={level} date={date} />
        </div>
        {hasRubric && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-5">
            {DIMS.map((d, i) => (
              <RubricTile key={d} dim={d} value={data.rubric[d]} delay={i * 120} />
            ))}
          </div>
        )}
      </div>

      {/* Feedback: balanced two-column masonry so prose fills width, not height. */}
      {feedbackCount > 0 && (
        <div className={`mt-4 sm:mt-5 ${feedbackCount > 1 ? "lg:columns-2 lg:gap-5" : ""}`}>
          {data.improve && (
            <ResultSection icon={<Target size={15} />} title="What to improve" accent>
              {data.improve}
            </ResultSection>
          )}
          {data.summary && (
            <ResultSection icon={<Sparkles size={15} />} title="Summary">
              {data.summary}
            </ResultSection>
          )}
          {data.evidence && (
            <ResultSection icon={<ScrollText size={15} />} title="Evidence notes">
              {data.evidence}
            </ResultSection>
          )}
          {data.note && (
            <ResultSection icon={<MessageSquareQuote size={15} />} title="Your interviewer's note">
              {data.note}
            </ResultSection>
          )}
        </div>
      )}

      {data.transcript && (
        <div className="card-base rounded-2xl p-1.5 mt-4 sm:mt-5 overflow-hidden">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center gap-3 rounded-[0.85rem] px-4 py-3 text-left transition-colors hover:bg-panel2/60"
            aria-expanded={showTranscript}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet/12 text-violet2">
              <MessagesSquare size={16} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-bright">Full transcript</span>
              <span className="block text-xs text-faint">Replay the whole conversation, turn by turn</span>
            </span>
            <ChevronDown
              size={18}
              className={`shrink-0 text-muted transition-transform duration-300 ${showTranscript ? "rotate-180" : ""}`}
            />
          </button>
          {showTranscript && (
            <div className="px-2.5 pb-2.5 pt-1">
              <Transcript text={data.transcript} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Hero({
  data,
  hasScore,
  roundLabel,
  level,
  date,
}: {
  data: ResultData;
  hasScore: boolean;
  roundLabel: string;
  level: string;
  date: string;
}) {
  const avg = data.avg;
  const t = tier(avg);
  const shown = useCountUp(avg, hasScore);
  const R = 52;
  const C = 2 * Math.PI * R;
  const hue = scoreHue(avg);

  return (
    <div className="hairline glow-coral relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-coral/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-violet/10 blur-3xl" />

      <div className="relative flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            {roundLabel} <span className="text-faint">· {level} · {date}</span>
          </p>
          {hasScore && (
            <h1 className="mt-1.5 font-display text-3xl sm:text-4xl font-bold leading-tight">
              <span className="text-aurora">{t.label}.</span>
            </h1>
          )}
          <p className="mt-2.5 leading-relaxed text-soft">{data.verdict || "Here's your honest assessment."}</p>
        </div>

        {hasScore ? (
          <div className="relative grid h-36 w-36 shrink-0 place-items-center sm:h-40 sm:w-40">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-edge)" strokeWidth="9" />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={hue}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - shown / 4)}
                style={{ filter: `drop-shadow(0 0 6px ${hue})`, transition: "stroke 0.4s" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`font-display text-4xl font-bold tnum ${SCORE_COLOR(avg)}`}>
                {shown.toFixed(1)}
                <span className="text-faint text-lg font-normal">/4</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-faint">
                <Trophy size={11} className="text-amber" /> {t.sub}
              </span>
            </div>
          </div>
        ) : (
          <span className="orb h-12 w-12 shrink-0"><span className="orb-ring" /></span>
        )}
      </div>
    </div>
  );
}

function RubricTile({ dim, value, delay }: { dim: string; value: number | undefined; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay + 200);
    return () => clearTimeout(t);
  }, [delay]);
  const v = value ?? 0;
  const hue = scoreHue(v);
  return (
    <div className="card-base relative flex flex-col overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-soft">{DIM_LABEL[dim]}</span>
        <span className={`font-display text-xl font-bold tnum ${value != null ? SCORE_COLOR(v) : "text-faint"}`}>
          {value ?? "—"}
          <span className="text-faint text-xs font-normal">/4</span>
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-faint">{DIM_BLURB[dim]}</p>
      <div className="mt-auto flex gap-1 pt-3">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className="h-1.5 flex-1 rounded-full bg-edge transition-all duration-500"
            style={{
              background: show && value != null && n <= Math.round(v) ? hue : undefined,
              boxShadow: show && value != null && n <= Math.round(v) ? `0 0 8px ${hue}66` : undefined,
              transitionDelay: `${n * 70}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ResultSection({
  icon,
  title,
  children,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  children: string;
  accent?: boolean;
}) {
  return (
    <div className={`break-inside-avoid rounded-2xl border p-5 sm:p-6 mb-4 sm:mb-5 ${accent ? "border-violet/40 bg-violet/[0.06]" : "card-base"}`}>
      <h3 className={`text-xs uppercase tracking-wide mb-3 flex items-center gap-2 ${accent ? "text-violet2" : "text-faint"}`}>
        <span className={`grid h-6 w-6 place-items-center rounded-md ${accent ? "bg-violet/15 text-violet2" : "bg-panel2 text-muted"}`}>
          {icon}
        </span>
        {title}
      </h3>
      <Markdown text={children} className="text-sm" />
    </div>
  );
}
