import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, Award, CalendarDays, ChevronRight } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fetchCollection, fetchRounds, type CollectionItem, type Round } from "../lib/api";

const DIMS = ["communication", "depth", "problem_solving", "confidence"] as const;
const DIM_LABEL: Record<string, string> = {
  communication: "Communication",
  depth: "Depth",
  problem_solving: "Problem solving",
  confidence: "Confidence",
};

interface Attempt {
  file: string;
  type: string;
  level: string;
  date: string;
  verdict: string;
  rubric: Record<string, number>;
  avg: number;
  body: string;
}

function toAttempt(item: CollectionItem): Attempt {
  const fm = item.frontmatter as any;
  const rubric: Record<string, number> = {};
  for (const d of DIMS) if (fm.rubric && fm.rubric[d] != null) rubric[d] = Number(fm.rubric[d]);
  const vals = Object.values(rubric);
  const avg = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
  return {
    file: item.file,
    type: String(fm.type ?? "general"),
    level: String(fm.level ?? ""),
    date: String(fm.date ?? "").slice(0, 10),
    verdict: String(fm.verdict ?? ""),
    rubric,
    avg,
    body: item.content,
  };
}

/** Split a mock body into { heading -> text } sections by "## ". */
function sections(body: string): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = [];
  const re = /^##\s+(.+)$/gm;
  const idxs: { name: string; at: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) idxs.push({ name: m[1].trim(), at: m.index + m[0].length, end: 0 });
  idxs.forEach((s, i) => (s.end = i + 1 < idxs.length ? idxs[i + 1].at - 0 : body.length));
  for (let i = 0; i < idxs.length; i++) {
    const next = i + 1 < idxs.length ? body.indexOf("## ", idxs[i].at) : body.length;
    out.push({ heading: idxs[i].name, text: body.slice(idxs[i].at, next < 0 ? body.length : next).trim() });
  }
  return out;
}

const SCORE_COLOR = (s: number) => (s >= 3.5 ? "text-teal" : s >= 2.5 ? "text-violet2" : s >= 1.5 ? "text-yellow-400" : "text-red-400");

export default function History({ rev }: { rev: number }) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [openFile, setOpenFile] = useState<string | null>(null);

  useEffect(() => {
    fetchCollection("mocks").then(setItems);
    fetchRounds().then(setRounds);
  }, [rev]);

  const label = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;

  const attempts = useMemo(
    () => items.map(toAttempt).filter((a) => a.avg > 0).sort((a, b) => a.file.localeCompare(b.file)),
    [items],
  );
  const newest = [...attempts].reverse();
  const open = attempts.find((a) => a.file === openFile);

  const chart = attempts.map((a, i) => ({ n: `#${i + 1}`, score: a.avg, round: label(a.type), date: a.date }));
  const overallAvg = attempts.length ? +(attempts.reduce((s, a) => s + a.avg, 0) / attempts.length).toFixed(2) : 0;
  const latest = attempts.length ? attempts[attempts.length - 1].avg : 0;
  const best = attempts.reduce((b, a) => (a.avg > b.avg ? a : b), attempts[0]);

  // ---- Detail view ----
  if (open) {
    const secs = sections(open.body);
    const improve = secs.find((s) => /improve/i.test(s.heading));
    const summary = secs.find((s) => /summary/i.test(s.heading));
    const evidence = secs.find((s) => /evidence/i.test(s.heading));
    const transcript = secs.find((s) => /transcript/i.test(s.heading));
    return (
      <div className="max-w-3xl mx-auto p-8">
        <button onClick={() => setOpenFile(null)} className="flex items-center gap-1.5 text-muted hover:text-soft text-sm mb-5">
          <ArrowLeft size={15} /> Back to history
        </button>

        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h2 className="text-2xl font-semibold text-bright">{label(open.type)}</h2>
          <span className="text-faint text-sm">{open.level} · {open.date}</span>
          <span className={`ml-auto text-3xl font-bold ${SCORE_COLOR(open.avg)}`}>{open.avg}<span className="text-faint text-base font-normal">/4</span></span>
        </div>
        <p className="text-soft mb-5">{open.verdict}</p>

        {/* rubric bars */}
        <div className="rounded-xl border border-edge bg-panel p-5 mb-5">
          <div className="space-y-2.5">
            {DIMS.map((d) => (
              <div key={d} className="flex items-center gap-3 text-sm">
                <span className="text-muted w-32 shrink-0">{DIM_LABEL[d]}</span>
                <div className="flex-1 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div className="h-full bg-violet" style={{ width: `${((open.rubric[d] ?? 0) / 4) * 100}%` }} />
                </div>
                <span className="text-soft w-8 text-right">{open.rubric[d] ?? "—"}/4</span>
              </div>
            ))}
          </div>
        </div>

        {improve && (
          <Section title="What to improve" accent>
            {improve.text}
          </Section>
        )}
        {summary && <Section title="Summary">{summary.text}</Section>}
        {evidence && <Section title="Evidence notes">{evidence.text}</Section>}
        {transcript && (
          <div className="mb-5">
            <h3 className="text-faint text-xs uppercase tracking-wide mb-3">Transcript</h3>
            <Transcript text={transcript.text} />
          </div>
        )}
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-semibold text-bright mb-1">History</h2>
      <p className="text-muted text-sm mb-6">Every mock you've taken — review the feedback, study the transcript, then run it again and watch the line climb.</p>

      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge p-10 text-center text-muted">
          No interviews yet. Finish one and it'll show up here with full feedback and your progress.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat icon={<TrendingUp size={16} className="text-teal" />} label="Latest" value={`${latest}/4`} />
            <Stat icon={<Award size={16} className="text-violet2" />} label="Average" value={`${overallAvg}/4`} />
            <Stat icon={<CalendarDays size={16} className="text-violet2" />} label="Interviews" value={`${attempts.length}`} />
          </div>

          <div className="rounded-xl border border-edge bg-panel p-4 mb-6">
            <h3 className="text-bright font-medium mb-3">Progress</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chart} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7f77dd" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#7f77dd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2750" />
                <XAxis dataKey="n" tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <YAxis domain={[1, 4]} tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#141329", border: "1px solid #2a2750", borderRadius: 8, color: "#e8e6f5" }}
                  formatter={(v: any) => [`${v}/4`, "Score"]}
                  labelFormatter={(l, p: any) => `${l} · ${p?.[0]?.payload?.round ?? ""} · ${p?.[0]?.payload?.date ?? ""}`}
                />
                <Area type="monotone" dataKey="score" stroke="#7f77dd" strokeWidth={2} fill="url(#g)" dot={{ r: 3, fill: "#7f77dd" }} />
              </AreaChart>
            </ResponsiveContainer>
            {best && <p className="text-faint text-xs mt-2">Best so far: {best.avg}/4 on {label(best.type)} ({best.date}).</p>}
          </div>

          <h3 className="text-faint text-xs uppercase tracking-wide mb-3">All interviews</h3>
          <ul className="space-y-2">
            {newest.map((a) => (
              <li key={a.file}>
                <button
                  onClick={() => setOpenFile(a.file)}
                  className="w-full flex items-center gap-4 rounded-xl border border-edge bg-panel hover:border-violet transition-colors px-4 py-3 text-left"
                >
                  <span className={`text-2xl font-bold w-14 shrink-0 ${SCORE_COLOR(a.avg)}`}>{a.avg}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-soft font-medium">{label(a.type)} <span className="text-faint font-normal">· {a.level}</span></span>
                    <span className="block text-muted text-sm truncate">{a.verdict}</span>
                  </span>
                  <span className="text-faint text-xs shrink-0">{a.date}</span>
                  <ChevronRight size={16} className="text-faint shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="flex items-center gap-2 text-faint text-[11px] uppercase tracking-wide">{icon} {label}</div>
      <div className="text-bright text-2xl font-semibold mt-1.5">{value}</div>
    </div>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 mb-5 ${accent ? "border-violet/40 bg-violet/5" : "border-edge bg-panel"}`}>
      <h3 className={`text-xs uppercase tracking-wide mb-2 ${accent ? "text-violet2" : "text-faint"}`}>{title}</h3>
      <div className="text-soft text-sm whitespace-pre-wrap leading-relaxed">{children}</div>
    </div>
  );
}

function Transcript({ text }: { text: string }) {
  // Lines look like "**Interviewer:** ..." / "**You:** ...".
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        const you = /^\*\*You:\*\*/.test(b);
        const clean = b.replace(/^\*\*(Interviewer|You):\*\*\s*/, "");
        return (
          <div key={i} className={you ? "text-right" : ""}>
            <div className={`inline-block rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap text-left max-w-[88%] ${you ? "bg-violet text-white" : "bg-panel border border-edge text-soft"}`}>
              {clean}
            </div>
          </div>
        );
      })}
    </div>
  );
}
