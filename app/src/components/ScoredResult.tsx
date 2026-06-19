import { useEffect, useState } from "react";
import {
  Trophy, History as HistoryIcon, RotateCw, Loader2, Check, FileSearch, Scale, PenLine, AlertTriangle,
} from "lucide-react";
import { fetchCollection, type CollectionItem } from "../lib/api";
import ResultDetail, { DIMS, type ResultData } from "./ResultDetail";

interface Parsed extends ResultData {}

/** Split a mock body into { heading -> text } sections by "## ". */
function splitSections(body: string): { heading: string; text: string }[] {
  const re = /^##\s+(.+)$/gm;
  const heads: { name: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) heads.push({ name: m[1].trim(), at: m.index + m[0].length });
  return heads.map((h, i) => {
    const next = i + 1 < heads.length ? body.indexOf("## ", h.at) : body.length;
    return { heading: h.name, text: body.slice(h.at, next < 0 ? body.length : next).trim() };
  });
}

function parseItem(item: CollectionItem): Parsed {
  const fm = item.frontmatter as any;
  const rubric: Record<string, number> = {};
  // Rubric lives flat in frontmatter (communication/depth/…) or nested under `rubric`.
  for (const d of DIMS) {
    const v = fm?.rubric?.[d] ?? fm?.[d];
    if (v != null) rubric[d] = Number(v);
  }
  const vals = Object.values(rubric);
  const avg = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
  const secs = splitSections(item.content);
  const sec = (re: RegExp) => secs.find((s) => re.test(s.heading))?.text;
  return {
    verdict: String(fm.verdict ?? ""),
    rubric,
    avg,
    improve: sec(/improve/i),
    summary: sec(/summary/i),
    evidence: sec(/evidence/i),
    transcript: sec(/transcript/i),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STEPS = [
  { icon: FileSearch, label: "Reviewing your answers" },
  { icon: Scale, label: "Weighing the rubric" },
  { icon: PenLine, label: "Writing honest feedback" },
];

export default function ScoredResult({
  scoring,
  result,
  file,
  roundLabel,
  level,
  date,
  onAnother,
  onHistory,
}: {
  scoring: boolean;
  result: string;
  file: string;
  roundLabel: string;
  level: string;
  date: string;
  onAnother: () => void;
  onHistory: () => void;
}) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [loading, setLoading] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!scoring) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [scoring]);

  useEffect(() => {
    let cancelled = false;
    if (scoring || !file) return;
    setLoading(true);
    (async () => {
      for (let i = 0; i < 6 && !cancelled; i++) {
        const items = await fetchCollection("mocks").catch(() => [] as CollectionItem[]);
        const hit = items.find((it) => it.file === file || it.file.endsWith(`/${file}`));
        if (hit) {
          if (!cancelled) setParsed(parseItem(hit));
          break;
        }
        await sleep(400);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scoring, file]);

  // ---- Loading: scoring in progress (or fetching the written file) ----
  if (scoring || (loading && !parsed)) {
    const activeIdx = scoring ? Math.min(Math.floor(secs / 4), STEPS.length - 1) : STEPS.length - 1;
    return (
      <div className="min-h-full grid place-items-center px-6 py-16">
        <div className="step-in w-[min(92%,32rem)] text-center">
          <div className="relative mx-auto mb-8 grid h-40 w-40 place-items-center">
            <span className="conn-ring" />
            <span className="conn-ring" style={{ animationDelay: "0.9s" }} />
            <span className="conn-ring" style={{ animationDelay: "1.8s" }} />
            <span className="orb speaking h-24 w-24">
              <span className="orb-ring" />
            </span>
            <Trophy size={26} className="absolute text-amber drop-shadow" />
          </div>

          <p className="text-amber font-mono text-xs uppercase tracking-[0.22em] mb-2">{roundLabel}</p>
          <h2 className="font-display text-2xl font-bold text-aurora">Scoring your interview</h2>
          <p className="mt-2 text-sm text-muted">
            Your interviewer is grading honestly — this takes a few seconds.
          </p>

          <div className="mx-auto mt-8 max-w-xs space-y-2.5 text-left">
            {STEPS.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${
                    done
                      ? "border-teal/30 bg-teal/5"
                      : active
                        ? "border-coral/40 bg-coral/5"
                        : "border-edge bg-panel/40 opacity-50"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      done ? "bg-teal/15 text-teal" : active ? "bg-coral/15 text-coral" : "bg-panel2 text-faint"
                    }`}
                  >
                    {done ? <Check size={15} /> : active ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                  </span>
                  <span className={`text-sm ${active ? "shimmer font-medium" : done ? "text-soft" : "text-faint"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-7 h-1 w-48 overflow-hidden rounded-full bg-edge/60">
            <div className="bar-indet h-full w-1/3 rounded-full bg-gradient-to-r from-amber via-coral to-violet" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Result is in ----
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10 step-in">
      <div className="mb-3 flex items-center gap-2 text-amber font-mono text-xs uppercase tracking-[0.22em]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_var(--color-teal)]" />
        Interview complete
      </div>

      {parsed ? (
        <ResultDetail
          data={{ ...parsed, note: result || undefined }}
          roundLabel={roundLabel}
          level={level}
          date={date}
        />
      ) : (
        // No structured file yet — graceful fallback to the spoken closing note.
        <>
          <ResultDetail
            data={{ verdict: result || "", rubric: {}, avg: 0 }}
            roundLabel={roundLabel}
            level={level}
            date={date}
          />
          {!result && (
            <div className="rounded-2xl card-base p-5 mt-6 flex items-center gap-2.5 text-muted text-sm">
              <AlertTriangle size={16} className="text-amber" />
              We couldn't load the full breakdown — your interview is saved in History.
            </div>
          )}
        </>
      )}

      {/* ---- Actions ---- */}
      <div className="flex flex-wrap items-center gap-3 mt-8">
        <button onClick={onAnother} className="btn-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm">
          <RotateCw size={16} /> Start another interview
        </button>
        <button
          onClick={onHistory}
          className="flex items-center gap-2 rounded-xl border border-edge2 bg-panel px-5 py-3 text-sm text-soft hover:border-violet hover:text-bright transition-colors"
        >
          <HistoryIcon size={15} /> View full history &amp; trend
        </button>
      </div>
    </div>
  );
}
