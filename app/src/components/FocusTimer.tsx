import { useEffect, useRef, useState } from "react";
import { Play, Square, Timer } from "lucide-react";
import { scheduleBlock, type ScheduleBlock } from "../lib/api";

/**
 * Counts up while focused on a chosen block; on stop, logs the elapsed minutes
 * to that block's actual_min (spec Phase 4).
 */
export default function FocusTimer({ week, blocks }: { week: string; blocks: ScheduleBlock[] }) {
  const [blockId, setBlockId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [running]);

  // Keep a valid selection as blocks change.
  useEffect(() => {
    if (!blockId && blocks.length) setBlockId(blocks[0].id);
  }, [blocks, blockId]);

  const start = () => {
    if (!blockId) return;
    startRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  };

  const stop = async () => {
    setRunning(false);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    if (blockId) await scheduleBlock(week, { op: "log", id: blockId, minutes });
    setElapsed(0);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <Timer size={16} className="text-violet2" />
        <h3 className="text-bright font-medium">Focus timer</h3>
      </div>
      {blocks.length === 0 ? (
        <p className="text-muted text-sm">Add a time-block below, then start a focus session on it.</p>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            disabled={running}
            className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-soft focus:border-violet focus:outline-none disabled:opacity-60"
          >
            {blocks.map((b) => (
              <option key={b.id} value={b.id} className="bg-panel">
                {b.day} · {b.topic}
              </option>
            ))}
          </select>
          <span className="font-mono text-2xl text-bright tabular-nums">
            {mm}:{ss}
          </span>
          {!running ? (
            <button
              onClick={start}
              disabled={!blockId}
              className="flex items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet2 disabled:opacity-50"
            >
              <Play size={15} /> Start
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
            >
              <Square size={15} /> Stop &amp; log
            </button>
          )}
          {running && <span className="text-faint text-xs">logging to actual minutes on stop</span>}
        </div>
      )}
    </div>
  );
}
