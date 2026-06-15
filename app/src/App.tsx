import { useEffect, useRef, useState } from "react";
import { Play, Send, Loader2, Square, Mic, Volume2, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { askStream, eventText, fetchCollection, checkHealth, type ClaudeEvent, type CollectionItem } from "./lib/api";
import { useVoice } from "./lib/useVoice";
import ResumeUpload from "./components/ResumeUpload";
import SetupBanner from "./components/SetupBanner";

const LEVELS = ["junior", "mid", "senior", "staff"];

interface Turn {
  role: "interviewer" | "candidate";
  text: string;
}
type Stage = "setup" | "live" | "scored";

export default function App() {
  const [stage, setStage] = useState<Stage>("setup");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("mid");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const [mocks, setMocks] = useState<CollectionItem[]>([]);
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
    fetchCollection("mocks").then(setMocks);
  }, [stage]);

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
    await streamInto({ action: "startMock", params: { role, level } });
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
    setTurns((t) => [...t, { role: "candidate", text: "(ended the interview)" }]);
    // The result is shown as text only — not spoken aloud.
    await streamInto({ action: "scoreMock", params: { role, level }, sessionId: sessionId.current }, { speak: false });
    setStage("scored");
    fetchCollection("mocks").then(setMocks);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const trend = mocks
    .map((m) => {
      const r = (m.frontmatter as any).rubric ?? {};
      const vals = Object.values(r).map(Number).filter((n) => !isNaN(n));
      const avg = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
      return { date: String((m.frontmatter as any).date ?? m.file).slice(0, 10), score: avg };
    })
    .filter((d) => d.score > 0);

  // ---- Setup / Scored ----
  if (stage === "setup" || stage === "scored") {
    const canStart = (hasResume || !!resumeName) && claudeOk;
    return (
      <div className="min-h-full bg-ink text-soft">
        {!claudeOk && <SetupBanner error={claudeErr} />}
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-violet grid place-items-center text-white font-bold">I</div>
            <h1 className="text-2xl font-semibold text-bright">Interview Cracking Machine</h1>
          </div>
          <p className="text-muted mb-8">
            Upload your resume and take a realistic spoken mock interview. The interviewer mixes questions about
            your actual experience with the top questions for your role, then scores you honestly.
          </p>

          {stage === "scored" && (
            <div className="rounded-xl border border-teal/40 bg-panel p-5 mb-8">
              <div className="flex items-center gap-2 text-teal mb-2">
                <Trophy size={16} /> <span className="font-medium">Your result</span>
              </div>
              <p className="text-soft text-sm whitespace-pre-wrap">{turns[turns.length - 1]?.text}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-faint text-[11px] uppercase tracking-wide mb-2">1 · Your resume</label>
              <ResumeUpload current={resumeName} onUploaded={setResumeName} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-faint text-[11px] uppercase tracking-wide mb-2">2 · Target role</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. AI Engineer (optional)"
                  className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2.5 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-faint text-[11px] uppercase tracking-wide mb-2">Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2.5 text-sm text-soft">
                  {LEVELS.map((l) => (
                    <option key={l} className="bg-panel">{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-faint text-[11px] uppercase tracking-wide mb-2">3 · Interviewer voice</label>
              <div className="flex items-center gap-2">
                <Volume2 size={15} className="text-violet2 shrink-0" />
                <select
                  value={voice.voiceName}
                  onChange={(e) => {
                    voice.setVoice(e.target.value);
                    voice.cancelSpeak();
                  }}
                  className="flex-1 rounded-lg border border-edge bg-panel2 px-3 py-2.5 text-sm text-soft focus:border-violet focus:outline-none"
                >
                  {voice.voices.map((v) => (
                    <option key={v.id} value={v.id} className="bg-panel">
                      {v.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => (voice.speaking ? voice.cancelSpeak() : testVoice())}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm shrink-0 ${
                    voice.speaking ? "border-teal text-teal" : "border-edge2 text-soft hover:border-violet"
                  }`}
                >
                  {voice.speaking ? (
                    <>
                      <Square size={13} /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} /> Test
                    </>
                  )}
                </button>
              </div>
              <p className="text-faint text-xs mt-1.5">
                Realistic neural voice (Kokoro, runs locally). It starts automatically once you begin.
                {!voice.sttSupported && " Your browser can't capture speech, so you'll type answers."}
              </p>
            </div>

            <button
              onClick={start}
              disabled={!canStart}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet px-4 py-3 font-medium text-white hover:bg-violet2 disabled:opacity-50"
            >
              <Play size={16} /> {stage === "scored" ? "Start another interview" : "Start interview"}
            </button>
            {!hasResume && !resumeName && <p className="text-faint text-xs text-center">Upload a resume to begin.</p>}
          </div>

          {trend.length > 0 && (
            <div className="mt-10">
              <h3 className="text-faint text-xs uppercase tracking-wide mb-3">Score trend</h3>
              <div className="rounded-xl border border-edge bg-panel p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2750" />
                    <XAxis dataKey="date" tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                    <YAxis domain={[1, 4]} tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#141329", border: "1px solid #2a2750", borderRadius: 8, color: "#e8e6f5" }} />
                    <Line type="monotone" dataKey="score" stroke="#3fcba4" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Live interview ----
  return (
    <div className="h-full flex flex-col bg-ink text-soft max-w-3xl mx-auto w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-bright font-semibold">{role || "Interview"} · {level}</span>
        <span className="font-mono text-lg text-violet2 tabular-nums">{mm}:{ss}</span>
        {voice.speaking && (
          <span className="flex items-center gap-1.5 text-teal text-sm">
            <Volume2 size={15} className="animate-pulse" /> speaking
          </span>
        )}
        <button onClick={endAndScore} disabled={busy} className="ml-auto flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50">
          <Square size={14} /> End &amp; score
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {turns.map((t, i) => (
          <div key={i} className={t.role === "candidate" ? "text-right" : ""}>
            <div className={`inline-block rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap text-left max-w-[88%] ${t.role === "candidate" ? "bg-violet text-white" : "bg-panel border border-edge text-soft"}`}>
              {t.text || (busy ? <Loader2 size={14} className="animate-spin" /> : "…")}
            </div>
          </div>
        ))}
      </div>

      {(voice.listening || interim) && (
        <p className="mt-3 text-sm text-teal">
          <Mic size={13} className="inline mr-1.5 animate-pulse" />
          {interim || "Listening…"}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {voice.sttSupported && (
          <button
            onClick={() => (voice.listening ? voice.stopListen() : listenForReply())}
            title="Push to talk (interrupts the interviewer)"
            className={`rounded-lg border px-3 ${voice.listening ? "border-teal text-teal" : "border-edge2 text-soft"}`}
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
          className="flex-1 rounded-lg border border-edge bg-panel2 px-3 py-2.5 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none disabled:opacity-60"
        />
        <button onClick={() => send()} disabled={busy || !input.trim()} className="rounded-lg bg-violet px-4 text-white disabled:opacity-50 hover:bg-violet2">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
