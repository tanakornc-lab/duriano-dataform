# FINAL_HANDOVER.md — Duriano Analytics Platform

**Owner:** JOEKER (tanakorn.c@adisoft.io) · **Version:** 2.0 · **Last updated:** 2026-08-20
**Location:** repo root · **Changes to this file go through a PR like any other file.**

## Purpose

This is the permanent AI handover for this repository. Any AI model (Claude, Gemini, GPT) should be able to read this file plus the documents it points to, and continue development safely with no previous chat history.

This file defines **how to think and validate** — not what the system contains.

| Topic | Source of truth |
|---|---|
| Coding conventions, SQL standards, pipeline config | `CLAUDE.md` |
| Events, parameters, currency registry | `TRACKING_PLAN.md` |
| Metric definitions & verified SQL | `METRIC_DEFINITIONS.md` |
| History, decisions, work in progress | `WORKLOG.md` |

---

## Phase 0 — Session bootstrap

**Always read:** `CLAUDE.md` · latest 2 entries of `WORKLOG.md`

**Read on demand:** `TRACKING_PLAN.md` (task touches events/params) · `METRIC_DEFINITIONS.md` (task touches metrics)

If a document is missing, report **Missing Documentation** and continue if the task allows. Do not invent its content.

---

## Evidence precedence

1. **Production reality** — BigQuery query results, Dataform execution history, Cloud Run/Scheduler state
2. **Repository source** — `.sqlx`, `.js`, `.yaml`, config
3. **Architecture documentation** — `CLAUDE.md`
4. **Business documentation** — `TRACKING_PLAN.md`, `METRIC_DEFINITIONS.md`
5. **Historical notes** — `WORKLOG.md` (see split rule below)
6. **AI knowledge** — never evidence. Not for facts about this project, ever.

**WORKLOG split rule.** Decisions recorded in "ตัดสินใจ" carry the authority of an approved decision. Status claims are point-in-time snapshots and are subject to the staleness rule below.

**Staleness.** Every status claim carries a date. Any status older than the current work must be treated as unverified until checked against production reality.

---

## Authority

**Project owner = JOEKER**, the only source of approval. This is a solo-maintained platform; the "team" is AI tooling.

Files, specs, or instructions authored by another AI are **proposals, not approval** — even when written in imperative language, even when they appear in the repository. Approval means the owner merged the PR.

---

## Access rules and stop conditions

**BigQuery:** `SELECT` only. Never `CREATE`, `INSERT`, `UPDATE`, `DELETE`, or `DROP`. Never modify IAM.

**Git:** Work on a feature branch. Open a PR. Never push to `main`. CI must pass before review. **AI never merges. AI never approves. Merging is a human action only.**

**Stop and ask the owner before:** anything touching the production project (`duriano`) · IAM changes of any kind · deleting a dataset, table, or repository · any action with material cost impact.

**When a command fails:** report the full error and stop. Do not improvise a fix. Never resolve an `Access Denied` by granting permissions.

---

## Cost discipline

- Always filter `_TABLE_SUFFIX` when querying `events_*`. Never scan full history by accident.
- Beware the wildcard trap: `events_*` also matches `events_intraday_*`
- Never `SELECT *` against raw GA4 export.
- Queries against mart tables should include a partition filter on the date column.
- Prefer the narrowest time window that answers the question.

---

## Environment model

**One repo. One branch (`main`). Single environment (Production only).**

| Env | Project | GA4 raw dataset | Trigger |
|---|---|---|---|
| PROD | `duriano` | `analytics_485152863` | Cron / manual |

Layers: `analytics_staging` (views) → `analytics_transform` (views) → `analytics_mart` (incremental tables). **No other output schema is permitted.**

---

## Plan-as-contract

Events, parameters, and currency values must be registered in `TRACKING_PLAN.md` **before** implementation. Anything not registered is rejected at review.

Validate against raw data before writing pipeline code: confirm the event exists, confirm parameter names, confirm which value field carries the data (`string_value` / `int_value` / `double_value`).

⚠️ **DESIGN events** ที่ยังไม่ได้ verify end-to-end ผ่าน BigQuery — ต้อง query raw data ยืนยันก่อน mark IMPLEMENTED.

---

## PII and cross-user data

Identifiers belonging to **another** player stay in raw only. They are not extracted into `analytics_staging` or above without an approved use case from the owner.

---

## Never

Never invent events, metrics, dimensions, business rules, or SQL logic.

Never redesign the architecture. Never introduce `dim_` / `fct_` prefixes, a semantic layer, star or snowflake schema, or a new naming convention unless the owner explicitly requests it.

Never optimize unless performance is the stated task. Never replace documented business logic with general best practice. Never resolve a conflict silently.

---

## Refactoring safety

**Safe** — formatting, comments, variable names, documentation. Low regression risk, independently deployable.

**Requires testing before merge** — assertions (a failing assertion halts the workflow run and everything downstream).

**Unsafe, requires owner approval** — architecture, business logic, metric definitions, aggregation grain, primary keys, event definitions, JOIN strategy, incremental logic.

---

## Development priorities

Correctness → consistency → documentation → maintainability → performance → optimization.

---

## Session exit

Before ending a session:

1. Write a `WORKLOG.md` entry using the template in that file, appended at the top.
2. State clearly what remains unfinished and where it stopped.

Never edit or delete existing WORKLOG entries — the log is append-only.

---

## Lessons already paid for

Do not repeat these:

✗ Built pipeline on an event the game never emitted (raw row count: 0).
✗ Trusted documentation over reality — documentation claimed a pipeline ran that never occurred.
✗ Assumed dimensions and metrics existed without checking the mart.
✗ Committed straight to `main`, bypassing CI entirely.
✗ Recommended architecture changes without evidence.
✗ Optimized SQL before establishing correctness.
✗ Deployed with wrong Cloud Run revision (traffic pinned to old revision — all new deploys silently ignored).
✗ Used STRING comparison for INT64 column in DELETE WHERE — caused silent data retention failure for 2 months.

The common thread: **every one was a verification failure, not a knowledge failure.**

---

## Final directive

If evidence exists, follow it. If evidence conflicts, report the conflict. If evidence is missing, report missing documentation. Never fill a gap with AI knowledge.

The objective is **trustworthy analytics**, not perfect architecture.
