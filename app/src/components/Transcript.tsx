import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, User } from "lucide-react";

interface Line {
  who: "interviewer" | "you";
  text: string;
}

/** Parse the appended transcript markdown ("**Interviewer:** …" / "**You:** …"). */
function parse(text: string): Line[] {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => ({
      who: /^\*\*You:\*\*/.test(b) ? ("you" as const) : ("interviewer" as const),
      text: b.replace(/^\*\*(Interviewer|You):\*\*\s*/, "").trim(),
    }));
}

const PAGE = 8;

/**
 * Compact, scrollable interview transcript with lazy rendering — only the first
 * page of turns mount; more reveal as a sentinel scrolls into view, so a long
 * conversation stays a small, contained box instead of an endless wall.
 */
export default function Transcript({ text }: { text: string }) {
  const lines = useMemo(() => parse(text), [text]);
  const [count, setCount] = useState(Math.min(PAGE, lines.length));
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(Math.min(PAGE, lines.length)), [lines.length]);

  // Reveal another page whenever the bottom sentinel enters the scroll viewport.
  useEffect(() => {
    const root = scrollRef.current;
    const node = sentinelRef.current;
    if (!root || !node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setCount((c) => Math.min(c + PAGE, lines.length));
      },
      { root, rootMargin: "120px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lines.length, count]);

  if (!lines.length) return null;
  const shown = lines.slice(0, count);
  const remaining = lines.length - count;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="transcript-box max-h-[24rem] overflow-y-auto rounded-2xl border border-edge bg-ink2/60 px-3.5 py-4 sm:px-5"
      >
        <div className="space-y-4">
          {shown.map((l, i) => {
            const you = l.who === "you";
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 ${you ? "flex-row-reverse" : ""}`}
                style={{ animation: "stepIn 0.4s var(--ease) both", animationDelay: `${Math.min(i, 8) * 30}ms` }}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                    you
                      ? "border-violet/40 bg-violet/15 text-violet2"
                      : "border-coral/30 bg-coral/10 text-coral"
                  }`}
                >
                  {you ? <User size={14} /> : <Bot size={14} />}
                </span>
                <div className={`min-w-0 max-w-[82%] ${you ? "items-end text-right" : ""} flex flex-col`}>
                  <span className="mb-1 text-[10px] uppercase tracking-[0.14em] text-faint">
                    {you ? "You" : "Interviewer"}
                  </span>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-left text-[13.5px] leading-relaxed ${
                      you
                        ? "rounded-tr-sm bg-gradient-to-br from-violet to-violet2 text-white shadow-[0_8px_24px_-12px_rgba(139,124,255,0.7)]"
                        : "rounded-tl-sm border border-edge bg-panel text-soft"
                    }`}
                  >
                    {l.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={sentinelRef} className="h-px w-full" />
          {remaining > 0 && (
            <p className="pt-1 text-center text-[11px] text-faint">Scroll to load {remaining} more…</p>
          )}
        </div>
      </div>
      {/* Soft fade so the box reads as "more below," not abruptly clipped. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-gradient-to-t from-ink2/90 to-transparent" />
    </div>
  );
}
