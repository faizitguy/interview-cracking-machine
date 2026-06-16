import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, Award, CalendarDays, ChevronRight, ChevronLeft, Target, Sparkles, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
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

// Compact axis labels for the domain radar (full labels still used in tooltips/lists).
const SHORT_LABEL: Record<string, string> = {
  general: "Behavioral",
  dsa: "DSA",
  "system-design": "System Design",
  "ai-engineering": "AI Eng",
  python: "Python",
  backend: "Backend",
  frontend: "Frontend",
  fullstack: "Full-Stack",
};
const shortLabel = (id: string, full: string) => SHORT_LABEL[id] ?? full.split("/")[0].trim();

const PAGE_SIZE = 6;

export default function History({ rev }: { rev: number }) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [mode, setMode] = useState<"domain" | "skill">("domain");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchCollection("mocks").then(setItems);
    fetchRounds().then(setRounds);
    setPage(0);
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

  // Per-skill radar: latest interview vs your running average across every mock.
  const radar = DIMS.map((d) => {
    const vals = attempts.map((a) => a.rubric[d]).filter((v): v is number => v != null);
    const avg = vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : 0;
    const latest = attempts.length ? attempts[attempts.length - 1].rubric[d] ?? 0 : 0;
    return { key: d, dim: DIM_LABEL[d], avg, latest, delta: +(latest - avg).toFixed(2) };
  });
  const ranked = [...radar].sort((a, b) => b.avg - a.avg);
  const strongest = ranked[0];
  const focus = ranked[ranked.length - 1];
  const multi = attempts.length > 1; // a "latest vs average" comparison only means something with >1 mock

  // Per-domain mastery: real average of every interview's overall score within that round,
  // rescaled from the 1–4 rubric to a friendlier 0–10 score.
  const domainData = rounds.map((r) => {
    const subset = attempts.filter((a) => a.type === r.id);
    const avg = subset.length ? subset.reduce((s, a) => s + a.avg, 0) / subset.length : 0;
    const score = +((avg / 4) * 10).toFixed(1); // 0–10
    return { key: r.id, dim: shortLabel(r.id, r.label), full: r.label, avg, score, count: subset.length };
  });
  const playedDomains = domainData.filter((d) => d.count > 0);
  const dStrong = playedDomains.length ? [...playedDomains].sort((a, b) => b.avg - a.avg)[0] : null;
  const dFocus = playedDomains.length ? [...playedDomains].sort((a, b) => a.avg - b.avg)[0] : null;

  // Newest-first list + pagination.
  const pageCount = Math.max(1, Math.ceil(newest.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = newest.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

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
          <h2 className="font-display text-3xl font-bold text-bright">{label(open.type)}</h2>
          <span className="text-faint text-sm">{open.level} · {open.date}</span>
          <span className={`ml-auto font-display text-4xl font-bold tnum ${SCORE_COLOR(open.avg)}`}>{open.avg}<span className="text-faint text-base font-normal">/4</span></span>
        </div>
        <p className="text-soft mb-5">{open.verdict}</p>

        {/* rubric bars */}
        <div className="rounded-xl card-base p-5 mb-5">
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
    <div className="max-w-5xl mx-auto p-8">
      <p className="text-amber font-mono text-xs uppercase tracking-[0.2em] mb-2">Your progress</p>
      <h2 className="font-display text-4xl font-bold text-bright mb-2">Interview <span className="text-aurora">history</span></h2>
      <p className="text-muted mb-7 max-w-xl">Every mock you've taken — review the honest feedback, study the transcript, then run it again and watch the line climb.</p>

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

          {/* Radar — domain mastery (by round) or skill profile (by rubric), toggleable */}
          <div className="rounded-2xl card-base p-5 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
              <div>
                <h3 className="text-bright font-medium">{mode === "domain" ? "Domain mastery" : "Skill profile"}</h3>
                <p className="text-faint text-xs mt-0.5 max-w-md">
                  {mode === "domain"
                    ? "Your average score in each interview domain — see at a glance which rounds you've mastered and which still need reps."
                    : multi
                    ? "Your latest interview against your running average across the four rubric skills."
                    : "Where you stand across the four rubric skills."}
                </p>
              </div>
              <div className="flex rounded-lg border border-edge bg-panel2 p-0.5 text-sm shrink-0">
                {(["domain", "skill"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      mode === m ? "bg-violet text-white" : "text-muted hover:text-soft"
                    }`}
                  >
                    {m === "domain" ? "By domain" : "By skill"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-center">
              <ResponsiveContainer width="100%" height={420}>
                {mode === "domain" ? (
                  <RadarChart data={domainData} outerRadius="80%" margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
                    <PolarGrid stroke="#262134" />
                    <PolarAngleAxis dataKey="dim" tick={{ fill: "#d4cfe1", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 10]} tickCount={6} angle={90} axisLine={false} tick={{ fill: "#6a6486", fontSize: 10 }} />
                    <Radar
                      name="Score / 10"
                      dataKey="score"
                      stroke="#8b7cff"
                      strokeWidth={2}
                      fill="#8b7cff"
                      fillOpacity={0.28}
                      dot={{ r: 3, fill: "#8b7cff" }}
                      isAnimationActive
                    />
                    <Tooltip content={<DomainTip />} />
                  </RadarChart>
                ) : (
                  <RadarChart data={radar} outerRadius="80%" margin={{ top: 20, bottom: 20 }}>
                    <PolarGrid stroke="#262134" />
                    <PolarAngleAxis dataKey="dim" tick={{ fill: "#d4cfe1", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 4]} tickCount={5} angle={90} axisLine={false} tick={{ fill: "#6a6486", fontSize: 10 }} />
                    {multi && (
                      <Radar name="Average" dataKey="avg" stroke="#ffb13d" strokeWidth={1.5} fill="#ffb13d" fillOpacity={0.08} />
                    )}
                    <Radar
                      name={multi ? "Latest" : "Score"}
                      dataKey={multi ? "latest" : "avg"}
                      stroke="#8b7cff"
                      strokeWidth={2}
                      fill="#8b7cff"
                      fillOpacity={0.28}
                      dot={{ r: 3, fill: "#8b7cff" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#968ead", paddingTop: 4 }} />
                    <Tooltip
                      contentStyle={{ background: "#141220", border: "1px solid #262134", borderRadius: 8, color: "#f8f6fc" }}
                      formatter={(v: any, n: any) => [`${v}/4`, n]}
                    />
                  </RadarChart>
                )}
              </ResponsiveContainer>

              <div className="space-y-3">
                {mode === "domain" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-teal/25 bg-teal/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-teal text-[11px] uppercase tracking-wide">
                          <Sparkles size={13} /> Strongest
                        </div>
                        <div className="text-bright font-medium mt-1 leading-tight">{dStrong ? dStrong.full : "—"}</div>
                        <div className="text-faint text-xs mt-0.5">{dStrong ? `${dStrong.score}/10 average` : "No data yet"}</div>
                      </div>
                      <div className="rounded-xl border border-coral/25 bg-coral/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-coral text-[11px] uppercase tracking-wide">
                          <Target size={13} /> Focus area
                        </div>
                        <div className="text-bright font-medium mt-1 leading-tight">{dFocus ? dFocus.full : "—"}</div>
                        <div className="text-faint text-xs mt-0.5">{dFocus ? `${dFocus.score}/10 average` : "No data yet"}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {domainData.map((d) => (
                        <div key={d.key} className="flex items-center gap-3 text-sm">
                          <span className="text-muted flex-1 truncate">{d.full}</span>
                          {d.count ? (
                            <>
                              <span className={`tnum w-12 text-right ${SCORE_COLOR(d.avg)}`}>{d.score}/10</span>
                              <span className="text-faint text-[11px] w-14 text-right">{d.count}×</span>
                            </>
                          ) : (
                            <span className="text-faint text-[11px] w-24 text-right">Not practiced</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-faint text-[11px]">Averaged from every interview's overall score in that round.</p>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-teal/25 bg-teal/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-teal text-[11px] uppercase tracking-wide">
                          <Sparkles size={13} /> Strongest
                        </div>
                        <div className="text-bright font-medium mt-1 leading-tight">{strongest.dim}</div>
                        <div className="text-faint text-xs mt-0.5">{strongest.avg}/4 average</div>
                      </div>
                      <div className="rounded-xl border border-coral/25 bg-coral/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-coral text-[11px] uppercase tracking-wide">
                          <Target size={13} /> Focus area
                        </div>
                        <div className="text-bright font-medium mt-1 leading-tight">{focus.dim}</div>
                        <div className="text-faint text-xs mt-0.5">{focus.avg}/4 average</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {radar.map((r) => (
                        <div key={r.key} className="flex items-center gap-3 text-sm">
                          <span className="text-muted flex-1 truncate">{r.dim}</span>
                          <span className="text-soft tnum w-10 text-right">{multi ? r.latest : r.avg}/4</span>
                          {multi && <Delta v={r.delta} />}
                        </div>
                      ))}
                    </div>
                    {multi && <p className="text-faint text-[11px]">Arrows compare your latest interview to your average.</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl card-base p-4 mb-6">
            <h3 className="text-bright font-medium mb-3">Progress over time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chart} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b7cff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b7cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262134" />
                <XAxis dataKey="n" tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <YAxis domain={[1, 4]} tick={{ fill: "#8f8cb5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#141220", border: "1px solid #262134", borderRadius: 8, color: "#f8f6fc" }}
                  formatter={(v: any) => [`${v}/4`, "Score"]}
                  labelFormatter={(l, p: any) => `${l} · ${p?.[0]?.payload?.round ?? ""} · ${p?.[0]?.payload?.date ?? ""}`}
                />
                <Area type="monotone" dataKey="score" stroke="#8b7cff" strokeWidth={2} fill="url(#g)" dot={{ r: 3, fill: "#8b7cff" }} />
              </AreaChart>
            </ResponsiveContainer>
            {best && <p className="text-faint text-xs mt-2">Best so far: {best.avg}/4 on {label(best.type)} ({best.date}).</p>}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-faint text-xs uppercase tracking-wide">All interviews</h3>
            <span className="text-faint text-xs">
              {safePage * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE + PAGE_SIZE, newest.length)} of {newest.length}
            </span>
          </div>
          <ul className="space-y-2">
            {pageItems.map((a) => (
              <li key={a.file}>
                <button
                  onClick={() => setOpenFile(a.file)}
                  className="w-full flex items-center gap-4 rounded-xl card-base hover:border-violet transition-colors px-4 py-3 text-left"
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

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="flex items-center gap-1 rounded-lg border border-edge px-3 py-1.5 text-sm text-muted hover:text-soft hover:border-edge2 disabled:opacity-40 disabled:hover:text-muted disabled:hover:border-edge"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-sm tnum transition-colors ${
                    i === safePage ? "bg-violet text-white" : "text-muted hover:text-soft hover:bg-panel2"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage === pageCount - 1}
                className="flex items-center gap-1 rounded-lg border border-edge px-3 py-1.5 text-sm text-muted hover:text-soft hover:border-edge2 disabled:opacity-40 disabled:hover:text-muted disabled:hover:border-edge"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Domain radar tooltip — shows the round, its 0–10 score, and how many interviews fed it. */
function DomainTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-edge bg-panel px-3 py-2 text-xs shadow-lg">
      <div className="text-bright font-medium">{p.full}</div>
      <div className="text-soft tnum mt-0.5">
        {p.count ? `${p.score}/10 · ${p.count} interview${p.count > 1 ? "s" : ""}` : "Not practiced yet"}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl card-base p-4">
      <div className="flex items-center gap-2 text-faint text-[11px] uppercase tracking-wide">{icon} {label}</div>
      <div className="text-bright text-2xl font-semibold mt-1.5">{value}</div>
    </div>
  );
}

/** Latest-vs-average delta chip for one rubric skill. */
function Delta({ v }: { v: number }) {
  if (v > 0)
    return (
      <span className="flex items-center justify-end gap-0.5 text-teal text-xs w-12 tnum">
        <ArrowUp size={12} /> {v.toFixed(1)}
      </span>
    );
  if (v < 0)
    return (
      <span className="flex items-center justify-end gap-0.5 text-bad text-xs w-12 tnum">
        <ArrowDown size={12} /> {Math.abs(v).toFixed(1)}
      </span>
    );
  return (
    <span className="flex items-center justify-end gap-0.5 text-faint text-xs w-12">
      <Minus size={12} />
    </span>
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
            <div className={`inline-block rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap text-left max-w-[88%] ${you ? "bg-violet text-white" : "card-base text-soft"}`}>
              {clean}
            </div>
          </div>
        );
      })}
    </div>
  );
}
