import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAiAction } from "../lib/useAiAction";

export default function IngestCourseForm({
  goalId,
  onClose,
}: {
  goalId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const { status, line, run } = useAiAction();

  const submit = async () => {
    if (status === "running") return;
    const result = await run({ action: "ingestCourse", params: { goalId, name, link, syllabus } });
    if (result !== null) setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-edge bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-bright font-semibold text-lg">Ingest a course</h3>
          <button onClick={onClose} className="text-muted hover:text-soft">
            <X size={18} />
          </button>
        </div>
        <p className="text-muted text-sm mb-4">
          Paste a name, link, or syllabus. Claude parses it into roadmap nodes and merges them in.
        </p>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Course name (e.g. DeepLearning.AI — Building RAG)"
            className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none"
          />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link (optional)"
            className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none"
          />
          <textarea
            value={syllabus}
            onChange={(e) => setSyllabus(e.target.value)}
            rows={5}
            placeholder="Paste the syllabus / module list (optional)"
            className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none resize-y"
          />
        </div>

        {status !== "idle" && (
          <p className={`text-sm mt-3 ${status === "error" ? "text-red-300" : "text-muted"}`}>
            {status === "running" && <Loader2 size={13} className="inline animate-spin mr-1.5" />}
            {line}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-soft">
            Close
          </button>
          <button
            onClick={submit}
            disabled={status === "running" || (!name.trim() && !syllabus.trim())}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-violet2"
          >
            {status === "running" ? "Ingesting…" : "Ingest"}
          </button>
        </div>
      </div>
    </div>
  );
}
