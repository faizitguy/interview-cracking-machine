---
type: "AI Engineer"
level: senior
date: 2026-06-15
verdict: "Strong, well-structured opening, but the session ended before any real technical depth could be tested — promising on a tiny sample."
rubric:
  communication: 4
  depth: 2
  problem_solving: 2
  confidence: 3
---

## Summary

This was a very short session — effectively one substantive turn. Jane gave a crisp, well-organized self-introduction that led with concrete, quantified accomplishments and a clear sense of identity ("I love making LLM systems reliable and fast"). That opening was genuinely strong. However, the interview ended immediately after the first probing follow-up ("how exactly did you measure hallucinations?") before she answered, so there is almost no evidence on technical depth, problem-solving, or how she holds up under pressure. The scores below reflect that thin sample honestly: communication is well-demonstrated; the rest are provisional and lean middling because the candidate was never actually tested.

## Evidence notes

- **Communication (4):** The intro was tight and natural — five years of experience, the headline project, the quantified result, and a closing statement of motivation, all in three sentences. No rambling, good signal-to-noise. This is the one dimension with solid evidence.
- **Depth (2):** Cannot be scored higher because it was never demonstrated. She named the right components (hybrid BM25 + dense retrieval, cross-encoder reranker, eval harness in CI), which shows familiarity, but naming an architecture is not the same as explaining it. The follow-up that would have revealed real depth — *how* hallucinations were measured — went unanswered.
- **Problem_solving (2):** No problem was actually worked through in this session, so this is a default middling score, not an earned one. The 40% and "halved p95 latency" claims hint at problem-solving ability, but they were asserted, not reasoned out loud.
- **Confidence (3):** The delivery was assured and unhesitating in the intro, which reads as solid confidence. Marked at 3 rather than 4 only because she was never put under any real pressure, so composure under challenge is untested.

**Most useful thing to improve:** Be ready to immediately back up every headline metric with its measurement method. The single best answer in this whole space is the one to the question that ended the session: when you claim "cut hallucinations 40%," have the next sentence already loaded — what you measured (e.g., faithfulness against source spans, human-labeled error rate, an LLM-judge on a fixed eval set), the denominator, and the baseline. Quantified claims are only as strong as how confidently you can defend the number.
