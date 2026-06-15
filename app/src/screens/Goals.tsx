import { useEffect, useMemo, useState } from "react";
import { Plus, Map, BookPlus, Loader2, Sparkles } from "lucide-react";
import {
  fetchCollection,
  readFile,
  writeFile,
  patchRoadmapNode,
  type CollectionItem,
  type FileResult,
} from "../lib/api";
import { useAiAction } from "../lib/useAiAction";
import RoadmapNodeCard, { type RoadmapNode } from "../components/RoadmapNodeCard";
import NewGoalForm from "../components/NewGoalForm";
import IngestCourseForm from "../components/IngestCourseForm";

interface Milestone {
  lineIndex: number;
  checked: boolean;
  text: string;
}

const MS_RE = /^(\s*[-*]\s*\[)([ xX])(\].*)$/;

function parseMilestones(raw: string): Milestone[] {
  const out: Milestone[] = [];
  raw.split("\n").forEach((line, lineIndex) => {
    const m = line.match(MS_RE);
    if (m) out.push({ lineIndex, checked: m[2].toLowerCase() === "x", text: m[3].replace(/^\]\s?/, "") });
  });
  return out;
}

export default function Goals({ rev }: { rev: number }) {
  const [goals, setGoals] = useState<CollectionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goalFile, setGoalFile] = useState<FileResult | null>(null);
  const [roadmap, setRoadmap] = useState<FileResult | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showIngest, setShowIngest] = useState(false);
  const roadmapAction = useAiAction();

  // Load the goal list.
  useEffect(() => {
    fetchCollection("goals").then((items) => {
      setGoals(items);
      setSelectedId((cur) => cur ?? (items[0]?.frontmatter.id as string) ?? null);
    });
  }, [rev]);

  const selected = useMemo(
    () => goals.find((g) => g.frontmatter.id === selectedId),
    [goals, selectedId],
  );

  // Load the selected goal's raw file + its roadmap.
  useEffect(() => {
    if (!selected) {
      setGoalFile(null);
      setRoadmap(null);
      return;
    }
    readFile(selected.file).then(setGoalFile);
    readFile(`roadmaps/${selectedId}.md`).then(setRoadmap);
  }, [selected, selectedId, rev]);

  const milestones = goalFile ? parseMilestones(goalFile.raw) : [];
  const nodes: RoadmapNode[] = (roadmap?.frontmatter.nodes as RoadmapNode[]) ?? [];

  const toggleMilestone = async (m: Milestone) => {
    if (!goalFile) return;
    const lines = goalFile.raw.split("\n");
    lines[m.lineIndex] = lines[m.lineIndex].replace(MS_RE, (_s, a, c, d) => `${a}${c.toLowerCase() === "x" ? " " : "x"}${d}`);
    const next = lines.join("\n");
    setGoalFile({ ...goalFile, raw: next }); // optimistic
    await writeFile(goalFile.path, next);
  };

  const patchNode = async (index: number, patch: Partial<RoadmapNode>) => {
    if (!roadmap) return;
    await patchRoadmapNode(roadmap.path, index, patch as Record<string, unknown>);
  };

  const suggestRoadmap = () => roadmapAction.run({ action: "suggestRoadmap", params: { goalId: selectedId } });

  const fm = (selected?.frontmatter ?? {}) as Record<string, any>;

  return (
    <div className="flex h-full">
      {/* Goal list */}
      <div className="w-64 shrink-0 border-r border-edge p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-faint text-xs uppercase tracking-wide">Goals</span>
          <button onClick={() => setShowNew(true)} className="text-muted hover:text-violet2" title="New goal">
            <Plus size={16} />
          </button>
        </div>
        <ul className="space-y-1">
          {goals.length === 0 && <li className="text-muted text-sm">No goals yet.</li>}
          {goals.map((g) => {
            const id = g.frontmatter.id as string;
            return (
              <li key={g.file}>
                <button
                  onClick={() => setSelectedId(id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                    id === selectedId ? "bg-edge text-bright" : "text-muted hover:bg-panel2 hover:text-soft"
                  }`}
                >
                  {(g.frontmatter.title as string) ?? id}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? (
          <div className="h-full grid place-items-center text-center">
            <div>
              <p className="text-muted mb-3">No goal selected.</p>
              <button
                onClick={() => setShowNew(true)}
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet2"
              >
                Create your first goal
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl">
            <p className="text-faint text-sm">North star</p>
            <h2 className="text-2xl font-semibold text-bright mt-1">{fm.north_star || fm.title}</h2>
            <div className="flex gap-4 text-sm text-muted mt-2">
              {fm.target_date && <span>🎯 {String(fm.target_date).slice(0, 10)}</span>}
              {fm.hours_per_week != null && <span>⏱ {fm.hours_per_week}h / week</span>}
              {fm.status && <span className="text-teal">{fm.status}</span>}
            </div>

            {/* Milestones */}
            <section className="mt-6 rounded-xl border border-edge bg-panel p-5">
              <h3 className="text-bright font-medium mb-3">Milestones</h3>
              <ul className="space-y-2">
                {milestones.length === 0 && <li className="text-muted text-sm">No milestones.</li>}
                {milestones.map((m) => (
                  <li key={m.lineIndex}>
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={m.checked}
                        onChange={() => toggleMilestone(m)}
                        className="mt-1 accent-violet"
                      />
                      <span className={`text-sm ${m.checked ? "text-faint line-through" : "text-soft"}`}>
                        {m.text || <span className="text-faint italic">empty</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            {/* Roadmap */}
            <section className="mt-6">
              <div className="flex items-center gap-3 mb-3">
                <Map size={16} className="text-violet2" />
                <h3 className="text-bright font-medium">Roadmap</h3>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={suggestRoadmap}
                    disabled={roadmapAction.status === "running"}
                    className="flex items-center gap-1.5 rounded-lg border border-edge2 bg-panel2 px-3 py-1.5 text-sm text-soft hover:border-violet disabled:opacity-50"
                  >
                    {roadmapAction.status === "running" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} className="text-violet2" />
                    )}
                    {nodes.length ? "Regenerate" : "Suggest a roadmap"}
                  </button>
                  <button
                    onClick={() => setShowIngest(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-edge2 bg-panel2 px-3 py-1.5 text-sm text-soft hover:border-violet"
                  >
                    <BookPlus size={14} /> Ingest a course
                  </button>
                </div>
              </div>

              {roadmapAction.status !== "idle" && !nodes.length && (
                <p className="text-muted text-sm mb-3">
                  {roadmapAction.status === "running" && (
                    <Loader2 size={13} className="inline animate-spin mr-1.5" />
                  )}
                  {roadmapAction.line}
                </p>
              )}

              {nodes.length === 0 ? (
                <p className="text-muted text-sm rounded-xl border border-dashed border-edge p-6 text-center">
                  No roadmap yet. Click <span className="text-violet2">Suggest a roadmap</span> and Claude
                  will draft editable steps.
                </p>
              ) : (
                <div className="space-y-3">
                  {nodes.map((n, i) => (
                    <RoadmapNodeCard key={i} node={n} index={i} onPatch={patchNode} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {showNew && (
        <NewGoalForm
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setSelectedId(id);
            setShowNew(false);
          }}
        />
      )}
      {showIngest && selectedId && (
        <IngestCourseForm goalId={selectedId} onClose={() => setShowIngest(false)} />
      )}
    </div>
  );
}
