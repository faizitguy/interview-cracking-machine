import { useEffect, useState } from "react";

export interface RoadmapNode {
  title: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  objective?: string;
  checkpoint?: string;
  est_hours?: number;
  depends_on?: string[];
}

const STATUSES: RoadmapNode["status"][] = ["pending", "in-progress", "done", "skipped"];

const STATUS_STYLE: Record<RoadmapNode["status"], string> = {
  pending: "text-faint border-edge",
  "in-progress": "text-violet2 border-violet",
  done: "text-teal border-teal",
  skipped: "text-muted border-edge line-through",
};

export default function RoadmapNodeCard({
  node,
  index,
  onPatch,
}: {
  node: RoadmapNode;
  index: number;
  onPatch: (index: number, patch: Partial<RoadmapNode>) => void;
}) {
  const [objective, setObjective] = useState(node.objective ?? "");
  const [checkpoint, setCheckpoint] = useState(node.checkpoint ?? "");

  // Re-sync when the node prop changes (e.g. switching goals or after a reload).
  // Saves happen on blur, so the field isn't being typed when props change.
  useEffect(() => setObjective(node.objective ?? ""), [node.objective]);
  useEffect(() => setCheckpoint(node.checkpoint ?? ""), [node.checkpoint]);

  const commit = (field: "objective" | "checkpoint", value: string) => {
    if (value !== (node[field] ?? "")) onPatch(index, { [field]: value });
  };

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="flex items-start gap-3">
        <span className="text-faint text-xs mt-1 w-5 shrink-0">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="text-bright font-medium">{node.title}</h4>
            <select
              value={node.status}
              onChange={(e) => onPatch(index, { status: e.target.value as RoadmapNode["status"] })}
              className={`text-xs rounded-md bg-panel2 border px-2 py-1 ${STATUS_STYLE[node.status]}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="text-soft bg-panel">
                  {s}
                </option>
              ))}
            </select>
            {node.est_hours != null && (
              <span className="text-faint text-xs ml-auto">{node.est_hours}h</span>
            )}
          </div>

          <Field label="Objective" value={objective} onChange={setObjective} onBlur={() => commit("objective", objective)} />
          <Field label="Checkpoint" value={checkpoint} onChange={setCheckpoint} onBlur={() => commit("checkpoint", checkpoint)} />

          {Array.isArray(node.depends_on) && node.depends_on.length > 0 && (
            <p className="text-faint text-xs mt-2">depends on: {node.depends_on.join(", ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="block mt-2">
      <span className="text-faint text-[11px] uppercase tracking-wide">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={2}
        className="w-full mt-0.5 rounded-md border border-edge bg-panel2 px-2.5 py-1.5 text-sm text-soft focus:border-violet focus:outline-none resize-y"
      />
    </label>
  );
}
