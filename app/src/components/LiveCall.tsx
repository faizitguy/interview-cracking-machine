import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquareText, X, Send, Loader2, Volume2, Dot,
} from "lucide-react";
import RobotAvatar from "./RobotAvatar";
import ConnectingOverlay from "./ConnectingOverlay";
import type { useVoice } from "../lib/useVoice";

interface Turn {
  role: "interviewer" | "candidate";
  text: string;
}

interface Props {
  roundLabel: string;
  level: string;
  elapsed: number;
  turns: Turn[];
  busy: boolean;
  voice: ReturnType<typeof useVoice>;
  interim: string;
  input: string;
  setInput: (s: string) => void;
  send: (t?: string) => void;
  listenForReply: () => void;
  onEnd: () => void;
  onRetry: () => void;
  onCancel: () => void;
  micMuted: boolean;
  setMicMuted: (b: boolean) => void;
}

export default function LiveCall(p: Props) {
  const [camOn, setCamOn] = useState(true);
  const [camReady, setCamReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(!p.voice.sttSupported);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Request the webcam once, on entering the call.
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCamReady(true);
      })
      .catch(() => setCamReady(false));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [p.turns, panelOpen]);

  const toggleMute = () => {
    const next = !p.micMuted;
    p.setMicMuted(next);
    if (next) p.voice.stopListen();
    else p.listenForReply();
  };

  const mm = String(Math.floor(p.elapsed / 60)).padStart(2, "0");
  const ss = String(p.elapsed % 60).padStart(2, "0");

  const lastInterviewer = [...p.turns].reverse().find((t) => t.role === "interviewer")?.text ?? "";
  const speaking = p.voice.speaking;
  const listening = p.voice.listening || !!p.interim;
  const caption = speaking ? lastInterviewer : listening ? p.interim || "Listening…" : "";

  // --- Opening "connecting" phase ----------------------------------------
  // The interview has truly started once the candidate replies, or the
  // interviewer says its first real (non-error) words. Until then we cover the
  // stage with a setup animation. Errors (or a silent empty response) flip the
  // overlay into a retry state instead of leaving a dead screen.
  const started =
    p.turns.some((t) => t.role === "candidate") ||
    p.turns.some((t) => t.role === "interviewer" && t.text.trim() && !t.text.startsWith("✗"));
  const errTurn = p.turns.find((t) => t.role === "interviewer" && t.text.startsWith("✗"))?.text;
  const stalled = !started && !p.busy && !errTurn && p.turns.length > 0; // opening run finished with nothing
  const overlayError = !started ? errTurn ?? (stalled ? "✗ The interviewer didn't respond — let's try again." : null) : null;
  const showConnecting = !started && (p.busy || !!overlayError);

  return (
    <div className="h-full flex flex-col bg-ink">
      {/* top bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-edge/60">
        <span className="flex items-center gap-2 rounded-full bg-panel2/70 border border-edge px-3 py-1 text-sm">
          <span className="text-bright font-medium">{p.roundLabel}</span>
          <span className="text-faint capitalize">· {p.level}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-bad/90">
          <Dot className="animate-pulse" size={20} /> <span className="-ml-1.5 font-medium tracking-wide">LIVE</span>
        </span>
        <span className="ml-auto font-mono text-soft tnum">{mm}:{ss}</span>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* stage */}
        <div className="relative flex-1 min-w-0 p-4 sm:p-6">
          <div className="h-full grid gap-4 grid-rows-2 lg:grid-rows-1 lg:grid-cols-2">
            {/* interviewer tile */}
            <Tile name="AI Interviewer" active={speaking} accent="coral" badge={speaking ? <><Volume2 size={12} /> speaking</> : "ready"}>
              <RobotAvatar speaking={speaking} listening={p.voice.listening} getAnalyser={p.voice.getAnalyser} />
            </Tile>

            {/* candidate tile */}
            <Tile name="You" active={listening && !p.micMuted} accent="teal" badge={p.micMuted ? <span className="text-bad flex items-center gap-1"><MicOff size={12} /> muted</span> : listening ? <><Mic size={12} /> speaking</> : "you"}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover rounded-[inherit] ${camReady && camOn ? "" : "hidden"}`}
                style={{ transform: "scaleX(-1)" }}
              />
              {!(camReady && camOn) && (
                <div className="grid place-items-center text-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet to-coral grid place-items-center text-white text-3xl font-display font-bold">
                    Y
                  </div>
                  <p className="text-faint text-xs mt-3">{camReady ? "Camera off" : "Camera unavailable"}</p>
                </div>
              )}
            </Tile>
          </div>

          {showConnecting && (
            <ConnectingOverlay error={overlayError} onRetry={p.onRetry} onCancel={p.onCancel} />
          )}
        </div>

        {/* transcript drawer */}
        {panelOpen && (
          <aside className="w-80 shrink-0 border-l border-edge bg-panel/60 backdrop-blur flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-edge">
              <MessageSquareText size={15} className="text-violet2" />
              <span className="text-bright text-sm font-medium">Transcript</span>
              <button onClick={() => setPanelOpen(false)} className="ml-auto text-muted hover:text-soft"><X size={16} /></button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {p.turns.length === 0 && <p className="text-faint text-sm">The conversation will appear here.</p>}
              {p.turns.map((t, i) => (
                <div key={i} className={t.role === "candidate" ? "text-right" : ""}>
                  <div className={`inline-block rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap text-left max-w-[90%] ${t.role === "candidate" ? "bg-violet text-white" : "card-base text-soft"}`}>
                    {t.text || (p.busy ? <span className="shimmer">thinking…</span> : "…")}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-edge flex gap-2">
              <input
                value={p.input}
                onChange={(e) => p.setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && p.send()}
                placeholder="Type instead…"
                disabled={p.busy}
                className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none"
              />
              <button onClick={() => p.send()} disabled={p.busy || !p.input.trim()} className="btn-primary rounded-xl px-3">
                {p.busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* captions */}
      {caption && (
        <div className="shrink-0 px-4 pb-1">
          <div className="mx-auto w-[min(92%,680px)] rounded-xl bg-panel/80 backdrop-blur border border-edge px-4 py-2.5 text-center">
            <span className={`text-[11px] uppercase tracking-wide mr-2 ${speaking ? "text-coral" : "text-teal"}`}>
              {speaking ? "Interviewer" : "You"}
            </span>
            <span className="text-soft text-sm">{caption}</span>
          </div>
        </div>
      )}

      {/* control bar */}
      <div className="shrink-0 flex items-center justify-center gap-3 py-4">
        <Ctrl on={!p.micMuted} onClick={toggleMute} label={p.micMuted ? "Unmute" : "Mute"} danger={p.micMuted} disabled={!p.voice.sttSupported}>
          {p.micMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </Ctrl>
        <Ctrl on={camOn} onClick={() => setCamOn((v) => !v)} label={camOn ? "Stop video" : "Start video"} danger={!camOn}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </Ctrl>
        <Ctrl on={panelOpen} onClick={() => setPanelOpen((v) => !v)} label="Transcript">
          <MessageSquareText size={20} />
        </Ctrl>
        <button
          onClick={p.onEnd}
          className="flex items-center gap-2 rounded-full bg-bad px-5 py-3.5 text-sm font-semibold text-white hover:brightness-110 transition shadow-[0_12px_30px_-8px_rgba(255,107,107,.6)]"
        >
          <PhoneOff size={18} /> End &amp; score
        </button>
      </div>
    </div>
  );
}

function Tile({
  name, active, accent, badge, children,
}: {
  name: string;
  active: boolean;
  accent: "coral" | "teal";
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  const ring = active ? (accent === "coral" ? "ring-2 ring-coral/70" : "ring-2 ring-teal/70") : "ring-1 ring-edge";
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-2xl bg-panel/70 ${ring} transition-all`}>
      <div className="absolute inset-0 grid-dots opacity-30" />
      <div className="relative z-10 h-full w-full grid place-items-center">{children}</div>
      <div className="absolute left-3 bottom-3 z-20 flex items-center gap-2">
        <span className="rounded-lg bg-ink/70 backdrop-blur px-2.5 py-1 text-xs text-soft">{name}</span>
        <span className={`rounded-lg bg-ink/70 backdrop-blur px-2 py-1 text-[11px] flex items-center gap-1 ${active ? (accent === "coral" ? "text-coral" : "text-teal") : "text-faint"}`}>
          {badge}
        </span>
      </div>
    </div>
  );
}

function Ctrl({
  children, onClick, label, on, danger, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  on?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid place-items-center h-12 w-12 rounded-full border transition-all disabled:opacity-40 ${
        danger
          ? "border-bad/40 bg-bad/15 text-bad hover:bg-bad/25"
          : on
            ? "border-edge2 bg-panel2 text-soft hover:border-violet hover:text-bright"
            : "border-edge bg-panel text-faint hover:text-soft"
      }`}
    >
      {children}
    </button>
  );
}
