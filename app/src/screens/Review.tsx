import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Eye, CheckCircle2 } from "lucide-react";
import { fetchCollection, rateReview, today, type CollectionItem } from "../lib/api";
import { useAiAction } from "../lib/useAiAction";
import { toCard, isDue, nextDue, splitCard, type ReviewCard } from "../lib/review";

const STATUS_DOT: Record<ReviewCard["status"], string> = {
  red: "bg-red-400",
  yellow: "bg-yellow-400",
  green: "bg-teal",
};

const RATINGS = [
  { c: 1, label: "Again", hint: "reset", cls: "bg-red-500/80 hover:bg-red-500" },
  { c: 2, label: "Hard", hint: "hold", cls: "bg-yellow-500/80 hover:bg-yellow-500 text-ink" },
  { c: 3, label: "Good", hint: "advance", cls: "bg-violet hover:bg-violet2" },
  { c: 4, label: "Easy", hint: "advance", cls: "bg-teal hover:opacity-90 text-ink" },
];

export default function Review({ rev }: { rev: number }) {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [goals, setGoals] = useState<CollectionItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const gen = useAiAction();
  const date = today();

  useEffect(() => {
    fetchCollection("data/reviews").then((items) => setCards(items.map(toCard)));
    fetchCollection("goals").then(setGoals);
  }, [rev]);

  const due = useMemo(() => cards.filter((c) => isDue(c, date)), [cards, date]);
  const current = due[0];
  const parts = current ? splitCard(current.content) : { prompt: "", solution: "" };
  const goalId = (goals[0]?.frontmatter.id as string) ?? "";

  const rate = async (confidence: number) => {
    if (!current) return;
    setRevealed(false);
    await rateReview(current.id, confidence); // watcher refreshes the list
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-bright">Review</h2>
        <span className="text-muted text-sm">{due.length} due today</span>
        <button
          onClick={() => gen.run({ action: "suggestReviewCards", params: { goalId, count: 6 } })}
          disabled={gen.status === "running" || !goalId}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-edge2 bg-panel2 px-3 py-1.5 text-sm text-soft hover:border-violet disabled:opacity-50"
        >
          {gen.status === "running" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} className="text-violet2" />
          )}
          Generate cards
        </button>
      </div>

      {gen.status !== "idle" && (
        <p className={`text-sm mb-4 ${gen.status === "error" ? "text-red-300" : "text-muted"}`}>
          {gen.status === "running" && <Loader2 size={13} className="inline animate-spin mr-1.5" />}
          {gen.line}
        </p>
      )}

      {/* Due card */}
      {current ? (
        <div className="rounded-2xl border border-edge bg-panel p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[current.status]}`} />
            <span className="text-faint text-xs uppercase tracking-wide">{current.topic}</span>
          </div>
          <p className="text-bright text-lg whitespace-pre-wrap">{parts.prompt}</p>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-5 flex items-center gap-2 rounded-lg border border-edge2 bg-panel2 px-4 py-2 text-sm text-soft hover:border-violet"
            >
              <Eye size={15} /> Show solution
            </button>
          ) : (
            <>
              <div className="mt-5 rounded-xl border border-edge bg-panel2 p-4">
                <div className="text-faint text-[11px] uppercase tracking-wide mb-1">Solution</div>
                <p className="text-soft text-sm whitespace-pre-wrap">{parts.solution || "—"}</p>
              </div>
              <div className="mt-5">
                <div className="text-faint text-xs mb-2">How did it go?</div>
                <div className="flex gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.c}
                      onClick={() => rate(r.c)}
                      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium text-white ${r.cls}`}
                    >
                      {r.label}
                      <span className="block text-[10px] opacity-70 font-normal">{r.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-edge bg-panel p-8 text-center mb-8">
          <CheckCircle2 size={28} className="text-teal mx-auto mb-2" />
          <p className="text-bright font-medium">Nothing due right now.</p>
          <p className="text-muted text-sm mt-1">
            {cards.length ? "All caught up — come back when cards are due." : "Generate some cards to get started."}
          </p>
        </div>
      )}

      {/* Traffic-light list */}
      <h3 className="text-faint text-xs uppercase tracking-wide mb-3">All topics</h3>
      <ul className="space-y-2">
        {cards.length === 0 && <li className="text-muted text-sm">No cards yet.</li>}
        {cards.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-lg border border-edge bg-panel2 px-4 py-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[c.status]}`} />
            <span className="text-soft text-sm">{c.topic}</span>
            <span className="text-faint text-xs ml-auto">
              {isDue(c, date) ? "due now" : `next ${nextDue(c)}`} · every {c.interval_days}d
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
