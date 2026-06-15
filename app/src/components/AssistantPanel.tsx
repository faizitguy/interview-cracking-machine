import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { askStream, eventText, type ClaudeEvent } from "../lib/api";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

export default function AssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    setTurns((t) => [...t, { role: "user", text: prompt }, { role: "assistant", text: "" }]);

    try {
      await askStream(
        { prompt, sessionId: sessionId.current },
        (ev: ClaudeEvent) => {
          if (ev.type === "system" && (ev as any).session_id) {
            sessionId.current = (ev as any).session_id;
          }
          if (ev.type === "assistant") {
            const { text, tools } = eventText(ev);
            const chunk = [text, tools.length ? `↳ ${tools.join(", ")}` : ""].filter(Boolean).join("\n");
            if (chunk) {
              setTurns((t) => {
                const next = [...t];
                next[next.length - 1] = {
                  role: "assistant",
                  text: (next[next.length - 1].text + "\n" + chunk).trim(),
                };
                return next;
              });
            }
          }
        },
      );
    } catch (e) {
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = { role: "assistant", text: `✗ ${(e as Error).message}` };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-panel border-l border-edge z-50 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-edge">
          <div className="text-bright font-semibold">Assistant</div>
          <button onClick={onClose} className="text-muted hover:text-soft">
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {turns.length === 0 && (
            <p className="text-muted text-sm">
              Ask anything — plan your day, explain a concept, edit your files. This runs Claude in
              your repo, so it can read and change your data.
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-right" : ""}>
              <div
                className={`inline-block rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap text-left max-w-[90%] ${
                  t.role === "user" ? "bg-violet text-white" : "bg-panel2 text-soft border border-edge"
                }`}
              >
                {t.text || (busy ? <Loader2 size={14} className="animate-spin" /> : "…")}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-edge flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask the assistant…"
            className="flex-1 rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-lg bg-violet px-3 text-white disabled:opacity-50 hover:bg-violet2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </>
  );
}
