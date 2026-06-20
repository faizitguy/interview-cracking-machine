import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { saveProfile, type Profile } from "../lib/api";

const LEVELS = [
  { v: "new", label: "New to it" },
  { v: "junior", label: "Junior" },
  { v: "mid", label: "Mid" },
  { v: "senior", label: "Senior" },
];

const STYLES = [
  { v: "real-world-examples", label: "Real-world examples" },
  { v: "eli5", label: "Explain like I'm 5" },
  { v: "visual-first", label: "Visual-first" },
  { v: "analogy-driven", label: "Analogy-driven" },
  { v: "first-principles", label: "First-principles" },
  { v: "concise", label: "Concise cheat-sheet" },
];

const inputCls =
  "w-full rounded-xl border border-edge bg-panel/60 px-3.5 py-2.5 text-sm text-bright placeholder:text-faint transition-colors focus:border-violet focus:outline-none";

/**
 * First-run onboarding (and later, profile editor). Collects the personalised
 * profile that every roadmap / lesson / mock is tailored to, and saves it to
 * Supabase via the bridge (POST /api/profile). PRD M0.5.
 */
export default function Onboarding({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Profile | null;
  onSaved: (p: Profile) => void;
  onCancel?: () => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.display_name ?? "");
  const [role, setRole] = useState(initial?.target_role ?? "");
  const [level, setLevel] = useState(initial?.experience_level ?? "mid");
  const [langs, setLangs] = useState((initial?.known_languages ?? []).join(", "));
  const [stack, setStack] = useState((initial?.tech_stack ?? []).join(", "));
  const [hours, setHours] = useState(initial?.hours_per_week != null ? String(initial.hours_per_week) : "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [style, setStyle] = useState(initial?.default_teaching_style ?? "real-world-examples");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>();

  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const canSave = !!(name.trim() && role.trim() && goal.trim());

  async function submit() {
    setSaving(true);
    setErr(undefined);
    try {
      const saved = await saveProfile({
        display_name: name.trim() || null,
        target_role: role.trim() || null,
        experience_level: level,
        known_languages: csv(langs),
        tech_stack: csv(stack),
        hours_per_week: hours ? Number(hours) : null,
        goal: goal.trim() || null,
        default_teaching_style: style,
      });
      onSaved(saved);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid-dots min-h-screen overflow-y-auto px-5 py-12">
      <div className="step-in card-base mx-auto w-full max-w-xl rounded-3xl p-7 sm:p-9">
        <div className="mb-6 flex items-center gap-3">
          <span className="orb h-9 w-9">
            <span className="orb-ring" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-bright">
              {editing ? "Edit your profile" : "Let's tailor everything to you"}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {editing
                ? "Update anything — your mentor adapts from here."
                : "A minute now makes every roadmap, lesson, and mock fit you."}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Faiz" />
            </Field>
            <Field label="Target role">
              <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} placeholder="AI Engineer" />
            </Field>
          </div>

          <Field label="Experience level">
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Pill key={l.v} active={level === l.v} onClick={() => setLevel(l.v)}>
                  {l.label}
                </Pill>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Languages you know" hint="comma-separated">
              <input className={inputCls} value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="Python, JavaScript" />
            </Field>
            <Field label="Tech stack" hint="comma-separated">
              <input className={inputCls} value={stack} onChange={(e) => setStack(e.target.value)} placeholder="React, Node, Postgres" />
            </Field>
          </div>

          <Field label="Hours per week" hint="how much time you can commit">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="10"
            />
          </Field>

          <Field label="Your goal">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Land an AI Engineer role at a product company in ~3 months"
            />
          </Field>

          <Field label="How should I teach you?">
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <Pill key={s.v} active={style === s.v} onClick={() => setStyle(s.v)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </Field>

          {err && <p className="text-[13px] text-bad">{err}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
              disabled={!canSave || saving}
              onClick={submit}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Start my journey"}
            </button>
            {onCancel && (
              <button className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-soft" onClick={onCancel}>
                Cancel
              </button>
            )}
            {!editing && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-faint">
                <Sparkles size={12} /> Resume import comes next
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[13px] font-medium text-soft">{label}</span>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "border-coral/40 bg-coral/10 text-bright" : "border-edge bg-panel/50 text-muted hover:text-soft"
      }`}
    >
      {children}
    </button>
  );
}
