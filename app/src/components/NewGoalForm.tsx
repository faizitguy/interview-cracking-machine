import { useState } from "react";
import { X } from "lucide-react";
import { createGoal } from "../lib/api";

export default function NewGoalForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [northStar, setNorthStar] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [hours, setHours] = useState("14");
  const [milestones, setMilestones] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const { id } = await createGoal({
        title: title.trim(),
        north_star: northStar.trim(),
        target_date: targetDate,
        hours_per_week: Number(hours) || 0,
        milestones: milestones
          .split("\n")
          .map((m) => m.trim())
          .filter(Boolean),
      });
      onCreated(id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-edge bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-bright font-semibold text-lg">New goal</h3>
          <button onClick={onClose} className="text-muted hover:text-soft">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <Input label="Title" value={title} onChange={setTitle} placeholder="Interview Ready in 90 Days" />
          <Input
            label="North star"
            value={northStar}
            onChange={setNorthStar}
            placeholder="Land an AI Engineer role at a product company"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target date" value={targetDate} onChange={setTargetDate} type="date" />
            <Input label="Hours / week" value={hours} onChange={setHours} type="number" />
          </div>
          <label className="block">
            <span className="text-faint text-[11px] uppercase tracking-wide">Milestones (one per line)</span>
            <textarea
              value={milestones}
              onChange={(e) => setMilestones(e.target.value)}
              rows={4}
              placeholder={"RAG + LLM systems module\nPass 5 mocks >= 80%"}
              className="w-full mt-1 rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none resize-y"
            />
          </label>
        </div>

        {error && <p className="text-red-300 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-soft">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || saving}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-violet2"
          >
            {saving ? "Creating…" : "Create goal"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-faint text-[11px] uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none [color-scheme:dark]"
      />
    </label>
  );
}
