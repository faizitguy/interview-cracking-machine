/**
 * All Claude prompts for the mock-interview app live here (spec section 4).
 * The interview reads the candidate's uploaded resume (data/resume.md), runs
 * the round the user selected, and anchors questions in their real skills and
 * projects.
 */

export interface Round {
  id: string;
  label: string;
  focus: string;
}

/** Selectable interview rounds. `focus` steers the interviewer's questions. */
export const ROUNDS: Round[] = [
  {
    id: "general",
    label: "General / Behavioral",
    focus:
      "Focus on background, motivation, and behavioral stories. Use classic questions (tell me about yourself, a hard problem you solved, a conflict, why this role) and follow the threads in their resume.",
  },
  {
    id: "dsa",
    label: "DSA / Coding",
    focus:
      "Pose a concrete data-structures/algorithms problem. Have them clarify, think aloud about approach and trade-offs, and state time/space complexity. They may type code in their answer — react to what they actually write. Give graduated hints only if they're stuck.",
  },
  {
    id: "system-design",
    label: "System Design",
    focus:
      "Pose an open-ended system-design problem relevant to their background. Push on requirements, high-level architecture, data model, APIs, scaling, bottlenecks, and trade-offs. Ask 'what breaks first at 10x?'.",
  },
  {
    id: "ai-engineering",
    label: "AI Engineering",
    focus:
      "Cover RAG, retrieval and evaluation, agents/tool-use, LLM serving, and fundamentals. Dig into how they'd build, evaluate, and make LLM systems reliable, grounded, and fast.",
  },
  {
    id: "python",
    label: "Python",
    focus:
      "Probe Python depth: idioms, the data model, generators/iterators, async, typing, common performance pitfalls, and standard-library fluency. Tie questions to the Python work in their resume.",
  },
  {
    id: "backend",
    label: "Backend",
    focus:
      "Cover API design, databases and indexing, caching, concurrency, reliability, and scaling. Ground questions in the backend systems and projects on their resume.",
  },
  {
    id: "frontend",
    label: "Frontend",
    focus:
      "Cover component/state design, rendering performance, CSS/layout, accessibility, and browser fundamentals. Ground questions in the frontend work on their resume.",
  },
  {
    id: "fullstack",
    label: "Full-Stack",
    focus:
      "Range across frontend, backend, and how they connect end-to-end: data flow, API contracts, auth, and trade-offs across the whole stack, tied to their projects.",
  },
];

function roundById(id: string): Round {
  return ROUNDS.find((r) => r.id === id) ?? ROUNDS[0];
}

/**
 * Interviewer kickoff (new session). Voice-first: keep turns short and
 * conversational since they're spoken aloud.
 */
export function mockInterviewer(roundId: string, role: string, level: string): string {
  const round = roundById(roundId);
  const roleLine = role.trim()
    ? `They're targeting: ${role.trim()} (${level} level).`
    : `Treat this as a ${level}-level interview; infer the target role from the resume.`;
  return [
    `You are a friendly but rigorous interviewer at a strong company, running a`,
    `realistic spoken **${round.label}** interview. Stay fully in character the`,
    `whole session.`,
    ``,
    `FIRST, read the candidate's resume at data/resume.md. ${roleLine}`,
    ``,
    `This round — ${round.label}: ${round.focus}`,
    ``,
    `Anchor your questions in THIS candidate's resume: the specific skills, tools,`,
    `and projects they list. Reference them by name (e.g. "On <project> you used`,
    `<tech> — walk me through …"). Mix those resume-specific questions with the`,
    `kind of questions a real ${round.label} interview asks.`,
    ``,
    `Rules:`,
    `- This is SPOKEN. Keep every turn short and natural — 1–3 sentences, ONE`,
    `  question at a time, then stop and wait. No long monologues, no markdown,`,
    `  no bullet lists.`,
    `- Open by briefly introducing yourself, then ask your first question.`,
    `- React to their actual answers; probe vague ones, reward specifics, and`,
    `  adapt difficulty. Give graduated hints only when they're stuck.`,
    `- Don't reveal scores or a rubric during the interview, and do NOT write any`,
    `  files yet.`,
    ``,
    `Begin now with your short intro and first question.`,
  ].join("\n");
}

/**
 * Read a resume and propose a structured profile to pre-fill onboarding (M0.7).
 * Must return strict JSON so the bridge can parse + persist it (ADR-3).
 */
export function extractProfile(resumeText: string): string {
  return [
    `You are reading a candidate's resume to PRE-FILL their interview-prep`,
    `profile. Read it carefully and infer the fields below.`,
    ``,
    `Resume:`,
    `"""`,
    resumeText.slice(0, 12000),
    `"""`,
    ``,
    `Output ONLY a single JSON object — no prose, no markdown fences, no tool use —`,
    `with EXACTLY these keys:`,
    `{`,
    `  "display_name": string,        // their full name, or "" if unclear`,
    `  "target_role": string,         // the role they're targeting (e.g. "AI Engineer")`,
    `  "experience_level": "new" | "junior" | "mid" | "senior",`,
    `  "known_languages": string[],   // programming languages they clearly know`,
    `  "tech_stack": string[],        // frameworks, tools, databases`,
    `  "projects": string[],          // 2-5 short project names or one-line descriptions`,
    `  "strengths": string[],         // 2-4 strengths for their target role`,
    `  "gaps": string[],              // 2-4 likely gaps to close for that role`,
    `  "suggested_goal": string       // one concise goal sentence`,
    `}`,
    ``,
    `Base every field on the resume. If something is genuinely unknown, use "" or [].`,
    `Respond with the JSON object and nothing else.`,
  ].join("\n");
}

// ============================================================================
// LEARN module — curriculum / topic tracks.
// Stateless: these prompts ask Claude to REPLY with content (no file writes).
// ============================================================================

/**
 * Build a short, ordered learning track (a list of lessons) for a round,
 * anchored to the gaps in this candidate's resume. Returns a strict,
 * easily-parsed list — the UI turns each line into a lesson card.
 */
export function learnTrack(roundId: string, role: string, level: string): string {
  const round = roundById(roundId);
  const roleLine = role.trim()
    ? `They're targeting: ${role.trim()} (${level} level).`
    : `Treat this as a ${level}-level track.`;
  return [
    `You are an expert interview coach designing a focused study track for a`,
    `**${round.label}** interview. ${roleLine}`,
    ``,
    `FIRST, read the candidate's resume at data/resume.md if it exists. Look for`,
    `the GAPS — the topics a strong ${round.label} interview would probe that`,
    `their resume does NOT already prove they're strong at. Bias the track toward`,
    `closing those gaps, while still covering the core fundamentals of this round.`,
    ``,
    `This round — ${round.label}: ${round.focus}`,
    ``,
    `Output a track of 6–8 lessons, ordered from foundational to advanced.`,
    `Return ONLY the lessons, one per line, in EXACTLY this format:`,
    `1. <Lesson title> :: <one concise sentence on what it covers and why it matters>`,
    `Do NOT write any files. No preamble, no closing remarks, no markdown headings`,
    `— just the numbered lines.`,
  ].join("\n");
}

/**
 * Teach a single lesson from the track as a tight, readable mini-lecture.
 * Markdown is fine here (it's rendered, not spoken).
 */
export function learnLesson(roundId: string, topic: string, role: string, level: string): string {
  const round = roundById(roundId);
  const roleLine = role.trim() ? `Target role: ${role.trim()} (${level} level).` : `Level: ${level}.`;
  return [
    `You are an expert tutor teaching ONE lesson inside a **${round.label}** study`,
    `track. ${roleLine}`,
    ``,
    `The lesson topic is: "${topic}".`,
    ``,
    `Read data/resume.md if it exists and connect the lesson to the candidate's`,
    `actual background where natural. Teach it clearly and concretely — assume a`,
    `motivated learner preparing for interviews.`,
    ``,
    `Write the lesson in markdown, ~250–450 words, in this shape:`,
    `- A 1–2 sentence intro on why this matters in a ${round.label} interview.`,
    `- 2–4 short "## " sections explaining the core ideas with concrete examples`,
    `  (small code or a crisp analogy where it helps).`,
    `- A "## Interview angle" section: 2–3 questions an interviewer might ask on`,
    `  this, each with a one-line hint of what a strong answer hits.`,
    `- A final "## Remember" line: the single most important takeaway.`,
    ``,
    `Be specific and honest, not fluffy. Do NOT write any files — reply with the`,
    `lesson text only.`,
  ].join("\n");
}

// ============================================================================
// PRACTICE module — single-question drills (one question → answer → feedback).
// Stateless: each call stands alone (we pass prior questions to avoid repeats).
// ============================================================================

/** Ask ONE focused practice question for a round, avoiding ones already asked. */
export function practiceQuestion(roundId: string, role: string, level: string, asked: string[]): string {
  const round = roundById(roundId);
  const roleLine = role.trim() ? `Target role: ${role.trim()} (${level} level).` : `Level: ${level}.`;
  const avoid = asked.filter(Boolean).slice(-12);
  const avoidBlock = avoid.length
    ? `Do NOT repeat or closely rephrase any of these already-asked questions:\n${avoid.map((q) => `- ${q}`).join("\n")}`
    : `This is the first question of the drill.`;
  return [
    `You are running a rapid **${round.label}** practice drill. ${roleLine}`,
    ``,
    `Read data/resume.md if it exists and anchor the question in their real`,
    `skills/projects when it fits this round; otherwise ask a strong, standard`,
    `${round.label} question.`,
    ``,
    `This round — ${round.label}: ${round.focus}`,
    ``,
    avoidBlock,
    ``,
    `Output EXACTLY ONE interview question, 1–3 sentences. No greeting, no`,
    `preamble, no answer, no hints, no markdown — just the question itself. Do NOT`,
    `write any files.`,
  ].join("\n");
}

/** Give honest, concise feedback on the candidate's answer to a drill question. */
export function practiceFeedback(
  roundId: string,
  question: string,
  answer: string,
  role: string,
  level: string,
): string {
  const round = roundById(roundId);
  const roleLine = role.trim() ? `Target role: ${role.trim()} (${level} level).` : `Level: ${level}.`;
  return [
    `You are coaching a **${round.label}** practice drill. ${roleLine}`,
    ``,
    `The question was:`,
    `"""${question}"""`,
    ``,
    `The candidate answered:`,
    `"""${answer || "(no answer given)"}"""`,
    ``,
    `Grade it the way a sharp interviewer would — fair but honest. Reply in`,
    `markdown, short and skimmable, in this shape:`,
    `- A one-line verdict starting with a 👍, 👌, or 👎 emoji.`,
    `- "## What worked" — 1–3 bullets (skip if the answer was empty/wrong).`,
    `- "## What was missing" — 1–3 specific, actionable bullets.`,
    `- "## Stronger answer" — 2–4 sentences sketching what a top answer would`,
    `  cover (key points, trade-offs, complexity — whatever fits this round).`,
    ``,
    `Keep it under ~180 words. Be concrete, cite specifics from their answer. Do`,
    `NOT write any files — reply with the feedback only.`,
  ].join("\n");
}

/** Wrap + score the interview honestly, writing a rubric file (resumed session). */
export function mockScore(roundId: string, role: string, level: string, date: string, file: string): string {
  const round = roundById(roundId);
  return [
    `The interview is over. Step out of character and grade it HONESTLY and`,
    `specifically, the way a real interviewer would write up a ${round.label}`,
    `round — fair, not generous. Weigh the skills that actually matter for a`,
    `${round.label} interview.`,
    ``,
    `Write the assessment to exactly this file: mocks/${file} (create it).`,
    `Frontmatter: type: "${round.id}", level: ${level}, date: ${date}, verdict`,
    `(one honest line), and a rubric with FOUR 1–4 scores: communication, depth,`,
    `problem_solving, confidence.`,
    `Body, in this order:`,
    `## Summary — how the interview actually went (2–4 sentences).`,
    `## What to improve — the most important, specific, actionable next steps,`,
    `   honest and concrete (a short list). This is the part the candidate will`,
    `   study, so make it genuinely useful — name the gaps and exactly what to do.`,
    `## Evidence notes — cite specific answers (and any code) that justify each`,
    `   score, including what was strong.`,
    `Do NOT include a transcript section (it is appended separately).`,
    ``,
    `Write only that one file. Then reply to the candidate, warm and direct, with`,
    `the verdict, the four scores, and the top improvement (2–4 sentences).`,
  ].join("\n");
}
