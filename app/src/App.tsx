import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Square, Mic, Volume2, Trophy, History as HistoryIcon, Plus } from "lucide-react";
import { askStream, eventText, fetchRounds, checkHealth, appendFile, today, type ClaudeEvent, type Round } from "./lib/api";
import { useVoice } from "./lib/useVoice";
import SetupBanner from "./components/SetupBanner";
import SetupWizard from "./components/SetupWizard";
import History from "./components/History";
import Landing from "./components/Landing";

const navBtn = (active: boolean) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
    active ? "bg-edge text-bright" : "text-muted hover:text-soft hover:bg-panel2"
  }`;

interface Turn {
  role: "interviewer" | "candidate";
  text: string;
}
type Stage = "setup" | "live" | "scored";

export default function App() {
  const [stage, setStage] = useState<Stage>("setup");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("mid");
  const [round, setRound] = useState("general");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [view, setView] = useState<"landing" | "interview" | "history">("landing");
  const [historyRev, setHistoryRev] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const [claudeOk, setClaudeOk] = useState(true);
  const [claudeErr, setClaudeErr] = useState<string>();
  const [resumeName, setResumeName] = useState<string>();
  const [hasResume, setHasResume] = useState(false);

  const voice = useVoice();
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const poll = () =>
      checkHealth().then((h) => {
        setClaudeOk(h.ok);
        setClaudeErr(h.error);
        setHasResume(h.hasResume);
        if (h.resumeName) setResumeName((cur) => cur ?? h.resumeName); // show the stored resume
      });
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchRounds().then((r) => {
      if (r.length) setRounds(r);
    });
  }, []);

  useEffect(() => {
    if (stage !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  const streamInto = async (req: Parameters<typeof askStream>[0], opts?: { speak?: boolean }) => {
    setBusy(true);
    setTurns((t) => [...t, { role: "interviewer", text: "" }]);
    try {
      await askStream(req, (ev: ClaudeEvent) => {
        if (ev.type === "system" && (ev as any).session_id) sessionId.current = (ev as any).session_id;
        if (ev.type === "assistant") {
          const text = eventText(ev);
          if (text) {
            setTurns((t) => {
              const n = [...t];
              n[n.length - 1] = { role: "interviewer", text: (n[n.length - 1].text + " " + text).trim() };
              return n;
            });
            if (opts?.speak !== false) voice.speak(text);
          }
        }
      });
    } catch (e) {
      setTurns((t) => {
        const n = [...t];
        n[n.length - 1] = { role: "interviewer", text: `✗ ${(e as Error).message}` };
        return n;
      });
    } finally {
      setBusy(false);
    }
  };

  // Auto-listen for the reply, but only AFTER the interviewer finishes speaking
  // — otherwise starting the mic barges-in and cuts the interviewer's audio off.
  const listenForReply = async () => {
    if (!voice.sttSupported) return;
    await voice.whenDoneSpeaking();
    setInterim("");
    voice.listen(
      (finalText) => {
        setInterim("");
        send(finalText);
      },
      (i) => setInterim(i),
    );
  };

  // Preview the selected voice on the setup screen (explicit click = gesture).
  const testVoice = () => {
    voice.unlock();
    voice.cancelSpeak();
    voice.speak("Hi, I'm your interviewer today. When you're ready, tell me a little about yourself.");
  };

  const start = async () => {
    voice.unlock(); // must run inside the click gesture so audio can play
    setStage("live");
    setTurns([]);
    sessionId.current = null;
    startedAt.current = Date.now();
    setElapsed(0);
    await streamInto({ action: "startMock", params: { round, role, level } });
    listenForReply();
  };

  const send = async (textArg?: string) => {
    const msg = (textArg ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "candidate", text: msg }]);
    await streamInto({ prompt: msg, sessionId: sessionId.current });
    listenForReply();
  };

  const endAndScore = async () => {
    if (busy) return;
    voice.stopListen();
    voice.cancelSpeak(); // stop any in-progress interviewer speech
    const convo = [...turns]; // the interview exchange, captured before scoring
    const file = `${today()}-${round}-${Math.random().toString(36).slice(2, 6)}.md`;
    setTurns((t) => [...t, { role: "candidate", text: "(ended the interview)" }]);
    // The result is shown as text only — not spoken aloud.
    await streamInto(
      { action: "scoreMock", params: { round, role, level, file }, sessionId: sessionId.current },
      { speak: false },
    );
    // Save the verbatim transcript alongside the rubric so History can show it.
    const transcript = convo
      .filter((t) => t.text.trim())
      .map((t) => `**${t.role === "interviewer" ? "Interviewer" : "You"}:** ${t.text}`)
      .join("\n\n");
    if (transcript) await appendFile(`mocks/${file}`, `\n\n## Transcript\n\n${transcript}\n`);
    setStage("scored");
    setHistoryRev((r) => r + 1);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (view === "landing") return <Landing onStart={() => setView("interview")} />;

  const nav = (
    <header className="shrink-0 flex items-center gap-3 border-b border-edge/70 bg-ink/70 backdrop-blur-md px-5 py-3">
      <button onClick={() => setView("landing")} className="flex items-center gap-2.5 group">
        <span className="orb h-6 w-6"><span className="orb-ring" /></span>
        <span className="font-display text-bright font-semibold text-sm group-hover:text-aurora transition-colors">
          Interview Cracking Machine
        </span>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => setView("interview")} className={navBtn(view === "interview")}>
          <Plus size={14} /> New interview
        </button>
        <button
          onClick={() => {
            setView("history");
            setHistoryRev((r) => r + 1);
          }}
          className={navBtn(view === "history")}
        >
          <HistoryIcon size={14} /> History
        </button>
      </div>
    </header>
  );

  if (view === "history") {
    return (
      <div className="h-full flex flex-col bg-ink text-soft">
        {nav}
        <div className="flex-1 overflow-y-auto">
          <History rev={historyRev} />
        </div>
      </div>
    );
  }

  // ---- Setup / Scored ----
  if (stage === "setup" || stage === "scored") {
    const canStart = (hasResume || !!resumeName) && claudeOk;
    return (
      <div className="h-full flex flex-col bg-ink text-soft">
        {nav}
        <div className="flex-1 overflow-y-auto">
        {!claudeOk && <SetupBanner error={claudeErr} />}
        {stage === "scored" && (
          <div className="max-w-2xl mx-auto px-6 pt-10">
            <div className="hairline rounded-2xl p-6 glow-coral relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <span className="orb h-9 w-9"><span className="orb-ring" /></span>
                <span className="font-display font-semibold text-bright">Your result is in</span>
                <Trophy size={16} className="ml-auto text-amber" />
              </div>
              <p className="text-soft text-sm whitespace-pre-wrap leading-relaxed">{turns[turns.length - 1]?.text}</p>
              <button
                onClick={() => {
                  setView("history");
                  setHistoryRev((r) => r + 1);
                }}
                className="mt-4 text-sm text-violet2 hover:text-bright inline-flex items-center gap-1.5"
              >
                See full feedback &amp; transcript in History <HistoryIcon size={14} />
              </button>
            </div>
          </div>
        )}

        <SetupWizard
          scored={stage === "scored"}
          resumeName={resumeName}
          hasResume={hasResume}
          onResumeUploaded={setResumeName}
          round={round}
          setRound={setRound}
          rounds={rounds}
          level={level}
          setLevel={setLevel}
          role={role}
          setRole={setRole}
          voice={voice}
          onTestVoice={testVoice}
          canStart={canStart}
          onStart={start}
        />
        </div>
      </div>
    );
  }

  // ---- Live interview ----
  return (
    <div className="h-full flex flex-col bg-ink text-soft">
      {nav}
      <div className="flex-1 flex flex-col min-h-0 max-w-3xl mx-auto w-full px-6 py-5">
      <div className="flex items-center gap-3 mb-5">
        <span className={`orb h-10 w-10 shrink-0 ${voice.speaking ? "speaking" : ""} ${voice.listening ? "listening" : ""}`}>
          <span className="orb-ring" />
        </span>
        <div className="leading-tight">
          <div className="font-display font-semibold text-bright">
            {rounds.find((r) => r.id === round)?.label ?? "Interview"}
            <span className="text-faint font-normal font-sans"> · {level}</span>
          </div>
          <div className="text-xs h-4">
            {voice.speaking ? (
              <span className="text-coral flex items-center gap-1"><Volume2 size={12} /> speaking…</span>
            ) : voice.listening ? (
              <span className="text-teal flex items-center gap-1"><Mic size={12} /> listening…</span>
            ) : (
              <span className="text-faint">your turn</span>
            )}
          </div>
        </div>
        <span className="ml-auto font-mono text-lg text-soft tnum">{mm}:{ss}</span>
        <button onClick={endAndScore} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-3.5 py-2 text-sm font-medium text-soft hover:border-coral hover:text-coral transition-colors disabled:opacity-50">
          <Square size={13} /> End &amp; score
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {turns.map((t, i) => (
          <div key={i} className={`reveal in ${t.role === "candidate" ? "text-right" : ""}`}>
            <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap text-left max-w-[85%] leading-relaxed ${t.role === "candidate" ? "bg-violet text-white glow-iris" : "card-base text-soft"}`}>
              {t.text || (busy ? <span className="shimmer">thinking…</span> : "…")}
            </div>
          </div>
        ))}
      </div>

      {(voice.listening || interim) && (
        <p className="mt-3 text-sm text-teal flex items-center gap-1.5">
          <Mic size={13} className="animate-pulse" />
          {interim || "Listening…"}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {voice.sttSupported && (
          <button
            onClick={() => (voice.listening ? voice.stopListen() : listenForReply())}
            title="Push to talk (interrupts the interviewer)"
            className={`rounded-xl border px-3.5 transition-colors ${voice.listening ? "border-teal text-teal bg-teal/5" : "border-edge2 text-soft hover:border-violet"}`}
          >
            <Mic size={16} />
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your answer (or use the mic)…"
          disabled={busy}
          className="flex-1 rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none disabled:opacity-60"
        />
        <button onClick={() => send()} disabled={busy || !input.trim()} className="btn-primary rounded-xl px-5">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      </div>
    </div>
  );
}
