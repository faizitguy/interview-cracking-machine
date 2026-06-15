import { useEffect, useRef, useState } from "react";
import { Play, Send, Loader2, Square, Code2, Trophy, Mic, Volume2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { askStream, eventText, fetchCollection, type ClaudeEvent, type CollectionItem } from "../lib/api";
import { useVoice } from "../lib/useVoice";

const TYPES = ["rag", "evals", "agents", "llm-serving", "fundamentals", "dsa"];
const LEVELS = ["junior", "mid", "senior"];

interface Turn {
  role: "interviewer" | "candidate";
  text: string;
}

type Stage = "setup" | "live" | "scored";

export default function Mock({ rev }: { rev: number }) {
  const [stage, setStage] = useState<Stage>("setup");
  const [type, setType] = useState("rag");
  const [level, setLevel] = useState("mid");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mocks, setMocks] = useState<CollectionItem[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [interim, setInterim] = useState("");
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();
  const voiceOnRef = useRef(false);
  voiceOnRef.current = voiceOn;

  useEffect(() => {
    fetchCollection("mocks").then(setMocks);
  }, [rev]);

  useEffect(() => {
    if (stage !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  const streamInto = async (req: Parameters<typeof askStream>[0]) => {
    setBusy(true);
    setTurns((t) => [...t, { role: "interviewer", text: "" }]);
    try {
      await askStream(req, (ev: ClaudeEvent) => {
        if (ev.type === "system" && (ev as any).session_id) sessionId.current = (ev as any).session_id;
        if (ev.type === "assistant") {
          const { text } = eventText(ev);
          if (text) {
            setTurns((t) => {
              const n = [...t];
              n[n.length - 1] = { role: "interviewer", text: (n[n.length - 1].text + " " + text).trim() };
              return n;
            });
            if (voiceOnRef.current) voice.speak(text); // stream chunks into TTS
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

  // After the interviewer finishes a turn, if voice is on, listen for the reply.
  const listenForReply = () => {
    if (!voiceOnRef.current || !voice.supported) return;
    setInterim("");
    voice.listen(
      (finalText) => {
        setInterim("");
        send(finalText);
      },
      (i) => setInterim(i),
    );
  };

  const start = async () => {
    setStage("live");
    setTurns([]);
    sessionId.current = null;
    startedAt.current = Date.now();
    setElapsed(0);
    await streamInto({ action: "startMock", params: { type, level } });
    listenForReply();
  };

  const send = async (textArg?: string) => {
    const msg = (textArg ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    const composed = code.trim() ? `${msg}\n\nMy current code:\n\`\`\`\n${code}\n\`\`\`` : msg;
    setTurns((t) => [...t, { role: "candidate", text: msg }]);
    await streamInto({ prompt: composed, sessionId: sessionId.current });
    listenForReply();
  };

  const endAndScore = async () => {
    if (busy) return;
    setTurns((t) => [...t, { role: "candidate", text: "(ended the interview)" }]);
    await streamInto({ action: "scoreMock", params: { type, level }, sessionId: sessionId.current });
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
      return { date: String((m.frontmatter as any).date ?? m.file).slice(0, 10), score: avg, type: (m.frontmatter as any).type };
    })
    .filter((d) => d.score > 0);

  if (stage === "setup" || stage === "scored") {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <h2 className="text-2xl font-semibold text-bright mb-1">Mock interview</h2>
        <p className="text-muted text-sm mb-6">
          A phased AI-Engineer interview with a tough but fair examiner. It reads your code, withholds
          constraints, and scores you honestly to <span className="text-violet2">mocks/</span>.
        </p>

        {stage === "scored" && (
          <div className="rounded-xl border border-teal/40 bg-panel p-5 mb-6">
            <div className="flex items-center gap-2 text-teal mb-2">
              <Trophy size={16} /> <span className="font-medium">Scored</span>
            </div>
            <p className="text-soft text-sm whitespace-pre-wrap">{turns[turns.length - 1]?.text}</p>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 mb-8">
          <label className="text-sm">
            <span className="block text-faint text-[11px] uppercase tracking-wide mb-1">Track</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-soft">
              {TYPES.map((t) => (
                <option key={t} className="bg-panel">{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-faint text-[11px] uppercase tracking-wide mb-1">Level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-soft">
              {LEVELS.map((l) => (
                <option key={l} className="bg-panel">{l}</option>
              ))}
            </select>
          </label>
          <button onClick={start} className="flex items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet2">
            <Play size={15} /> {stage === "scored" ? "New mock" : "Start mock"}
          </button>
        </div>

        <h3 className="text-faint text-xs uppercase tracking-wide mb-3">Score trend</h3>
        {trend.length === 0 ? (
          <p className="text-muted text-sm">No scored mocks yet. Finish one to see your trend.</p>
        ) : (
          <div className="rounded-xl border border-edge bg-panel p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2750" />
                <XAxis dataKey="date" tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <YAxis domain={[1, 4]} tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#141329", border: "1px solid #2a2750", borderRadius: 8, color: "#e8e6f5" }} />
                <Line type="monotone" dataKey="score" stroke="#3fcba4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  // Live interview
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-bright font-semibold">{type} · {level}</span>
        <span className="font-mono text-lg text-violet2 tabular-nums">{mm}:{ss}</span>
        {voice.speaking && <Volume2 size={15} className="text-teal animate-pulse" />}
        {voice.supported && (
          <button
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (!next) {
                voice.cancelSpeak();
                voice.stopListen();
              } else listenForReply();
            }}
            className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${voiceOn ? "border-teal text-teal" : "border-edge2 text-soft"}`}
          >
            <Mic size={14} /> {voiceOn ? "Voice on" : "Voice"}
          </button>
        )}
        <button onClick={() => setShowCode((s) => !s)} className={`${voice.supported ? "" : "ml-auto"} flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${showCode ? "border-violet text-violet2" : "border-edge2 text-soft"}`}>
          <Code2 size={14} /> Code
        </button>
        <button onClick={endAndScore} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50">
          <Square size={14} /> End &amp; score
        </button>
      </div>

      <div className={`flex-1 grid gap-4 min-h-0 ${showCode ? "grid-cols-2" : "grid-cols-1"}`}>
        <div ref={scrollRef} className="overflow-y-auto space-y-4 pr-1">
          {turns.map((t, i) => (
            <div key={i} className={t.role === "candidate" ? "text-right" : ""}>
              <div className={`inline-block rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap text-left max-w-[88%] ${t.role === "candidate" ? "bg-violet text-white" : "bg-panel border border-edge text-soft"}`}>
                {t.text || (busy ? <Loader2 size={14} className="animate-spin" /> : "…")}
              </div>
            </div>
          ))}
        </div>
        {showCode && (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// Your scratch code — included with each message so the interviewer can read it"
            className="rounded-xl border border-edge bg-[#0a0917] p-4 font-mono text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none resize-none"
          />
        )}
      </div>

      {(voice.listening || interim) && (
        <p className="mt-3 text-sm text-teal">
          <Mic size={13} className="inline mr-1.5 animate-pulse" />
          {interim || "Listening…"}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {voice.supported && (
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
          placeholder="Your response…"
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
