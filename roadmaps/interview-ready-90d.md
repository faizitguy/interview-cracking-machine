---
id: interview-ready-90d
title: AI Engineer — Interview Ready 90-Day Roadmap
goal: interview-ready-90d
north_star: Land an AI Engineer role at a product company
target_date: 2026-09-13T00:00:00.000Z
hours_per_week: 14
nodes:
  - title: Python + tooling fluency
    status: in-progress
    objective: >-
      Write clean, idiomatic Python fast — typing, async, venv/uv, pytest — the
      baseline for every later node
    checkpoint: >-
      Implement a typed CLI with tests passing under pytest, written unaided in
      under 90 min
    est_hours: 12
  - title: DSA core patterns
    status: pending
    objective: >-
      Recognize and apply arrays/hashing, two-pointer, sliding window,
      stack/queue, binary search
    checkpoint: Solve 3 mediums unaided in 45 min covering 3 different patterns
    est_hours: 22
    depends_on:
      - Python + tooling fluency
  - title: 'DSA graphs, trees & DP'
    status: pending
    objective: >-
      Comfortable with BFS/DFS, recursion, backtracking, and intro dynamic
      programming
    checkpoint: Solve 2 graph/tree mediums and 1 DP medium unaided in 60 min
    est_hours: 20
    depends_on:
      - DSA core patterns
  - title: LLM fundamentals
    status: pending
    objective: >-
      Understand tokens, context windows, sampling, prompting, structured
      output, and cost/latency trade-offs
    checkpoint: >-
      Explain the full request lifecycle of an LLM call and tune a prompt to
      pass a structured-output check
    est_hours: 12
    depends_on:
      - Python + tooling fluency
  - title: RAG systems
    status: pending
    objective: >-
      Build and reason about a retrieval-augmented pipeline — chunking,
      embeddings, vector store, reranking
    checkpoint: >-
      Ship a working RAG demo over a real corpus and explain each
      chunking/retrieval trade-off
    est_hours: 22
    depends_on:
      - LLM fundamentals
  - title: Evals & observability
    status: pending
    objective: >-
      Measure LLM/RAG quality with offline evals, LLM-as-judge, and tracing of
      latency, cost, and failures
    checkpoint: >-
      Add an eval harness to the RAG demo that scores retrieval and answer
      quality on a labeled set
    est_hours: 16
    depends_on:
      - RAG systems
  - title: Agents & tool-use patterns
    status: pending
    objective: >-
      Design agent loops — tool/function calling, planning, memory, and
      guardrails against failure modes
    checkpoint: >-
      Build a multi-tool agent that completes a 3-step task reliably and
      degrades gracefully on tool errors
    est_hours: 20
    depends_on:
      - Evals & observability
  - title: LLM system design
    status: pending
    objective: >-
      Whiteboard production AI systems — ingestion, serving, caching, rate
      limits, scaling, and cost control
    checkpoint: >-
      Design a RAG-backed product feature end-to-end in 45 min, defending data
      flow and bottleneck choices
    est_hours: 16
    depends_on:
      - RAG systems
      - Agents & tool-use patterns
  - title: Capstone AI project
    status: pending
    objective: >-
      Ship one portfolio-grade app combining RAG, an agent, and evals that you
      can demo and discuss in depth
    checkpoint: >-
      Deploy the app with a README and eval results, and walk through its
      architecture in a recorded 10-min demo
    est_hours: 24
    depends_on:
      - Agents & tool-use patterns
      - LLM system design
  - title: Behavioral & storytelling
    status: pending
    objective: >-
      Tell crisp STAR stories about impact, trade-offs, and the capstone;
      research target product companies
    checkpoint: Deliver 5 STAR stories and a 2-min capstone pitch without notes
    est_hours: 8
    depends_on:
      - Capstone AI project
  - title: Mock interview gauntlet
    status: pending
    objective: >-
      Integrate everything under pressure across DSA, RAG, agents, evals, and
      system-design mocks
    checkpoint: >-
      Pass 5 mock interviews scoring >= 80%, with at least one mock per topic
      area
    est_hours: 16
    depends_on:
      - DSA graphs
      - trees & DP
      - LLM system design
      - Capstone AI project
      - Behavioral & storytelling
---
## Notes

A fundamentals-to-advanced path to the north star: **land an AI Engineer role at a product company** by **2026-09-13**, at **14 hours/week** (~13 weeks, ~180 hours total — these 11 nodes sum to ~188h, a realistic stretch).

The two tracks run in parallel: a DSA spine (coding rounds) and an AI-engineering spine (RAG → evals → agents → system design), converging in a **capstone** and a **mock-interview gauntlet** that gates readiness. Edit freely — this is a draft, not a contract.
