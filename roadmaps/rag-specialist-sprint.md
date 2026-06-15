---
id: rag-specialist-sprint
title: RAG Specialist Sprint Roadmap
goal: rag-specialist-sprint
nodes:
  - title: Embeddings & vector search foundations
    status: pending
    objective: Understand text embeddings, similarity metrics, and how ANN vector indexes (HNSW, IVF) work and trade off recall vs latency
    checkpoint: Embed a 1k-doc corpus and run top-k cosine search from scratch, explaining recall/latency trade-offs
    est_hours: 8
  - title: Chunking & document processing
    status: pending
    objective: Master fixed-size, recursive, and semantic chunking plus metadata extraction and their impact on retrieval
    checkpoint: Ingest a mixed PDF/markdown corpus with 3 chunking strategies and measure how each changes retrieval hits
    est_hours: 7
    depends_on: [Embeddings & vector search foundations]
  - title: Baseline RAG pipeline
    status: pending
    objective: Wire ingestion → retrieval → prompt assembly → generation into one working pipeline with a vector DB
    checkpoint: Answer questions over your corpus end-to-end with cited source chunks
    est_hours: 9
    depends_on: [Chunking & document processing]
  - title: Hybrid retrieval (dense + sparse)
    status: pending
    objective: Combine dense vectors with BM25/keyword search and fuse results (reciprocal rank fusion) for better recall
    checkpoint: Show hybrid retrieval beating pure-dense on a hand-built query set
    est_hours: 9
    depends_on: [Baseline RAG pipeline]
  - title: Reranking & retrieval precision
    status: pending
    objective: Apply cross-encoder/LLM rerankers and tune top-k to raise precision of the final context window
    checkpoint: Add a reranker and demonstrate measurable precision@k improvement over hybrid alone
    est_hours: 7
    depends_on: [Hybrid retrieval (dense + sparse)]
  - title: Query transformation & routing
    status: pending
    objective: Use query rewriting, HyDE, multi-query, and decomposition to handle vague or multi-part questions
    checkpoint: Implement query rewriting + multi-query and show improved answers on ambiguous queries
    est_hours: 7
    depends_on: [Baseline RAG pipeline]
  - title: RAG evaluation harness
    status: pending
    objective: Build an offline eval harness measuring retrieval (recall@k, MRR) and answer quality (faithfulness, relevance) with golden sets
    checkpoint: Run an automated eval over a golden Q/A set and produce a scored report you can re-run on any change
    est_hours: 10
    depends_on: [Baseline RAG pipeline]
  - title: Reducing hallucination & grounding
    status: pending
    objective: Enforce citation, context-faithfulness checks, and graceful "I don't know" behavior using your eval harness
    checkpoint: Cut unsupported-claim rate on the eval set while preserving answer coverage
    est_hours: 7
    depends_on: [RAG evaluation harness]
  - title: Advanced retrieval patterns
    status: pending
    objective: Apply parent-document, contextual/late-chunk retrieval, and metadata filtering for large heterogeneous corpora
    checkpoint: Implement parent-document retrieval and show fewer fragmented/incomplete answers
    est_hours: 8
    depends_on: [Reranking & retrieval precision, RAG evaluation harness]
  - title: Production RAG concerns
    status: pending
    objective: Handle caching, incremental re-indexing, cost/latency budgets, observability, and failure modes for a deployable service
    checkpoint: Add tracing + a caching/re-index strategy and document cost and p95 latency for the pipeline
    est_hours: 8
    depends_on: [RAG evaluation harness]
  - title: Capstone & team enablement
    status: pending
    objective: Ship an end-to-end RAG service combining hybrid retrieval, reranking, grounding, and evals, then teach it back
    checkpoint: Deliver the service with a README + eval dashboard and a short demo/writeup your team can adopt
    est_hours: 10
    depends_on: [Advanced retrieval patterns, Reducing hallucination & grounding, Production RAG concerns, Query transformation & routing]
---

## RAG Specialist Sprint

A focused 11-node path from embedding fundamentals to a production-grade, evaluated RAG service — built to make you the go-to RAG engineer on your team by 2026-08-01 at ~14 hours/week (~90 total study hours). Work the nodes in order; each `checkpoint` is the proof the node is done before moving on.
