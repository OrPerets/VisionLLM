# RAG Backlog & Delivery Plan

A step-by-step plan to add **Retrieval-Augmented Generation (RAG)** to this project: ingestion → cleaning → chunking → embeddings → vector index → hybrid retrieval → reranker → composer → citations → eval → admin/observability.

---

## 0) Executive Summary
- **Goal:** Add accurate, source-cited answers via RAG for Snowflake/dbt/Tableau and internal runbooks.
- **Non-goals:** Full fine-tune of frequently changing facts.
- **KPIs:** ≥85% answer accuracy on eval set, ≥90% citation coverage, <3% hallucination flags, P50 latency <2.5s.

---

## 1) Repo Structure Additions
- [x] Create directories:
  - `ingestion/` (ETL scripts)
  - `core/retrieval/` (retriever, reranker, composer)
  - `configs/` (retrieval, sources)
  - `eval/` (questions + grader)
- [x] Add `Makefile` targets for ingest, reindex, eval.
- **Acceptance:** `tree` shows new dirs; `make ingest` runs end-to-end (stub OK).

```bash
mkdir -p ingestion core/retrieval configs eval
````

---

## 2) Sources & Governance

* [x] Add `configs/sources.yaml` with allow-lists:

  * Snowflake docs, dbt docs, Tableau help.
* [x] Note license posture: prefer **excerpts + canonical links** if unclear.
* [ ] PII scrubbing rules for internal docs.
* **Acceptance:** `configs/sources.yaml` exists; ingestion respects allow-list.

```yaml
# configs/sources.yaml
domains:
  - product: snowflake
    allow:
      - https://docs.snowflake.com/en/*
    version_label: "2025.08"
    rate_limit_rps: 1.0
  - product: dbt
    allow:
      - https://docs.getdbt.com/docs/*
      - https://docs.getdbt.com/reference/*
    rate_limit_rps: 1.0
  - product: tableau
    allow:
      - https://help.tableau.com/current/*/en-us/*
    rate_limit_rps: 1.0
notes:
  - Prefer excerpts + links if license unclear.
```

---

## 3) Ingestion Pipeline (ETL)

**Directory:** `ingestion/`

* [x] `01_collect.py` — crawl sitemaps/APIs, save raw HTML/MD; throttle; resolve redirects.
* [x] `02_clean.py` — HTML→Markdown; keep titles, H1–H4, code fences, tables.
* [x] `03_chunk.py` — heading-aware chunks (\~1k tokens) with 10–15% overlap; preserve code fences.
* [x] `04_embed.py` — create embeddings (e.g., `intfloat/e5-large-v2` or `BAAI/bge-large-en`).
* [x] `05_index.py` — upsert chunks to vector store and lexical index; track version and `updated_at`.
* **Acceptance:** Running `make ingest` ingests ≥50 docs; duplicates de-duplicated (shingled hash).

**Chunk metadata (store per chunk):**

```json
{
  "id": "uuid",
  "url": "https://docs.snowflake.com/.../query-acceleration",
  "title": "Query Acceleration Service",
  "product": "snowflake|dbt|tableau",
  "doc_type": "concept|how-to|reference|best-practice",
  "version": "2025.08",
  "updated_at": "2025-08-01",
  "h_path": "H2:...|H3:...",
  "breadcrumbs": ["Performance","Warehouses","QAS"],
  "content_md": "markdown chunk",
  "codeblocks": [{"lang":"sql","hash":"..."}]
}
```

---

## 4) Vector Store & Indexing

**Default:** Postgres + pgvector in `infra/docker-compose.yml`.

* [x] Enable `vector` extension and tables.
* [x] Create IVFFLAT index for embeddings; GIN/BM25 index for lexical.
* **Acceptance:** `SELECT COUNT(*) FROM rag_chunks;` returns > 0; vector/lexical queries both run.

**SQL migration example**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY,
  url TEXT,
  title TEXT,
  product TEXT,
  doc_type TEXT,
  version TEXT,
  updated_at TIMESTAMPTZ,
  h_path TEXT,
  content_md TEXT,
  embedding vector(1024) -- adjust to your embedding dimension
);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS rag_chunks_lexical_idx
  ON rag_chunks USING gin (to_tsvector('english', content_md));
```

> **Option:** Snowflake VECTOR/HYBRID Search (document later; keep API pluggable).

---

## 5) Retrieval (Hybrid + Rerank)

**Directory:** `core/retrieval/`

* [x] `retriever.py` — hybrid query: BM25 (top 50) + vector (top 50) → union → **rerank** to final top-K.
* [ ] Add **diversity penalty** per domain (avoid duplicate hits from same URL).
* [x] `reranker.py` — local or API (e.g., `BAAI/bge-reranker-v2-m3`).
* [x] Config in `configs/retrieval.yaml`.
* **Acceptance:** `top_k=12`, `rerank_k=5` returns relevant, diverse chunks in logs.

```yaml
# configs/retrieval.yaml
embed_model: "intfloat/e5-large-v2"
reranker: "BAAI/bge-reranker-v2-m3"
top_k: 12
rerank_k: 5
diversity_penalty: 0.12
low_conf_threshold: 0.52
```

---

## 6) Answer Composer & API

**Backend:** `backend/`

* [ ] Add a **system prompt** for “Senior Architect: Snowflake/dbt/Tableau; cite sources; version-aware.”
* [ ] Response structure: **short answer → steps/code → alternatives/trade-offs → pitfalls → sources**.
* [x] Extend `POST /api/chat/stream` to accept:

  ```json
  {
    "message": "...",
    "use_rag": true,
    "top_k": 12,
    "low_conf_threshold": 0.52
  }
  ```
* [ ] Always include 3–5 citations with URLs; include version label when known.
* [x] **Low confidence**: ask 1 clarifying question OR show 2–3 likely options with sources.
* **Acceptance:** Answers stream with citations; logs show retrieved chunk IDs and rerank scores.

---

## 7) Tools Integration (Now & Later)

**Directory:** `backend/tools/`

* [x] Use existing `tools/sql_tools.py` for SQL format/lint in answers.
* [ ] (Later) `dbt_runner.py` for deps/tests/dry-run summaries (guarded; no destructive ops).
* [ ] (Later) `tableau_calc_lint.py` for calc/perf hints.
* [ ] (Later) `snowflake_explain.py` to parse query plans (pruning/caching hints).
* **Acceptance:** Tool outputs injected under “Steps/Code” or “Pitfalls” sections when relevant.

---

## 8) Frontend Updates

**Directory:** `frontend/`

* [x] Chat UI: show **citations** panel (title + domain + link); hover previews.
* [x] Toggle “Use RAG” in chat input (persist in conversation settings).
* [x] Visual cue for **low confidence** (ask-clarify card).
* **Acceptance:** Users can open sources from messages; RAG toggle state persists.

---

## 9) Configuration & Env Vars

* [x] `.env.example` additions:

  ```
  EMBEDDING_MODEL_ID=intfloat/e5-large-v2
  RERANKER_MODEL_ID=BAAI/bge-reranker-v2-m3
  RAG_ENABLED=true
  ```
* [ ] Merge `configs/retrieval.yaml` into runtime config; load at API start.
* **Acceptance:** Changing `top_k` or thresholds reflects without redeploy (hot reload or restart OK).

---

## 10) Docker & Make Targets

* [x] Compose: ensure Postgres is initialized with `vector` extension (init script or migration container).
* [x] Add Make targets:

  * `make ingest` (run 01→05)
  * `make reindex` (changed docs only)
  * `make eval` (run evaluator)
  * `make dev-up` / `make dev-down`
* **Acceptance:** Fresh clone can run `make dev-up` then `make ingest` and ask questions with citations.

---

## 11) Evaluation & Guardrails

**Directory:** `eval/`

* [ ] `questions.jsonl` — ≥300 Qs (how-to, design, debug, anti-patterns) for Snowflake/dbt/Tableau.
* [ ] `grader.py` — metrics: accuracy, citedness %, hallucination rate, latency.
* [ ] `run_eval.py` — CI gate: fail PR if metrics regress.
* [ ] Guardrails: refuse destructive SQL; flag version-specific behaviors.
* **Acceptance:** CI blocks regressions; dashboard shows metrics deltas per commit.

---

## 12) Admin & Observability

* [ ] Admin page: re-ingest per domain; show index freshness and doc counts.
* [ ] Structured logs: prompt hash, retrieved IDs, rerank scores, model, tokens, latency.
* [ ] Feedback loop: thumbs + reasons → store and auto-create review tasks.
* **Acceptance:** Admin can trigger re-ingest; “top failed topics” visible for triage.

---

## 13) Phased Delivery Plan

### Phase 0 — Foundation (1–2 days)

* [x] Dirs + configs + Makefile stubs
* [x] pgvector migration ready
* **DOD:** `make ingest` runs with sample sources; chunk count > 0.

### Phase 1 — Retrieval + Citations (2–4 days)

* [x] Hybrid retriever + reranker
* [x] `/api/chat/stream` supports `use_rag`
* [x] Frontend shows citations
* **DOD:** 3–5 citations per answer; relevance spot-checks pass.

### Phase 2 — Tools + Low-Confidence (2–3 days)

* [x] SQL formatter integrated
* [x] Low-confidence branch (clarify or options)
* **DOD:** Logs show low-confidence path; UX tested.

### Phase 3 — Eval Harness + Guardrails (3–5 days)

* [ ] Seed ≥300 eval questions
* [ ] CI gate on accuracy & citedness
* [ ] Destructive-op refusal paths
* **DOD:** CI protects quality; red-team tests pass.

### Phase 4 — Admin & Observability (2–3 days)

* [ ] Re-ingest controls; index freshness
* [ ] Structured logs & “top fails” board
* **DOD:** Ops can refresh sources; product can triage gaps.

### Phase 5 — Optional LoRA Fine-Tuning (later)

* [ ] Curate 3–8k instruction examples (style/FAQs); train adapters
* **DOD:** Style/consistency improves; facts still retrieved.

---

## 14) Risks & Mitigations

* Licensing: use excerpts + links; allow-list in `sources.yaml`.
* Staleness: scheduled refresh; version metadata surfaced in answers.
* Hallucinations: low-confidence handling; mandatory citations; CI evals.
* Latency: rerank only top-N; streaming responses; cache embeddings.

---

## 15) Quick Commands

```bash
# Dev stack
make dev-up
make dev-down
make logs

# Ingestion pipeline
make ingest     # full 01→05
make reindex    # changed docs only

# Evaluation
make eval
```
