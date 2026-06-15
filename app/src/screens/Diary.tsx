import { useState } from "react";
import { Loader2, PenLine, Check } from "lucide-react";
import { askStream, eventText, today, type ClaudeEvent } from "../lib/api";

type Status = "idle" | "running" | "done" | "error";

export default function Diary() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [activity, setActivity] = useState<string[]>([]);
  const [result, setResult] = useState("");

  const save = async () => {
    if (!note.trim() || status === "running") return;
    setStatus("running");
    setActivity([]);
    setResult("");
    try {
      const { result } = await askStream(
        { action: "writeDiaryNote", params: { note } },
        (ev: ClaudeEvent) => {
          if (ev.type === "assistant") {
            const { text, tools } = eventText(ev);
            if (tools.length) setActivity((a) => [...a, `Editing ${today()}.md…`]);
            if (text) setActivity((a) => [...a, text]);
          }
        },
      );
      setResult(result ?? "Logged.");
      setStatus("done");
      setNote("");
    } catch (e) {
      setResult((e as Error).message);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h2 className="text-2xl font-semibold text-bright mb-1">Diary</h2>
      <p className="text-muted text-sm mb-6">
        Brain-dump what you did today. Claude turns it into a clean entry in today's log —
        append-only, never overwriting the past.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Spent 2 hours on RAG chunking, finally understood overlap windows. Struggled with eval metrics — flag that."
        rows={6}
        className="w-full rounded-xl border border-edge bg-panel p-4 text-soft text-sm placeholder:text-faint focus:border-violet focus:outline-none resize-y"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
        }}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!note.trim() || status === "running"}
          className="flex items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-violet2 transition-colors"
        >
          {status === "running" ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
          {status === "running" ? "Writing…" : "Save to today's log"}
        </button>
        <span className="text-faint text-xs">⌘↵ to save</span>
      </div>

      {(activity.length > 0 || result) && (
        <div className="mt-6 rounded-xl border border-edge bg-panel2 p-4">
          <div className="text-faint text-[11px] uppercase tracking-wide mb-2">Assistant</div>
          {activity.map((a, i) => (
            <p key={i} className="text-soft text-sm mb-1">
              {a}
            </p>
          ))}
          {result && status === "done" && (
            <p className="flex items-center gap-2 text-teal text-sm mt-2">
              <Check size={15} /> {result}
            </p>
          )}
          {status === "error" && <p className="text-red-300 text-sm mt-2">✗ {result}</p>}
        </div>
      )}
    </div>
  );
}
