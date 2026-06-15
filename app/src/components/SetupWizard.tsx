import { useState } from "react";
import {
  MessageSquare, Braces, Network, Sparkles, FileCode2, Database, LayoutDashboard, Layers,
  Volume2, Play, ArrowRight, ArrowLeft, Check, FileText, Mic, Square,
} from "lucide-react";
import ResumeUpload from "./ResumeUpload";
import type { Round } from "../lib/api";
import type { useVoice } from "../lib/useVoice";

const ROUND_ICON: Record<string, any> = {
  general: MessageSquare,
  dsa: Braces,
  "system-design": Network,
  "ai-engineering": Sparkles,
  python: FileCode2,
  backend: Database,
  frontend: LayoutDashboard,
  fullstack: Layers,
};

const LEVELS = ["junior", "mid", "senior", "staff"];
const STEPS = [
  { key: "resume", label: "Résumé", icon: FileText },
  { key: "focus", label: "Focus", icon: Sparkles },
  { key: "voice", label: "Voice", icon: Volume2 },
];

interface Props {
  scored: boolean;
  resumeName?: string;
  hasResume: boolean;
  onResumeUploaded: (name: string) => void;
  round: string;
  setRound: (s: string) => void;
  rounds: Round[];
  level: string;
  setLevel: (s: string) => void;
  role: string;
  setRole: (s: string) => void;
  voice: ReturnType<typeof useVoice>;
  onTestVoice: () => void;
  canStart: boolean;
  onStart: () => void;
}

export default function SetupWizard(p: Props) {
  const [step, setStep] = useState(0);
  const resumeReady = p.hasResume || !!p.resumeName;
  const roundLabel = p.rounds.find((r) => r.id === p.round)?.label ?? "Interview";

  const canNext = step === 0 ? resumeReady : true;
  const next = () => setStep((s) => Math.min(2, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-amber font-mono text-xs uppercase tracking-[0.22em] mb-2">
        {p.scored ? "Go again" : "New session"}
      </p>
      <h1 className="font-display text-4xl font-bold text-bright leading-tight">
        Set up your <span className="text-aurora">mock interview</span>
      </h1>
      <p className="text-muted mt-3 mb-8 leading-relaxed">
        Three quick steps. Your interviewer reads your résumé and grills you on the real work you've done.
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-7">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all ${
                  active
                    ? "btn-primary"
                    : done
                      ? "bg-violet/15 text-violet2 hover:bg-violet/25"
                      : "bg-panel2 text-faint"
                }`}
              >
                <span className="grid place-items-center h-5 w-5 rounded-full text-xs font-semibold">
                  {done ? <Check size={13} /> : <Icon size={13} />}
                </span>
                <span className="font-medium">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-edge relative overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber to-coral transition-all duration-500"
                    style={{ width: i < step ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hairline rounded-3xl p-6 sm:p-8 min-h-[300px]">
        <div key={step} className="step-in">
          {step === 0 && (
            <>
              <StepHead n="01" title="Your résumé" sub="PDF, DOCX, or TXT — it stays on your machine." />
              <ResumeUpload current={p.resumeName} onUploaded={p.onResumeUploaded} />
              {resumeReady && (
                <p className="text-teal text-xs mt-3 flex items-center gap-1.5">
                  <Check size={13} /> Ready — every question will be anchored to this résumé.
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <StepHead n="02" title="What should we drill?" sub="Pick the kind of interview you want to practice." />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {p.rounds.map((r) => {
                  const Icon = ROUND_ICON[r.id] ?? MessageSquare;
                  const on = r.id === p.round;
                  const [a, b] = r.label.split(" / ");
                  return (
                    <button
                      key={r.id}
                      onClick={() => p.setRound(r.id)}
                      className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                        on
                          ? "hairline glow-coral text-bright"
                          : "border-edge bg-panel2/50 text-soft hover:border-violet hover:-translate-y-0.5"
                      }`}
                    >
                      <span
                        className={`grid place-items-center h-9 w-9 rounded-xl transition-colors ${
                          on ? "text-coral" : "text-violet2 group-hover:text-coral"
                        }`}
                        style={{ background: on ? "rgba(255,93,143,.12)" : "rgba(139,124,255,.1)" }}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="text-sm font-medium leading-tight">{a}{b ? <span className="block text-faint text-xs font-normal">{b}</span> : null}</span>
                      {on && <span className="absolute top-2.5 right-2.5 text-coral"><Check size={14} /></span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <div className="text-faint text-[11px] uppercase tracking-wide mb-2">Seniority</div>
                <div className="inline-flex rounded-xl border border-edge bg-panel2/60 p-1">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => p.setLevel(l)}
                      className={`rounded-lg px-4 py-1.5 text-sm capitalize transition-all ${
                        p.level === l ? "btn-primary" : "text-muted hover:text-soft"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-faint text-[11px] uppercase tracking-wide mb-2">Target role (optional)</div>
                <input
                  value={p.role}
                  onChange={(e) => p.setRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer at a product company"
                  className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none transition-colors"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepHead n="03" title="Your interviewer's voice" sub="A natural neural voice (Kokoro) — runs locally, totally free." />
              {p.voice.voices.length === 0 ? (
                <p className="text-faint text-sm">Loading voices…</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="orb h-9 w-9 shrink-0"><span className="orb-ring" /></span>
                    <select
                      value={p.voice.voiceName}
                      onChange={(e) => {
                        p.voice.setVoice(e.target.value);
                        p.voice.cancelSpeak();
                      }}
                      className="flex-1 rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-soft focus:border-violet focus:outline-none"
                    >
                      {p.voice.voices.map((v) => (
                        <option key={v.id} value={v.id} className="bg-panel">{v.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => (p.voice.speaking ? p.voice.cancelSpeak() : p.onTestVoice())}
                      className={`flex items-center gap-1.5 rounded-xl border px-4 py-3 text-sm transition-colors ${
                        p.voice.speaking ? "border-teal text-teal bg-teal/5" : "border-edge2 text-soft hover:border-coral hover:text-coral"
                      }`}
                    >
                      {p.voice.speaking ? <><Square size={13} /> Stop</> : <><Volume2 size={14} /> Test</>}
                    </button>
                  </div>
                  <p className="text-faint text-xs mt-3 flex items-center gap-1.5">
                    <Mic size={12} /> The voice starts automatically when the interview begins; you answer out loud.
                    {!p.voice.sttSupported && " (This browser can't capture speech — you'll type answers.)"}
                  </p>
                </>
              )}

              {/* tiny review summary */}
              <div className="mt-7 rounded-2xl border border-edge bg-panel2/40 p-4 text-sm">
                <div className="text-faint text-[11px] uppercase tracking-wide mb-2">Ready to go</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-soft">
                  <span><span className="text-faint">Résumé:</span> {p.resumeName ?? "on file"}</span>
                  <span><span className="text-faint">Round:</span> {roundLabel}</span>
                  <span className="capitalize"><span className="text-faint">Level:</span> {p.level}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={back}
            className="flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-4 py-3 text-sm text-soft hover:border-violet hover:text-bright transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-faint text-xs font-mono">{step + 1} / 3</span>
          {step < 2 ? (
            <button
              onClick={next}
              disabled={!canNext}
              className="btn-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm"
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={p.onStart}
              disabled={!p.canStart}
              className="btn-primary flex items-center gap-2 rounded-xl px-7 py-3 text-base"
            >
              <Play size={17} /> {p.scored ? "Start another" : "Start interview"}
            </button>
          )}
        </div>
      </div>
      {step === 0 && !resumeReady && (
        <p className="text-faint text-xs text-right mt-2">Upload a résumé to continue.</p>
      )}
    </div>
  );
}

function StepHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-xs text-amber">{n}</span>
        <h2 className="font-display text-xl font-semibold text-bright">{title}</h2>
      </div>
      <p className="text-muted text-sm mt-1">{sub}</p>
    </div>
  );
}
