import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import {
  fetchCollection,
  isoWeek,
  scheduleBlock,
  type ScheduleBlock,
  type CollectionItem,
} from "../lib/api";
import { useAiAction } from "../lib/useAiAction";
import { topicStats, adherence } from "../lib/discipline";
import FocusTimer from "../components/FocusTimer";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftWeek(weekId: string, delta: number): string {
  const [y, w] = weekId.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (w - 1 + delta) * 7);
  return isoWeek(monday);
}

export default function Schedule({ rev }: { rev: number }) {
  const [week, setWeek] = useState(isoWeek());
  const [goals, setGoals] = useState<CollectionItem[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const plan = useAiAction();

  useEffect(() => {
    fetchCollection("goals").then(setGoals);
  }, [rev]);

  useEffect(() => {
    fetchCollection("schedule").then((items) => {
      const wk = items.find((s) => (s.frontmatter as any).week === week);
      setBlocks(((wk?.frontmatter as any)?.blocks ?? []) as ScheduleBlock[]);
    });
  }, [week, rev]);

  const stats = useMemo(() => topicStats(blocks), [blocks]);
  const adhere = adherence(blocks);
  const plannedTotal = blocks.reduce((s, b) => s + (Number(b.planned_min) || 0), 0);
  const goalId = (goals[0]?.frontmatter.id as string) ?? "";

  const addBlock = (block: Partial<ScheduleBlock>) =>
    scheduleBlock(week, { op: "add", block });
  const delBlock = (id: string) => scheduleBlock(week, { op: "delete", id });
  const planWeek = () => plan.run({ action: "planWeek", params: { goalId, week } });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setWeek(shiftWeek(week, -1))} className="text-muted hover:text-soft">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-semibold text-bright">{week}</h2>
        <button onClick={() => setWeek(shiftWeek(week, 1))} className="text-muted hover:text-soft">
          <ChevronRight size={20} />
        </button>
        <span className="text-muted text-sm ml-2">
          {(plannedTotal / 60).toFixed(1)}h planned · {adhere}% adherence
        </span>
        <button
          onClick={planWeek}
          disabled={plan.status === "running" || !goalId}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-edge2 bg-panel2 px-3 py-1.5 text-sm text-soft hover:border-violet disabled:opacity-50"
        >
          {plan.status === "running" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} className="text-violet2" />
          )}
          Plan my week
        </button>
      </div>

      {plan.status !== "idle" && (
        <p className={`text-sm mb-4 ${plan.status === "error" ? "text-red-300" : "text-muted"}`}>
          {plan.status === "running" && <Loader2 size={13} className="inline animate-spin mr-1.5" />}
          {plan.line}
        </p>
      )}

      <div className="mb-6">
        <FocusTimer week={week} blocks={blocks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Week grid */}
        <div>
          <div className="grid grid-cols-1 gap-2">
            {DAYS.map((day) => {
              const dayBlocks = blocks.filter((b) => b.day === day);
              return (
                <div key={day} className="rounded-lg border border-edge bg-panel px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-faint text-xs uppercase tracking-wide w-10">{day}</span>
                    <div className="flex-1 ml-3 space-y-1.5">
                      {dayBlocks.length === 0 && <span className="text-faint text-xs">—</span>}
                      {dayBlocks.map((b) => (
                        <div key={b.id} className="flex items-center gap-2 text-sm group">
                          <span className="text-soft">{b.topic}</span>
                          <span className="text-faint text-xs">
                            {b.start}–{b.end} · {b.planned_min}m
                            {b.actual_min > 0 && <span className="text-teal"> (did {b.actual_min}m)</span>}
                          </span>
                          <button
                            onClick={() => delBlock(b.id)}
                            className="ml-auto text-faint opacity-0 group-hover:opacity-100 hover:text-red-300"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <AddBlock onAdd={addBlock} />
        </div>

        {/* Planned vs actual chart */}
        <div className="rounded-xl border border-edge bg-panel p-4">
          <h3 className="text-bright font-medium mb-3">Planned vs actual</h3>
          {stats.length === 0 ? (
            <p className="text-muted text-sm">No blocks yet this week.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2750" />
                <XAxis dataKey="topic" tick={{ fill: "#8f8cb5", fontSize: 10 }} interval={0} angle={-15} height={50} />
                <YAxis tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#141329", border: "1px solid #2a2750", borderRadius: 8, color: "#e8e6f5" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="planned" name="Planned (m)" fill="#7f77dd" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" name="Actual (m)" fill="#3fcba4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function AddBlock({ onAdd }: { onAdd: (b: Partial<ScheduleBlock>) => Promise<unknown> }) {
  const [day, setDay] = useState("Mon");
  const [topic, setTopic] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");

  const submit = async () => {
    if (!topic.trim()) return;
    const planned_min = Math.max(0, minutesBetween(start, end));
    await onAdd({ day, topic: topic.trim(), start, end, planned_min });
    setTopic("");
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-edge p-3">
      <select value={day} onChange={(e) => setDay(e.target.value)} className="rounded-md border border-edge bg-panel2 px-2 py-1.5 text-sm text-soft">
        {DAYS.map((d) => (
          <option key={d} className="bg-panel">{d}</option>
        ))}
      </select>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Topic"
        className="flex-1 min-w-[140px] rounded-md border border-edge bg-panel2 px-2.5 py-1.5 text-sm text-soft placeholder:text-faint focus:border-violet focus:outline-none"
      />
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-edge bg-panel2 px-2 py-1.5 text-sm text-soft [color-scheme:dark]" />
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-edge bg-panel2 px-2 py-1.5 text-sm text-soft [color-scheme:dark]" />
      <button onClick={submit} disabled={!topic.trim()} className="flex items-center gap-1.5 rounded-md bg-violet px-3 py-1.5 text-sm text-white hover:bg-violet2 disabled:opacity-50">
        <Plus size={14} /> Add
      </button>
    </div>
  );
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
