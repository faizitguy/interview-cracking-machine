import { useEffect, useState } from "react";
import { fetchLogs, readFile, today, type LogEntry, type FileResult } from "../lib/api";
import MarkdownLite from "../components/MarkdownLite";

function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function Today({ rev }: { rev: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [todayLog, setTodayLog] = useState<FileResult | null>(null);
  const date = today();

  useEffect(() => {
    fetchLogs().then(setLogs).catch(() => setLogs([]));
    readFile(`data/logs/${date}.md`).then(setTodayLog).catch(() => setTodayLog(null));
  }, [rev, date]);

  const fm = (todayLog?.frontmatter ?? {}) as Record<string, any>;
  const tracks: string[] = Array.isArray(fm.tracks) ? fm.tracks : [];

  return (
    <div className="max-w-3xl mx-auto p-8">
      <p className="text-faint text-sm">{prettyDate(date)}</p>
      <h2 className="text-2xl font-semibold text-bright mt-1 mb-6">Today</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Hours logged" value={fm.hours != null ? String(fm.hours) : "0"} />
        <Stat label="Tracks" value={tracks.length ? tracks.join(", ") : "—"} />
        <Stat label="Mood" value={fm.mood ? String(fm.mood) : "—"} />
      </div>

      <section className="rounded-xl border border-edge bg-panel p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-bright font-medium">Today's log</h3>
          <span className="text-faint text-xs">data/logs/{date}.md</span>
        </div>
        {todayLog ? (
          <MarkdownLite content={todayLog.content} />
        ) : (
          <p className="text-muted text-sm py-4">
            Nothing logged yet today. Head to <span className="text-violet2">Diary</span> and jot a
            note — Claude will write it up here.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-faint text-xs uppercase tracking-wide mb-3">Recent days</h3>
        <ul className="space-y-2">
          {logs.length === 0 && <li className="text-muted text-sm">No logs yet.</li>}
          {logs.map((l) => {
            const lf = l.frontmatter as Record<string, any>;
            const bits = [
              lf.hours != null ? `${lf.hours}h` : null,
              Array.isArray(lf.tracks) && lf.tracks.length ? lf.tracks.join(", ") : null,
              lf.mood || null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={l.file}
                className="flex items-center gap-3 rounded-lg border border-edge bg-panel2 px-4 py-2.5"
              >
                <span className="text-soft text-sm font-medium">{l.file.replace(".md", "")}</span>
                {bits && <span className="text-muted text-xs ml-auto">{bits}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="text-faint text-[11px] uppercase tracking-wide">{label}</div>
      <div className="text-bright text-lg font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}
