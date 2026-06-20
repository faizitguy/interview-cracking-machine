import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  BookOpen,
  Circle,
  Sparkles,
} from "lucide-react";
import { askStream, eventText, type ClaudeEvent, type Round } from "../../lib/api";
import RoundSelect from "../../components/RoundSelect";
import Markdown from "../../components/Markdown";

interface Lesson {
  title: string;
  summary: string;
}
interface Track {
  level: string;
  lessons: Lesson[];
}

// --- tiny localStorage helpers (Learn keeps its own progress locally) ---
const trackKey = (r: string) => `icm.learn.track.${r}`;
const progKey = (r: string) => `icm.learn.progress.${r}`;
const lessonKey = (r: string, i: number) => `icm.learn.lesson.${r}.${i}`;

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage full / disabled — Learn still works, just won't remember */
  }
}

/** Parse "1. Title :: summary" lines from the track action into lessons. */
function parseTrack(text: string): Lesson[] {
  const out: Lesson[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*\d+[.)]\s*(.+)$/);
    if (!m) continue;
    const rest = m[1].trim();
    let title = rest;
    let summary = "";
    const sep = rest.indexOf("::"); // the format the prompt asks for — prefer it
    if (sep >= 0) {
      title = rest.slice(0, sep);
      summary = rest.slice(sep + 2);
    } else {
      // Fallback: a dash separator surrounded by spaces (so hyphenated titles survive).
      const dm = rest.match(/^(.+?)\s+[—–-]\s+(.+)$/);
      if (dm) {
        title = dm[1];
        summary = dm[2];
      }
    }
    title = title.trim().replace(/\*\*/g, "");
    if (title) out.push({ title, summary: summary.trim() });
  }
  return out;
}

/**
 * Learn module — structured curriculum tracks per round. Pick a round, get an
 * ordered set of lessons anchored to your résumé gaps, and work through them
 * with progress that's remembered between sessions.
 */
export default function LearnModule({
  nav,
  rounds,
  hasResume,
  resumeName,
}: {
  nav: ReactNode;
  rounds: Round[];
  hasResume: boolean;
  resumeName?: string;
}) {
  const [view, setView] = useState<"picker" | "track" | "lesson">("picker");
  const [round, setRound] = useState("general");
  const [level, setLevel] = useState("mid");
  const [track, setTrack] = useState<Track | null>(null);
  const [trackBusy, setTrackBusy] = useState(false);
  const [trackErr, setTrackErr] = useState<string>();
  const [done, setDone] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  const [lesson, setLesson] = useState("");
  const [lessonBusy, setLessonBusy] = useState(false);
  const [, force] = useState(0); // re-render when localStorage badges change

  const resumeReady = hasResume || !!resumeName;
  const roundLabel = rounds.find((r) => r.id === round)?.label ?? "Round";

  // Progress badge on each round card in the picker.
  const badge = (id: string): ReactNode => {
    const t = loadJSON<Track | null>(trackKey(id), null);
    if (!t?.lessons?.length) return null;
    const d = loadJSON<number[]>(progKey(id), []);
    return (
      <span className="absolute right-2.5 top-2.5 rounded-full bg-violet/15 px-1.5 py-0.5 text-[10px] font-medium text-violet2 tnum">
        {d.length}/{t.lessons.length}
      </span>
    );
  };

  const generateTrack = async (force = false) => {
    setTrackErr(undefined);
    if (!force) {
      const cached = loadJSON<Track | null>(trackKey(round), null);
      if (cached?.lessons?.length) {
        setTrack(cached);
        setDone(loadJSON<number[]>(progKey(round), []));
        return;
      }
    }
    setTrack(null);
    setTrackBusy(true);
    try {
      const { result } = await askStream({ action: "learnTrack", params: { round, level } }, () => {});
      const lessons = parseTrack(result ?? "");
      if (!lessons.length) throw new Error("Couldn't build a track — try again.");
      const t: Track = { level, lessons };
      setTrack(t);
      saveJSON(trackKey(round), t);
      if (force) {
        // Regenerated track → clear stale progress and cached lessons.
        setDone([]);
        saveJSON(progKey(round), []);
        lessons.forEach((_, i) => localStorage.removeItem(lessonKey(round, i)));
      } else {
        setDone(loadJSON<number[]>(progKey(round), []));
      }
    } catch (e) {
      setTrackErr((e as Error).message);
    } finally {
      setTrackBusy(false);
    }
  };

  const openTrack = async () => {
    setView("track");
    await generateTrack(false);
  };

  const lessonRef = useRef<HTMLDivElement>(null);
  const openLesson = async (i: number) => {
    if (!track) return;
    setActive(i);
    setView("lesson");
    setLesson("");
    const cached = localStorage.getItem(lessonKey(round, i));
    if (cached) {
      setLesson(cached);
      return;
    }
    setLessonBusy(true);
    let acc = "";
    try {
      await askStream({ action: "learnLesson", params: { round, level, topic: track.lessons[i].title } }, (ev: ClaudeEvent) => {
        if (ev.type === "assistant") {
          const t = eventText(ev);
          if (t) {
            acc = (acc + " " + t).trim();
            setLesson(acc);
          }
        }
      });
      if (acc) localStorage.setItem(lessonKey(round, i), acc);
    } catch (e) {
      setLesson(`Couldn't load this lesson (${(e as Error).message}). Try again.`);
    } finally {
      setLessonBusy(false);
    }
  };

  useEffect(() => {
    lessonRef.current?.scrollTo({ top: 0 });
  }, [active]);

  const markDone = () => {
    if (done.includes(active)) return done;
    const next = [...done, active].sort((a, b) => a - b);
    setDone(next);
    saveJSON(progKey(round), next);
    force((n) => n + 1);
    return next;
  };

  const completeAndNext = () => {
    markDone();
    if (track && active < track.lessons.length - 1) openLesson(active + 1);
    else setView("track");
  };

  const total = track?.lessons.length ?? 0;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  // ---- Picker ----
  if (view === "picker") {
    return (
      <Shell nav={nav}>
        <div className="mx-auto max-w-2xl px-6 py-10">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-amber">Level 1 · Learn</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-bright">
            Build the <span className="text-aurora">foundation</span>
          </h1>
          <p className="mt-3 mb-8 leading-relaxed text-muted">
            Pick a track. We'll map an ordered set of lessons{resumeReady ? " aimed at the gaps in your résumé" : ""} so
            you walk in knowing the fundamentals cold.
          </p>

          {!resumeReady && (
            <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-edge bg-panel2/50 p-4 text-sm text-muted">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-amber" />
              <span>
                Tip: upload your résumé in <span className="text-soft">Mock Interview</span> and your lessons get
                personalized to your real background. You can still learn the fundamentals without it.
              </span>
            </div>
          )}

          <div className="hairline rounded-3xl p-6 sm:p-8">
            <RoundSelect rounds={rounds} round={round} setRound={setRound} level={level} setLevel={setLevel} badge={badge} />
            <button
              onClick={openTrack}
              className="btn-primary mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base"
            >
              <BookOpen size={18} /> Open {roundLabel} track
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- Track outline ----
  if (view === "track") {
    return (
      <Shell nav={nav}>
        <div className="mx-auto max-w-2xl px-6 py-10">
          <button
            onClick={() => setView("picker")}
            className="mb-6 inline-flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-4 py-2 text-sm text-soft transition-colors hover:border-violet hover:text-bright"
          >
            <ArrowLeft size={15} /> All tracks
          </button>

          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl text-amber" style={{ background: "rgba(255,177,61,.12)" }}>
              <GraduationCap size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-bright">{roundLabel} track</h1>
              <p className="text-sm capitalize text-faint">{level} level</p>
            </div>
            <button
              onClick={() => generateTrack(true)}
              disabled={trackBusy}
              className="flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-3.5 py-2 text-sm text-soft transition-colors hover:border-coral hover:text-coral disabled:opacity-50"
              title="Regenerate this track"
            >
              <RefreshCw size={14} className={trackBusy ? "animate-spin" : ""} /> Regenerate
            </button>
          </div>

          {track && (
            <div className="mb-6">
              <div className="mb-1.5 flex items-center justify-between text-xs text-faint">
                <span>{done.length} of {total} complete</span>
                <span className="tnum">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel2">
                <div className="h-full rounded-full bg-gradient-to-r from-amber via-coral to-violet transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {trackBusy && <TrackSkeleton />}
          {trackErr && (
            <div className="rounded-2xl border border-bad/40 bg-bad/5 p-5 text-sm text-soft">
              {trackErr}{" "}
              <button onClick={() => generateTrack(true)} className="ml-1 text-coral underline">
                Retry
              </button>
            </div>
          )}

          {track && !trackBusy && (
            <ol className="space-y-3">
              {track.lessons.map((l, i) => {
                const isDone = done.includes(i);
                const isNext = !isDone && i === (done.length ? Math.max(...done) + 1 : 0);
                return (
                  <li key={i}>
                    <button
                      onClick={() => openLesson(i)}
                      className={`spotlight flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                        isNext ? "hairline glow-iris" : "card-base hover:border-violet"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                          isDone ? "bg-teal/15 text-teal" : isNext ? "bg-coral/15 text-coral" : "bg-panel2 text-faint"
                        }`}
                      >
                        {isDone ? <Check size={15} /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-display font-semibold text-bright">
                          {l.title}
                          {isNext && <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-medium text-coral">Up next</span>}
                        </span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-muted">{l.summary}</span>
                      </span>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-faint" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </Shell>
    );
  }

  // ---- Lesson ----
  const cur = track?.lessons[active];
  const isLast = track ? active >= track.lessons.length - 1 : true;
  return (
    <Shell nav={nav}>
      <div ref={lessonRef} className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <button
            onClick={() => setView("track")}
            className="mb-6 inline-flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-4 py-2 text-sm text-soft transition-colors hover:border-violet hover:text-bright"
          >
            <ArrowLeft size={15} /> {roundLabel} track
          </button>

          <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-amber">
            Lesson {active + 1} of {track?.lessons.length ?? "?"}
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight text-bright">{cur?.title}</h1>
          <p className="mt-2 leading-relaxed text-muted">{cur?.summary}</p>

          <div className="mt-7 rounded-3xl card-base p-6 sm:p-7">
            {lessonBusy && !lesson ? (
              <div className="flex items-center gap-2.5 text-sm text-muted">
                <Loader2 size={16} className="animate-spin text-coral" />
                <span className="shimmer">Writing your lesson…</span>
              </div>
            ) : (
              <Markdown text={lesson} />
            )}
            {lessonBusy && lesson && (
              <span className="mt-2 inline-block h-4 w-2 animate-pulse rounded-sm bg-coral align-middle" />
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={completeAndNext}
              disabled={lessonBusy}
              className="btn-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm disabled:opacity-50"
            >
              {done.includes(active) ? <Check size={16} /> : <Circle size={16} />}
              {isLast ? "Mark complete & finish" : "Mark complete & next lesson"}
            </button>
            {!isLast && (
              <button
                onClick={() => openLesson(active + 1)}
                disabled={lessonBusy}
                className="flex items-center gap-1.5 rounded-xl border border-edge2 bg-panel px-5 py-3 text-sm text-soft transition-colors hover:border-violet hover:text-bright disabled:opacity-50"
              >
                Skip <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-ink text-soft">
      {nav}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function TrackSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl card-base p-4">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-panel2" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-panel2" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-panel2/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
