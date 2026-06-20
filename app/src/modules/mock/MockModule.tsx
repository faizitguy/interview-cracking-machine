import { useEffect, useRef, useState, type ReactNode } from "react";
import { askStream, eventText, appendFile, today, type ClaudeEvent, type Round } from "../../lib/api";
import { useVoice } from "../../lib/useVoice";
import SetupBanner from "../../components/SetupBanner";
import SetupWizard from "../../components/SetupWizard";
import ScoredResult from "../../components/ScoredResult";
import History from "../../components/History";
import LiveCall from "../../components/LiveCall";

interface Turn {
  role: "interviewer" | "candidate";
  text: string;
}
type Stage = "setup" | "live" | "scored";

/**
 * Mock Interview module — the full voice-first interview experience
 * (setup → live video call → honest scored rubric), plus the history/trend
 * view. Self-contained: it owns the voice engine and all interview state.
 */
export default function MockModule({
  nav,
  rounds,
  claudeOk,
  claudeErr,
  hasResume,
  resumeName,
  setResumeName,
}: {
  nav: ReactNode;
  rounds: Round[];
  claudeOk: boolean;
  claudeErr?: string;
  hasResume: boolean;
  resumeName?: string;
  setResumeName: (name: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("setup");
  const [mockView, setMockView] = useState<"interview" | "history">("interview");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("mid");
  const [round, setRound] = useState("general");
  const [historyRev, setHistoryRev] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState("");
  const [scoredFile, setScoredFile] = useState("");
  const [scoredAt, setScoredAt] = useState(today());

  const voice = useVoice();
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const idleNudges = useRef(0); // how many times we've checked in on a silent candidate
  const inputRef = useRef("");
  inputRef.current = input;

  // What the interviewer says when the candidate goes quiet — escalating, like a
  // real interviewer: first offer to repeat, then to rephrase, then to move on.
  const IDLE_LINES = [
    "Take a moment if you need it. Would you like me to repeat the question?",
    "Are you still with me? I'm happy to rephrase it if that helps.",
    "No problem — we can come back to this one. Just let me know when you're ready to continue.",
  ];

  useEffect(() => {
    if (stage !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

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

  // The candidate said nothing at all. Instead of listening to silence forever,
  // the interviewer checks in (like a real one would), then keeps listening —
  // with a little more patience each time so it nudges, never nags.
  const handleIdle = async () => {
    if (micMuted || stageRef.current !== "live") return;
    // If they're mid-typing, don't interrupt — just keep the mic open.
    if (inputRef.current.trim()) {
      listenForReply();
      return;
    }
    const line = IDLE_LINES[Math.min(idleNudges.current, IDLE_LINES.length - 1)];
    idleNudges.current += 1;
    setTurns((t) => [...t, { role: "interviewer", text: line }]);
    voice.speak(line);
    await voice.whenDoneSpeaking();
    if (micMuted || stageRef.current !== "live") return;
    listenForReply();
  };

  // Auto-listen for the reply, but only AFTER the interviewer finishes speaking
  // — otherwise starting the mic barges-in and cuts the interviewer's audio off.
  const listenForReply = async () => {
    if (!voice.sttSupported || micMuted) return;
    await voice.whenDoneSpeaking();
    if (micMuted || stageRef.current !== "live") return; // don't listen after the call ends
    setInterim("");
    // Grow the check-in interval after each nudge: ~15s first, then longer, so a
    // thinking candidate isn't pestered but a truly absent one is still noticed.
    const idleMs = 15000 + Math.min(idleNudges.current, 4) * 6000;
    voice.listen(
      (finalText) => {
        setInterim("");
        send(finalText);
      },
      (i) => setInterim(i),
      handleIdle,
      idleMs,
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
    setMicMuted(false);
    setResult("");
    setScoring(false);
    setStage("live");
    setTurns([]);
    sessionId.current = null;
    startedAt.current = Date.now();
    setElapsed(0);
    idleNudges.current = 0;
    await streamInto({ action: "startMock", params: { round, role, level } });
    listenForReply();
  };

  // Bail out of a still-connecting interview back to setup, without scoring an
  // empty conversation. Safe because a failed/empty opening run has finished.
  const cancelToSetup = () => {
    voice.cancelSpeak();
    voice.stopListen();
    sessionId.current = null;
    setBusy(false);
    setTurns([]);
    setStage("setup");
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const send = async (textArg?: string) => {
    const msg = (textArg ?? input).trim();
    if (!msg || busy) return;
    idleNudges.current = 0; // they answered — reset our patience for the next turn
    setInput("");
    setTurns((t) => [...t, { role: "candidate", text: msg }]);
    await streamInto({ prompt: msg, sessionId: sessionId.current });
    listenForReply();
  };

  // End the interview NOW: stop the voice/mic, leave the call immediately, then
  // score in the background. Never blocked by an in-flight turn.
  const endAndScore = async () => {
    voice.cancelSpeak();
    voice.stopListen();
    const convo = turns.filter((t) => t.text.trim());
    const sid = sessionId.current;

    if (!sid) {
      // Ended before the interview even started — nothing to grade, go back.
      setTurns([]);
      setBusy(false);
      setStage("setup");
      return;
    }

    // Close the call instantly and switch to the dedicated result page.
    const file = `${today()}-${round}-${Math.random().toString(36).slice(2, 6)}.md`;
    setScoredFile(file);
    setScoredAt(today());
    setScoring(true);
    setResult("");
    setStage("scored");
    try {
      // The backend runs one AI action at a time; wait for any in-flight turn.
      for (let i = 0; i < 80 && busyRef.current; i++) await sleep(250);
      const { result: scored } = await askStream(
        { action: "scoreMock", params: { round, role, level, file }, sessionId: sid },
        () => {},
      );
      setResult(scored ?? "Interview ended.");
      const transcript = convo
        .map((t) => `**${t.role === "interviewer" ? "Interviewer" : "You"}:** ${t.text}`)
        .join("\n\n");
      if (transcript) await appendFile(`mocks/${file}`, `\n\n## Transcript\n\n${transcript}\n`);
      setHistoryRev((r) => r + 1);
    } catch (e) {
      setResult(`Couldn't score this one (${(e as Error).message}). Your transcript is safe — try another.`);
    } finally {
      setScoring(false);
    }
  };

  const roundLabel = rounds.find((r) => r.id === round)?.label ?? "Interview";

  // ---- Live interview (video-call layout) — fullscreen, no chrome ----
  if (stage === "live") {
    return (
      <LiveCall
        roundLabel={roundLabel}
        level={level}
        elapsed={elapsed}
        turns={turns}
        busy={busy}
        voice={voice}
        interim={interim}
        input={input}
        setInput={setInput}
        send={send}
        listenForReply={listenForReply}
        onEnd={endAndScore}
        onRetry={start}
        onCancel={cancelToSetup}
        micMuted={micMuted}
        setMicMuted={setMicMuted}
      />
    );
  }

  // ---- History ----
  if (mockView === "history") {
    return (
      <div className="flex h-full flex-col bg-ink text-soft">
        {nav}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 pt-6">
            <button
              onClick={() => setMockView("interview")}
              className="rounded-xl border border-edge2 bg-panel px-4 py-2 text-sm text-soft transition-colors hover:border-violet hover:text-bright"
            >
              ← New interview
            </button>
          </div>
          <History rev={historyRev} />
        </div>
      </div>
    );
  }

  // ---- Scored result (dedicated page) ----
  if (stage === "scored") {
    return (
      <div className="flex h-full flex-col bg-ink text-soft">
        {nav}
        <div className="flex-1 overflow-y-auto">
          <ScoredResult
            scoring={scoring}
            result={result}
            file={scoredFile}
            roundLabel={roundLabel}
            level={level}
            date={scoredAt}
            onAnother={() => setStage("setup")}
            onHistory={() => {
              setMockView("history");
              setHistoryRev((r) => r + 1);
            }}
          />
        </div>
      </div>
    );
  }

  // ---- Setup ----
  const canStart = (hasResume || !!resumeName) && claudeOk;
  return (
    <div className="flex h-full flex-col bg-ink text-soft">
      {nav}
      <div className="flex-1 overflow-y-auto">
        {!claudeOk && <SetupBanner error={claudeErr} />}
        <div className="mx-auto max-w-2xl px-6 pt-6 text-right">
          <button
            onClick={() => {
              setMockView("history");
              setHistoryRev((r) => r + 1);
            }}
            className="text-sm text-muted transition-colors hover:text-bright"
          >
            View history &amp; trend →
          </button>
        </div>
        <SetupWizard
          scored={false}
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
