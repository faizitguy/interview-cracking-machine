import { Fragment, type ReactNode } from "react";

/**
 * Tiny, dependency-free markdown renderer — just enough for the Learn lessons
 * and Practice feedback that Claude returns: headings, bullet lists, fenced and
 * inline code, bold, and paragraphs. Styled to match the Aurora Obsidian theme.
 */
export default function Markdown({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`md ${className}`}>{render(text)}</div>;
}

/** Inline: **bold** and `code`. */
function inline(s: string, key: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[2] != null) {
      parts.push(
        <strong key={`${key}-b${i}`} className="font-semibold text-bright">
          {m[2]}
        </strong>,
      );
    } else if (m[3] != null) {
      parts.push(
        <code key={`${key}-c${i}`} className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[0.85em] text-violet2">
          {m[3]}
        </code>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

function render(text: string): ReactNode {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let key = 0;

  const flushList = () => {
    if (!list.length) return;
    const items = [...list];
    out.push(
      <ul key={`ul${key++}`} className="my-2.5 space-y-1.5 pl-1">
        {items.map((li, i) => (
          <li key={i} className="flex gap-2.5 text-soft leading-relaxed">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-coral/70" />
            <span>{inline(li, `li${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw;
    if (/^```/.test(line.trim())) {
      if (code === null) {
        flushList();
        code = [];
      } else {
        out.push(
          <pre
            key={`pre${key++}`}
            className="my-3 overflow-x-auto rounded-xl border border-edge bg-ink2/80 p-3.5 text-[0.82rem] leading-relaxed text-soft"
          >
            <code className="font-mono">{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      }
      continue;
    }
    if (code !== null) {
      code.push(line);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const cls =
        level <= 2
          ? "font-display text-base font-semibold text-bright mt-4 mb-1.5 flex items-center gap-2"
          : "font-display text-sm font-semibold text-soft mt-3 mb-1";
      out.push(
        <div key={`h${key++}`} className={cls}>
          {level <= 2 && <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-amber to-coral" />}
          {inline(h[2], `h${key}`)}
        </div>,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }

    if (!line.trim()) {
      flushList();
      continue;
    }

    flushList();
    out.push(
      <p key={`p${key++}`} className="my-2 leading-relaxed text-soft">
        {inline(line, `p${key}`)}
      </p>,
    );
  }
  flushList();
  if (code) {
    out.push(
      <pre key={`pre${key++}`} className="my-3 overflow-x-auto rounded-xl border border-edge bg-ink2/80 p-3.5 text-[0.82rem] text-soft">
        <code className="font-mono">{code.join("\n")}</code>
      </pre>,
    );
  }
  return <Fragment>{out}</Fragment>;
}
