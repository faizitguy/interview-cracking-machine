import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dumbbell, ArrowLeft, RefreshCw, Loader2, Send, ChevronRight, CheckCircle2 } from "lucide-react";
import { askStream, eventText, type ClaudeEvent, type Round } from "../../lib/api";
import RoundSelect from "../../components/RoundSelect";
import Markdown from "../../components/Markdown";

/**
 * Practice module — rapid single-question drills. Pick a round, get one
 * question at a time, answer it (type), and get instant honest feedback before
 * moving to the next. Lower-stakes reps between learning and a full mock.
 */
export default function PracticeModule({
  nav,
  rounds,
}: {
  nav: ReactNode;
  rounds: Round[];
}) {
  const [view, setView] = useState<"picker" | "drill">("picker");
  const [round, setRound] = useState("general");
  const [level, setLevel] = useState("mid");

  const [question, setQuestion] = useState("");
  const [qBusy, setQBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [fbBusy, setFbBusy] = useState(false);
  const [answered, setAnswered] = useState(0); // questions completed this session
  const asked = useRef<string[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const roundLabel = rounds.find((r) => r.id === round)?.label ?? "Round";

  const nextQuestion = async () => {
    setFeedback("");
    setAnswer("");
    setQuestion("");
    setQBusy(true);
    let acc = "";
    try {
      await askStream({ action: "practiceQuestion", params: { round, level, asked: asked.current } }, (ev: ClaudeEvent) => {
        if (ev.type === "assistant") {
          const t = eventText(ev);
          if (t) {
            acc = (acc + " " + t).trim();
            setQuestion(acc);
          }
        }
      });
      if (acc) asked.current = [...asked.current, acc].slice(-20);
    } catch (e) {
      setQuestion(`Couldn't fetch a question (${(e as Error).message}). Try again.`);
    } finally {
      setQBusy(false);
    }
  };

  const startDrill = async () => {
    asked.current = [];
    setAnswered(0);
    setView("drill");
    await nextQuestion();
  };

  const submit = async () => {
    if (!answer.trim() || fbBusy || qBusy) return;
    setFeedback("");
    setFbBusy(true);
    let acc = "";
    try {
      await askStream(
        { action: "practiceFeedback", params: { round, level, question, answer } },
        (ev: ClaudeEvent) => {
          if (ev.type === "assistant") {
            const t = eventText(ev);
            if (t) {
              acc = (acc + " " + t).trim();
              setFeedback(acc);
            }
          }
        },
      );
      setAnswered((n) => n + 1);
    } catch (e) {
      setFeedback(`Couldn't grade that (${(e as Error).message}). Try the next one.`);
    } finally {
      setFbBusy(false);
    }
  };

  useEffect(() => {
    if (view === "drill" && !qBusy && question) taRef.current?.focus();
  }, [view, qBusy, question]);

  // ---- Picker ----
  if (view === "picker") {
    return (
      <Shell nav={nav}>
        <div className="mx-auto max-w-2xl px-6 py-10">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-coral">Level 2 · Practice</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-bright">
            Drill the <span className="text-aurora">reps</span>
          </h1>
          <p className="mb-8 mt-3 leading-relaxed text-muted">
            One question at a time, answer it, get honest instant feedback, repeat. No clock, no score — just fast reps
            to sharpen before the real thing.
          </p>

          <div className="hairline rounded-3xl p-6 sm:p-8">
            <RoundSelect rounds={rounds} round={round} setRound={setRound} level={level} setLevel={setLevel} />
            <button
              onClick={startDrill}
              className="btn-primary mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base"
            >
              <Dumbbell size={18} /> Start {roundLabel} drill
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- Drill ----
  return (
    <Shell nav={nav}>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setView("picker")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-4 py-2 text-sm text-soft transition-colors hover:border-violet hover:text-bright"
          >
            <ArrowLeft size={15} /> Change round
          </button>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel/60 px-3 py-1 text-xs text-muted">
            <CheckCircle2 size={13} className="text-teal" /> {answered} answered
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl text-coral" style={{ background: "rgba(255,93,143,.12)" }}>
            <Dumbbell size={17} />
          </span>
          <div>
            <div className="font-display text-sm font-semibold text-bright">{roundLabel} drill</div>
            <div className="text-xs capitalize text-faint">{level} level</div>
          </div>
        </div>

        {/* Question */}
        <div className="hairline glow-coral rounded-3xl p-6 sm:p-7">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">Question {answered + 1}</div>
          {qBusy && !question ? (
            <div className="flex items-center gap-2.5 text-muted">
              <Loader2 size={16} className="animate-spin text-coral" />
              <span className="shimmer">Picking a question…</span>
            </div>
          ) : (
            <p className="text-lg leading-relaxed text-bright">{question}</p>
          )}
        </div>

        {/* Answer */}
        <div className="mt-5">
          <textarea
            ref={taRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Type your answer… (⌘/Ctrl + Enter to submit)"
            rows={5}
            disabled={qBusy}
            className="w-full resize-y rounded-2xl border border-edge bg-panel2 px-4 py-3.5 text-sm leading-relaxed text-soft placeholder:text-faint transition-colors focus:border-violet focus:outline-none disabled:opacity-50"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={submit}
              disabled={!answer.trim() || fbBusy || qBusy}
              className="btn-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm disabled:opacity-50"
            >
              {fbBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />} Get feedback
            </button>
            <button
              onClick={nextQuestion}
              disabled={qBusy || fbBusy}
              className="flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-5 py-3 text-sm text-soft transition-colors hover:border-coral hover:text-coral disabled:opacity-50"
            >
              {feedback ? <>Next question <ChevronRight size={15} /></> : <><RefreshCw size={14} /> Skip</>}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {(fbBusy || feedback) && (
          <div className="mt-6 rounded-3xl border border-violet/40 bg-violet/5 p-6 sm:p-7 step-in">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wide text-violet2">
              <CheckCircle2 size={14} /> Feedback
            </h3>
            {fbBusy && !feedback ? (
              <div className="flex items-center gap-2.5 text-sm text-muted">
                <Loader2 size={16} className="animate-spin text-coral" />
                <span className="shimmer">Grading your answer…</span>
              </div>
            ) : (
              <Markdown text={feedback} />
            )}
            {feedback && !fbBusy && (
              <button
                onClick={nextQuestion}
                className="btn-primary mt-5 flex items-center gap-2 rounded-xl px-6 py-3 text-sm"
              >
                Next question <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-ink text-soft">
      {nav}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
