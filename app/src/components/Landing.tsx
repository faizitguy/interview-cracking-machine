import { useEffect, useState } from "react";
import { Mic, FileText, Sparkles, LineChart, Lock, Volume2, ArrowRight, Play } from "lucide-react";
import { useReveal } from "../lib/useReveal";

const ROUND_CHIPS = ["DSA", "System Design", "AI Engineering", "Python", "Backend", "Frontend", "Full-Stack", "Behavioral"];

export default function Landing({ onStart }: { onStart: () => void }) {
  useReveal([]);
  return (
    <div className="relative min-h-full overflow-x-hidden">
      {/* top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-ink/60 border-b border-edge/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
          <Logo />
          <span className="font-display font-semibold text-bright">Interview Cracking Machine</span>
          <nav className="ml-auto flex items-center gap-2">
            <a href="#how" className="hidden sm:block text-sm text-muted hover:text-soft px-3 py-2">How it works</a>
            <button onClick={onStart} className="btn-primary rounded-xl px-4 py-2 text-sm">Start practicing</button>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
        <div className="grid-dots absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_30%_30%,#000,transparent)]" />
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-edge2 bg-panel/60 px-3 py-1 text-xs text-soft reveal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" /> Your always-on AI interviewer
          </span>
          <h1 className="reveal font-display text-5xl sm:text-6xl font-bold leading-[1.04] mt-5 text-bright">
            Crack your next
            <br />
            interview, <span className="text-aurora">out loud.</span>
          </h1>
          <p className="reveal text-muted text-lg leading-relaxed mt-5 max-w-xl">
            Upload your resume, pick a round, and talk through a realistic spoken interview. A sharp AI
            interviewer digs into your actual projects, then scores you honestly and shows you exactly what to fix.
          </p>
          <div className="reveal flex flex-wrap items-center gap-3 mt-8">
            <button onClick={onStart} className="btn-primary rounded-xl px-6 py-3.5 text-base inline-flex items-center gap-2">
              <Play size={17} /> Start practicing
            </button>
            <a href="#how" className="rounded-xl border border-edge2 bg-panel/60 px-5 py-3.5 text-sm text-soft hover:border-violet transition-colors inline-flex items-center gap-2">
              See how it works <ArrowRight size={15} />
            </a>
          </div>
          <div className="reveal flex flex-wrap gap-1.5 mt-8">
            {ROUND_CHIPS.map((c) => (
              <span key={c} className="rounded-full border border-edge bg-panel/50 px-3 py-1 text-xs text-muted">{c}</span>
            ))}
          </div>
        </div>

        {/* live-interview glass card */}
        <div className="reveal relative">
          <div className="absolute -inset-6 -z-10 blur-3xl opacity-60 rounded-full"
               style={{ background: "radial-gradient(closest-side, rgba(255,93,143,.35), transparent)" }} />
          <div className="hairline rounded-3xl p-6 glow-coral">
            <div className="flex items-center gap-3">
              <div className="orb speaking h-12 w-12">
                <span className="orb-ring" />
              </div>
              <div>
                <div className="text-bright font-medium text-sm">Priya · AI Interviewer</div>
                <div className="text-faint text-xs flex items-center gap-1.5"><Volume2 size={12} className="text-coral" /> speaking…</div>
              </div>
              <span className="ml-auto font-mono text-sm text-violet2 tnum">07:42</span>
            </div>
            <div className="mt-5 space-y-3">
              <Bubble who="ai">On the Vericast project you built a real-time agent — what broke first under load, and how did you fix it?</Bubble>
              <Bubble who="me">We were re-rendering the whole tree on every event, so I batched updates and memoized…</Bubble>
              <Bubble who="ai">Good. Now what's the time complexity of that batching step?</Bubble>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-edge bg-panel2/70 px-3 py-2.5">
              <Mic size={15} className="text-teal animate-pulse" />
              <span className="text-faint text-sm">Listening…</span>
              <span className="ml-auto h-6 w-px bg-edge2" />
              <span className="text-faint text-xs">speak naturally</span>
            </div>
          </div>
        </div>
      </section>

      {/* stat strip */}
      <section className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { n: "8", l: "interview rounds" },
          { n: "100%", l: "from your resume" },
          { n: "1–4", l: "honest scoring" },
          { n: "$0", l: "free & local" },
        ].map((s) => (
          <div key={s.l} className="reveal text-center">
            <CountUp value={s.n} className="font-display text-4xl font-bold text-aurora tnum" />
            <div className="text-muted text-sm mt-1">{s.l}</div>
          </div>
        ))}
      </section>

      {/* how it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="reveal font-display text-3xl sm:text-4xl font-bold text-bright text-center">Three steps to interview-ready</h2>
        <p className="reveal text-muted text-center mt-3 max-w-xl mx-auto">No setup, no scheduling. Just you, your resume, and an interviewer that never gets tired of helping you improve.</p>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {[
            { i: <FileText size={20} />, t: "Upload your resume", d: "Drop a PDF or DOCX. The interviewer reads your real skills and projects so every question is about you." },
            { i: <Mic size={20} />, t: "Pick a round & talk", d: "Choose DSA, system design, AI engineering, behavioral and more. It speaks, you answer out loud — like the real thing." },
            { i: <LineChart size={20} />, t: "Get honest feedback", d: "An unflinching 1–4 score, exactly what to improve, the full transcript, and a progress chart across every attempt." },
          ].map((s, i) => (
            <div key={s.t} className="reveal spotlight card-base p-6">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-xl text-amber" style={{ background: "rgba(255,177,61,.1)" }}>{s.i}</span>
                <span className="font-mono text-xs text-faint">0{i + 1}</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-bright mt-4">{s.t}</h3>
              <p className="text-muted text-sm mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* bento features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          <Feature className="md:col-span-2 glow-iris" icon={<Volume2 />} title="Voice-first, genuinely conversational"
            body="A natural neural voice asks one question at a time and listens to your spoken answer. It interrupts, follows up, and adapts difficulty — the closest thing to a real room." />
          <Feature icon={<Sparkles />} title="Anchored to your resume"
            body="It quotes your real projects by name and probes the gaps. Generic question banks can't do that." />
          <Feature icon={<LineChart />} title="Track your climb"
            body="Every interview is saved with feedback and transcript. Watch your score line rise as you practice." />
          <Feature className="md:col-span-2" icon={<Lock />} title="Private, local, and free"
            body="Runs on your machine with your own AI — no API keys, no uploads to a server, no cost. Your resume never leaves your laptop." />
        </div>
      </section>

      {/* final CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="reveal hairline rounded-3xl px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-70" style={{ background: "radial-gradient(40rem 20rem at 50% -20%, rgba(139,124,255,.2), transparent)" }} />
          <h2 className="font-display text-4xl font-bold text-bright">Your next interview won't be a surprise.</h2>
          <p className="text-muted mt-3 max-w-lg mx-auto">Practice the hard questions today, on your own terms, until they feel easy.</p>
          <button onClick={onStart} className="btn-primary rounded-xl px-7 py-4 text-base mt-7 inline-flex items-center gap-2">
            <Play size={18} /> Start practicing
          </button>
        </div>
        <p className="text-center text-faint text-xs mt-10">Interview Cracking Machine · runs locally with your own AI</p>
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

function Bubble({ who, children }: { who: "ai" | "me"; children: React.ReactNode }) {
  const me = who === "me";
  return (
    <div className={me ? "text-right" : ""}>
      <div className={`inline-block rounded-2xl px-3.5 py-2 text-sm text-left max-w-[85%] ${me ? "bg-violet text-white" : "bg-panel2 border border-edge text-soft"}`}>
        {children}
      </div>
    </div>
  );
}

function Feature({ icon, title, body, className = "" }: { icon: React.ReactNode; title: string; body: string; className?: string }) {
  return (
    <div className={`reveal spotlight card-base p-7 ${className}`}>
      <span className="grid place-items-center h-11 w-11 rounded-xl text-coral" style={{ background: "rgba(255,93,143,.1)" }}>{icon}</span>
      <h3 className="font-display text-xl font-semibold text-bright mt-5">{title}</h3>
      <p className="text-muted text-sm mt-2 leading-relaxed max-w-md">{body}</p>
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
  }, [value]);
  if (!m) return <div className={className}>{value}</div>;
  return <div className={className}>{m[1]}{shown}{m[3]}</div>;
}
