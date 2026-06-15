import type { CollectionItem, LogEntry, ScheduleBlock } from "./api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday (UTC) of an ISO week id like "2026-W25". */
function isoWeekToMonday(weekId: string): Date {
  const [y, w] = weekId.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + (w - 1) * 7);
  return monday;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export interface TopicStat {
  topic: string;
  planned: number;
  actual: number;
}

/** Planned vs actual minutes per topic for one week's blocks. */
export function topicStats(blocks: ScheduleBlock[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const b of blocks) {
    const key = b.topic || "untitled";
    const cur = map.get(key) ?? { topic: key, planned: 0, actual: 0 };
    cur.planned += Number(b.planned_min) || 0;
    cur.actual += Number(b.actual_min) || 0;
    map.set(key, cur);
  }
  return [...map.values()];
}

/** Adherence = min(actual, planned) / planned across blocks (0–100). */
export function adherence(blocks: ScheduleBlock[]): number {
  let planned = 0;
  let met = 0;
  for (const b of blocks) {
    const p = Number(b.planned_min) || 0;
    const a = Number(b.actual_min) || 0;
    planned += p;
    met += Math.min(a, p);
  }
  return planned ? Math.round((met / planned) * 100) : 0;
}

/** Flatten every schedule block, tagged with its calendar date. */
export function datedBlocks(schedules: CollectionItem[]): { date: string; block: ScheduleBlock }[] {
  const out: { date: string; block: ScheduleBlock }[] = [];
  for (const s of schedules) {
    const week = String((s.frontmatter as any).week ?? "");
    const blocks = ((s.frontmatter as any).blocks ?? []) as ScheduleBlock[];
    if (!/^\d{4}-W\d{2}$/.test(week)) continue;
    const monday = isoWeekToMonday(week);
    for (const block of blocks) {
      const idx = DAYS.indexOf(String(block.day));
      if (idx < 0) continue;
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + idx);
      out.push({ date: ymd(d), block });
    }
  }
  return out;
}

/**
 * Smart streak: consecutive days up to today where you did NOT miss a planned
 * commitment. A day breaks the streak only if it had planned minutes but zero
 * actual (an unplanned rest day never breaks it). Logged study hours also count
 * as activity for that day.
 */
export function smartStreak(schedules: CollectionItem[], logs: LogEntry[], todayStr: string): number {
  const planned = new Map<string, number>();
  const actual = new Map<string, number>();
  for (const { date, block } of datedBlocks(schedules)) {
    planned.set(date, (planned.get(date) ?? 0) + (Number(block.planned_min) || 0));
    actual.set(date, (actual.get(date) ?? 0) + (Number(block.actual_min) || 0));
  }
  for (const l of logs) {
    const date = String((l.frontmatter as any).date ?? l.file.replace(".md", "")).slice(0, 10);
    const hrs = Number((l.frontmatter as any).hours) || 0;
    if (hrs > 0) actual.set(date, (actual.get(date) ?? 0) + hrs * 60);
  }

  let streak = 0;
  const cursor = new Date(todayStr + "T00:00:00Z");
  for (let i = 0; i < 365; i++) {
    const ds = ymd(cursor);
    const p = planned.get(ds) ?? 0;
    const a = actual.get(ds) ?? 0;
    if (p > 0 && a === 0) break; // missed a planned commitment
    if (p > 0 || a > 0) streak++; // a day that counts
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
