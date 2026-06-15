import { useEffect, useState } from "react";
import { Flame, Target, Clock, Gauge } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { fetchCollection, fetchLogs, today, type CollectionItem, type LogEntry, type ScheduleBlock } from "../lib/api";
import { smartStreak, adherence } from "../lib/discipline";

export default function Stats({ rev }: { rev: number }) {
  const [schedules, setSchedules] = useState<CollectionItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [roadmaps, setRoadmaps] = useState<CollectionItem[]>([]);
  const [reviews, setReviews] = useState<CollectionItem[]>([]);

  useEffect(() => {
    fetchCollection("schedule").then(setSchedules);
    fetchLogs().then(setLogs);
    fetchCollection("roadmaps").then(setRoadmaps);
    fetchCollection("data/reviews").then(setReviews);
  }, [rev]);

  const allBlocks: ScheduleBlock[] = schedules.flatMap((s) => ((s.frontmatter as any).blocks ?? []) as ScheduleBlock[]);
  const streak = smartStreak(schedules, logs, today());
  const adhere = adherence(allBlocks);
  const totalActualMin = allBlocks.reduce((s, b) => s + (Number(b.actual_min) || 0), 0);
  const loggedHours = logs.reduce((s, l) => s + (Number((l.frontmatter as any).hours) || 0), 0);

  // --- Readiness (breadth + consistency + depth) ---
  const nodes = roadmaps.flatMap((r) => ((r.frontmatter as any).nodes ?? []) as { status?: string }[]);
  const breadth = nodes.length ? Math.round((nodes.filter((n) => n.status === "done").length / nodes.length) * 100) : 0;
  const consistency = adhere;
  const reviewFm = reviews.map((r) => r.frontmatter as any);
  const recall = reviewFm.length ? Math.round((reviewFm.filter((c) => c.status === "green").length / reviewFm.length) * 100) : 0;
  const reviewed = reviewFm.filter((c) => Number(c.confidence) > 0);
  const depth = reviewed.length ? Math.round((reviewed.reduce((s, c) => s + Number(c.confidence), 0) / reviewed.length / 4) * 100) : 0;
  const readiness = Math.round((breadth + consistency + depth) / 3);
  const radarData = [
    { axis: "Breadth", value: breadth },
    { axis: "Consistency", value: consistency },
    { axis: "Recall", value: recall },
    { axis: "Depth", value: depth },
  ];

  const byTopic = new Map<string, number>();
  for (const b of allBlocks) {
    if (b.actual_min > 0) byTopic.set(b.topic, (byTopic.get(b.topic) ?? 0) + Number(b.actual_min));
  }
  const topicData = [...byTopic.entries()].map(([topic, min]) => ({ topic, hours: +(min / 60).toFixed(1) }));

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-semibold text-bright mb-6">Discipline</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<Flame size={18} className="text-violet2" />} label="Smart streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
        <Stat icon={<Target size={18} className="text-teal" />} label="Adherence" value={`${adhere}%`} />
        <Stat
          icon={<Clock size={18} className="text-violet2" />}
          label="Total focused"
          value={`${(totalActualMin / 60 + loggedHours).toFixed(1)}h`}
        />
      </div>

      {/* Readiness */}
      <section className="rounded-xl border border-edge bg-panel p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={16} className="text-violet2" />
          <h3 className="text-bright font-medium">Readiness</h3>
          <span className="ml-auto text-2xl font-semibold text-bright">{readiness}%</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-4 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} outerRadius={80}>
              <PolarGrid stroke="#2a2750" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "#8f8cb5", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#7f77dd" fill="#7f77dd" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
          <ul className="space-y-1.5 text-sm">
            {radarData.map((d) => (
              <li key={d.axis} className="flex items-center gap-3">
                <span className="text-muted w-28">{d.axis}</span>
                <div className="flex-1 h-1.5 rounded-full bg-panel2 overflow-hidden">
                  <div className="h-full bg-violet" style={{ width: `${d.value}%` }} />
                </div>
                <span className="text-soft w-10 text-right">{d.value}%</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-faint text-xs mt-3">
          Breadth = roadmap nodes done · Consistency = schedule adherence · Recall = green review cards · Depth = avg
          review confidence.
        </p>
      </section>

      <section className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="text-bright font-medium mb-3">Time by topic</h3>
        {topicData.length === 0 ? (
          <p className="text-muted text-sm">
            No focused time logged yet. Run a focus timer on the <span className="text-violet2">Schedule</span>{" "}
            screen.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topicData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2750" />
              <XAxis type="number" tick={{ fill: "#8f8cb5", fontSize: 11 }} />
              <YAxis type="category" dataKey="topic" tick={{ fill: "#8f8cb5", fontSize: 11 }} width={120} />
              <Tooltip
                contentStyle={{ background: "#141329", border: "1px solid #2a2750", borderRadius: 8, color: "#e8e6f5" }}
              />
              <Bar dataKey="hours" name="Hours" fill="#7f77dd" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="flex items-center gap-2 text-faint text-[11px] uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="text-bright text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}
