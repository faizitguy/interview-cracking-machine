import { useEffect, useRef, useState } from "react";
import { Trophy, History as HistoryIcon, Plus } from "lucide-react";
import { askStream, eventText, fetchRounds, checkHealth, appendFile, today, type ClaudeEvent, type Round } from "./lib/api";
import { useVoice } from "./lib/useVoice";
import SetupBanner from "./components/SetupBanner";
import SetupWizard from "./components/SetupWizard";
import History from "./components/History";
import Landing from "./components/Landing";
import LiveCall from "./components/LiveCall";

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
  const [micMuted, setMicMuted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const [claudeOk, setClaudeOk] = useState(true);
  const [claudeErr, setClaudeErr] = useState<string>();
  const [resumeName, setResumeName] = useState<string>();
  const [hasResume, setHasResume] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState("");

  const voice = useVoice();
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const stageRef = useRef(stage);
  stageRef.current = stage;

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
    if (!voice.sttSupported || micMuted) return;
    await voice.whenDoneSpeaking();
    if (micMuted || stageRef.current !== "live") return; // don't listen after the call ends
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
    setMicMuted(false);
    setResult("");
    setScoring(false);
    setStage("live");
    setTurns([]);
    sessionId.current = null;
    startedAt.current = Date.now();
    setElapsed(0);
    await streamInto({ action: "startMock", params: { round, role, level } });
    listenForReply();
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const send = async (textArg?: string) => {
    const msg = (textArg ?? input).trim();
    if (!msg || busy) return;
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

    // Close the call instantly.
    setStage("scored");

    if (!sid) {
      // Ended before the interview even started — nothing to grade.
      setScoring(false);
      setResult("");
      return;
    }

    setScoring(true);
    setResult("");
    const file = `${today()}-${round}-${Math.random().toString(36).slice(2, 6)}.md`;
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
        {stage === "scored" && (scoring || result) && (
          <div className="max-w-2xl mx-auto px-6 pt-10">
            <div className="hairline rounded-2xl p-6 glow-coral relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <span className={`orb h-9 w-9 ${scoring ? "speaking" : ""}`}><span className="orb-ring" /></span>
                <span className="font-display font-semibold text-bright">
                  {scoring ? "Scoring your interview…" : "Your result is in"}
                </span>
                <Trophy size={16} className="ml-auto text-amber" />
              </div>
              {scoring ? (
                <p className="shimmer text-sm">Reviewing your answers and writing honest feedback…</p>
              ) : (
                <p className="text-soft text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
              )}
              <button
                disabled={scoring}
                onClick={() => {
                  setView("history");
                  setHistoryRev((r) => r + 1);
                }}
                className="mt-4 text-sm text-violet2 hover:text-bright inline-flex items-center gap-1.5 disabled:opacity-40"
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

  // ---- Live interview (video-call layout) ----
  return (
    <LiveCall
      roundLabel={rounds.find((r) => r.id === round)?.label ?? "Interview"}
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
      micMuted={micMuted}
      setMicMuted={setMicMuted}
    />
  );
}
