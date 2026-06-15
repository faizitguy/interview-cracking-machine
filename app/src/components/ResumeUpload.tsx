import { useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { uploadResume } from "../lib/api";

export default function ResumeUpload({
  current,
  onUploaded,
}: {
  current?: string;
  onUploaded: (filename: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(current ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { filename } = await uploadResume(file);
      setName(filename);
      onUploaded(filename);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files?.[0]);
        }}
        className="cursor-pointer rounded-xl border border-dashed border-edge2 bg-panel hover:border-violet transition-colors p-6 text-center"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0] ?? undefined)}
        />
        {busy ? (
          <div className="flex items-center justify-center gap-2 text-muted">
            <Loader2 size={18} className="animate-spin" /> Reading your resume…
          </div>
        ) : name ? (
          <div className="flex items-center justify-center gap-2 text-teal">
            <CheckCircle2 size={18} /> {name} <span className="text-faint text-sm">— click to replace</span>
          </div>
        ) : (
          <div className="text-muted">
            <Upload size={22} className="mx-auto mb-2 text-violet2" />
            <div className="text-soft font-medium">Drop your resume here, or click to choose</div>
            <div className="text-faint text-xs mt-1 flex items-center justify-center gap-1">
              <FileText size={12} /> PDF, DOCX, or TXT
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-red-300 text-sm mt-2">{error}</p>}
    </div>
  );
}
