import { useEffect, useState } from "react";
import {
  Mic, LineChart, Lock, Volume2, ArrowRight, GraduationCap, Dumbbell, Check, Sparkles,
} from "lucide-react";
import { useReveal } from "../lib/useReveal";
import type { Mode } from "./TopNav";

const ROUND_CHIPS = ["DSA", "System Design", "AI Engineering", "Python", "Backend", "Frontend", "Full-Stack", "Behavioral"];

/** The three levels of the journey — the heart of the landing page. */
const PATHS: {
  mode: Mode;
  n: string;
  title: string;
  tag: string;
  body: string;
  bullets: string[];
  icon: React.ReactNode;
  accent: string; // text color class
  bg: string; // icon bg
  glow: string;
  cta: string;
}[] = [
  {
    mode: "learn",
    n: "01",
    title: "Learn",
    tag: "Build the foundation",
    body: "Structured study tracks per round, ordered foundational → advanced and aimed at the gaps in your résumé.",
    bullets: ["6–8 lessons per track", "Anchored to your gaps", "Progress that's remembered"],
    icon: <GraduationCap size={22} />,
    accent: "text-amber",
    bg: "rgba(255,177,61,.12)",
    glow: "glow-amber",
    cta: "Start learning",
  },
  {
    mode: "practice",
    n: "02",
    title: "Practice",
    tag: "Drill the reps",
    body: "One question at a time. Answer it, get honest instant feedback, and move on. Fast, low-stakes reps.",
    bullets: ["Single-question drills", "Instant coaching", "No clock, no pressure"],
    icon: <Dumbbell size={22} />,
    accent: "text-coral",
    bg: "rgba(255,93,143,.12)",
    glow: "glow-coral",
    cta: "Start drilling",
  },
  {
    mode: "mock",
    n: "03",
    title: "Mock Interview",
    tag: "Prove it live",
    body: "A realistic spoken interview anchored to your real projects — then an honest 1–4 score and exactly what to fix.",
    bullets: ["Voice-first, conversational", "Honest scored rubric", "Tracked over time"],
    icon: <Mic size={22} />,
    accent: "text-violet2",
    bg: "rgba(139,124,255,.12)",
    glow: "glow-iris",
    cta: "Start interview",
  },
];

export default function Landing({ onPick }: { onPick: (m: Mode) => void }) {
  useReveal([]);
  return (
    <div className="relative min-h-full overflow-x-hidden">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-edge/60 bg-ink/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
          <Logo />
          <span className="font-display font-semibold text-bright">Interview Cracking Machine</span>
          <nav className="ml-auto flex items-center gap-2">
            <a href="#path" className="hidden px-3 py-2 text-sm text-muted hover:text-soft sm:block">How it works</a>
            <button onClick={() => onPick("mock")} className="btn-primary rounded-xl px-4 py-2 text-sm">Start now</button>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-12 pt-20 text-center">
        <div className="grid-dots absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_20%,#000,transparent)]" />
        <span className="reveal inline-flex items-center gap-2 rounded-full border border-edge2 bg-panel/60 px-3 py-1 text-xs text-soft">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" /> Your always-on AI interview coach
        </span>
        <h1 className="reveal mx-auto mt-5 max-w-3xl font-display text-5xl font-bold leading-[1.04] text-bright sm:text-6xl">
          Learn it. Practice it. <span className="text-aurora">Crack it.</span>
        </h1>
        <p className="reveal mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          A complete path from "I don't know this" to "I nailed the interview." Study the fundamentals, drill real
          questions, then face a realistic spoken mock that scores you honestly — all anchored to your résumé.
        </p>
        <div className="reveal mt-7 flex flex-wrap justify-center gap-1.5">
          {ROUND_CHIPS.map((c) => (
            <span key={c} className="rounded-full border border-edge bg-panel/50 px-3 py-1 text-xs text-muted">{c}</span>
          ))}
        </div>
      </section>

      {/* the three-level path — the centerpiece */}
      <section id="path" className="mx-auto max-w-6xl px-6 pb-8 pt-6">
        <p className="reveal mb-2 text-center font-mono text-xs uppercase tracking-[0.22em] text-amber">Choose your level</p>
        <h2 className="reveal text-center font-display text-3xl font-bold text-bright">Three steps to interview-ready</h2>
        <p className="reveal mx-auto mt-3 max-w-xl text-center text-muted">
          Start anywhere — but the path runs left to right. Pick where you are today.
        </p>

        <div className="relative mt-12 grid gap-5 md:grid-cols-3">
          {/* connecting journey line */}
          <div
            className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px md:block"
            style={{ background: "linear-gradient(90deg, var(--color-amber), var(--color-coral) 50%, var(--color-violet2))" }}
          />
          {PATHS.map((p) => (
            <button
              key={p.mode}
              onClick={() => onPick(p.mode)}
              className={`reveal spotlight card-base group relative z-10 flex flex-col p-6 text-left transition-all duration-300 hover:-translate-y-1.5 ${p.glow}`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: p.bg }}>
                  <span className={p.accent}>{p.icon}</span>
                </span>
                <span className="font-mono text-2xl font-bold text-edge2 transition-colors group-hover:text-faint">{p.n}</span>
              </div>
              <div className={`mt-5 text-[11px] uppercase tracking-wide ${p.accent}`}>{p.tag}</div>
              <h3 className="mt-1 font-display text-2xl font-bold text-bright">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              <ul className="mt-5 space-y-2">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-soft">
                    <Check size={14} className={p.accent} /> {b}
                  </li>
                ))}
              </ul>
              <span className={`mt-6 inline-flex items-center gap-1.5 text-sm font-medium ${p.accent}`}>
                {p.cta}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* stat strip */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-12 sm:grid-cols-4">
        {[
          { n: "8", l: "interview rounds" },
          { n: "100%", l: "from your résumé" },
          { n: "1–4", l: "honest scoring" },
          { n: "$0", l: "free & local" },
        ].map((s) => (
          <div key={s.l} className="reveal text-center">
            <CountUp value={s.n} className="font-display text-4xl font-bold text-aurora tnum" />
            <div className="mt-1 text-sm text-muted">{s.l}</div>
          </div>
        ))}
      </section>

      {/* why it works */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <Feature className="glow-iris md:col-span-2" icon={<Volume2 />} title="Voice-first, genuinely conversational"
            body="In the mock, a natural neural voice asks one question at a time and listens to your spoken answer. It follows up and adapts difficulty — the closest thing to a real room." />
          <Feature icon={<Sparkles />} title="Anchored to your résumé"
            body="Lessons, drills, and the mock all quote your real projects and probe your real gaps. Generic question banks can't do that." />
          <Feature icon={<LineChart />} title="Track your climb"
            body="Lesson progress is saved, and every mock is stored with feedback. Watch your score line rise as you practice." />
          <Feature className="md:col-span-2" icon={<Lock />} title="Private, local, and free"
            body="Runs on your machine with your own AI — no API keys, no uploads to a server, no cost. Your résumé never leaves your laptop." />
        </div>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="reveal hairline relative overflow-hidden rounded-3xl px-8 py-14 text-center">
          <div className="absolute inset-0 -z-10 opacity-70" style={{ background: "radial-gradient(40rem 20rem at 50% -20%, rgba(139,124,255,.2), transparent)" }} />
          <h2 className="font-display text-4xl font-bold text-bright">Your next interview won't be a surprise.</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">Learn the gaps, drill the reps, and walk in ready. Start wherever you are.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => onPick("learn")} className="rounded-xl border border-edge2 bg-panel/60 px-5 py-3.5 text-sm text-soft transition-colors hover:border-amber inline-flex items-center gap-2">
              <GraduationCap size={17} /> Learn first
            </button>
            <button onClick={() => onPick("mock")} className="btn-primary inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base">
              <Mic size={18} /> Jump to a mock
            </button>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-faint">Interview Cracking Machine · runs locally with your own AI</p>
      </section>
    </div>
  );
}

function Logo() {
  return (
    <div className="orb h-7 w-7 shrink-0">
      <span className="orb-ring" />
    </div>
  );
}

function Feature({ icon, title, body, className = "" }: { icon: React.ReactNode; title: string; body: string; className?: string }) {
  return (
    <div className={`reveal spotlight card-base p-7 ${className}`}>
      <span className="grid h-11 w-11 place-items-center rounded-xl text-coral" style={{ background: "rgba(255,93,143,.1)" }}>{icon}</span>
      <h3 className="mt-5 font-display text-xl font-semibold text-bright">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function CountUp({ value, className }: { value: string; className?: string }) {
  const m = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(m ? "0" : value);
  useEffect(() => {
    if (!m) return;
    const target = parseFloat(m[2]);
    const dur = 900;
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(String(Math.round(target * eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  if (!m) return <div className={className}>{value}</div>;
  return <div className={className}>{m[1]}{shown}{m[3]}</div>;
}
