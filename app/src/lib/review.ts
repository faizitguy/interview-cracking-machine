import type { CollectionItem } from "./api";

export interface ReviewCard {
  id: string;
  topic: string;
  status: "red" | "yellow" | "green";
  last_reviewed: string;
  interval_days: number;
  confidence: number;
  /** body content (## Prompt / ## Solution) */
  content: string;
}

export function toCard(item: CollectionItem): ReviewCard {
  const fm = item.frontmatter as any;
  return {
    id: String(fm.id ?? item.file.split("/").pop()?.replace(".md", "")),
    topic: String(fm.topic ?? "Untitled"),
    status: (fm.status as ReviewCard["status"]) ?? "yellow",
    last_reviewed: String(fm.last_reviewed ?? "").slice(0, 10),
    interval_days: Number(fm.interval_days) || 1,
    confidence: Number(fm.confidence) || 0,
    content: item.content,
  };
}

/** A card is due if never reviewed, or last_reviewed + interval_days <= today. */
export function isDue(card: ReviewCard, todayStr: string): boolean {
  if (!card.last_reviewed) return true;
  const due = new Date(card.last_reviewed + "T00:00:00Z");
  due.setUTCDate(due.getUTCDate() + card.interval_days);
  return due <= new Date(todayStr + "T00:00:00Z");
}

export function nextDue(card: ReviewCard): string {
  if (!card.last_reviewed) return "now";
  const due = new Date(card.last_reviewed + "T00:00:00Z");
  due.setUTCDate(due.getUTCDate() + card.interval_days);
  return due.toISOString().slice(0, 10);
}

/** Split a card body into prompt + (hidden) solution. */
export function splitCard(content: string): { prompt: string; solution: string } {
  const solIdx = content.search(/^##\s*Solution/im);
  if (solIdx < 0) return { prompt: content.replace(/^##\s*Prompt\s*/im, "").trim(), solution: "" };
  const prompt = content
    .slice(0, solIdx)
    .replace(/^##\s*Prompt\s*/im, "")
    .trim();
  const solution = content
    .slice(solIdx)
    .replace(/^##\s*Solution[^\n]*\n/im, "")
    .trim();
  return { prompt, solution };
}
