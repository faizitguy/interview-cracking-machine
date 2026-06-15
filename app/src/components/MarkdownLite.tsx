// Minimal markdown renderer for log bodies: ## headings, - bullets, plain text.
// (The files are the source of truth; this is just a calm read-only view.)
export default function MarkdownLite({ content }: { content: string }) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (!bullets.length) return;
    out.push(
      <ul key={key} className="space-y-1 mb-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-soft text-sm">
            <span className="text-violet2 mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush(`u${i}`);
      out.push(
        <h3 key={`h${i}`} className="text-faint text-xs uppercase tracking-wide mt-4 mb-2">
          {line.slice(3)}
        </h3>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim()) {
      flush(`u${i}`);
      out.push(
        <p key={`p${i}`} className="text-soft text-sm mb-2">
          {line}
        </p>,
      );
    }
  });
  flush("ulast");
  return <div>{out}</div>;
}
