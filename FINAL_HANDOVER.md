# FINAL_HANDOVER.md — Duriano Analytics Platform

**Owner:** JOEKER (tanakorn.c@adisoft.io) · **Version:** 1.0 · **Last updated:** 2026-08-10

## Purpose

This is the permanent AI handover for this repository. Any AI model (Claude, Gemini, GPT) should be able to read this file plus the documents it points to, and continue development safely with no previous chat history.

| Topic | Source of truth |
|---|---|
| Coding conventions & technical rules | `GEMINI.md` |
| Events, parameters, currency registry | `TRACKING_PLAN.md` |
| Metric definitions & SQL patterns | `METRIC_DEFINITIONS.md` |
| History, decisions, work in progress | `WORKLOG.md` |

---

## Phase 0 — Session bootstrap

**Always read:** `GEMINI.md` · `FINAL_HANDOVER.md` · latest 2 entries of `WORKLOG.md`

**Read on demand:** `TRACKING_PLAN.md` (task touches events/params) · `METRIC_DEFINITIONS.md` (task touches metrics)

---

## Project Context

| Field | Value |
|---|---|
| Game | Duriano (roguelite mobile) |
| BigQuery project | `duriano` |
| GA4 raw dataset | `duriano.analytics_485152863` |
| Dataform workspace | `duriano-production-workspace` |
| GitHub repo | `tanakornc-lab/duriano-dataform` |
| Pipeline datasets | `analytics_staging` / `analytics_transform` / `analytics_mart` |
| Timezone | `Asia/Bangkok` (GMT+7) |
| Environment | Production only (single environment) |

---

## Safety Rules (ห้ามละเมิด)

1. **BigQuery: SELECT only** — ห้าม CREATE/INSERT/UPDATE/DELETE/DROP
2. **Git: feature branch + PR เท่านั้น** — ห้าม push/merge ลง main โดยตรง
3. **Layer order:** stg_ → int_ / transform_ → mart_ เท่านั้น ห้ามข้าม layer
4. **ห้ามประดิษฐ์ event/param** ที่ไม่อยู่ใน `TRACKING_PLAN.md`
5. **DESIGN events:** ยังไม่ verified end-to-end ผ่าน BigQuery — ต้อง verify ก่อน mark IMPLEMENTED

---

## Current Pipeline Status (2026-08-10)

| File | Layer | Status |
|---|---|---|
| `definitions/staging/core_events.sqlx` | Staging | Deployed |
| `definitions/transform/core_kpis.sqlx` | Transform | Deployed |
| `definitions/transform/retention_kpis.sqlx` | Transform | Deployed |
| `definitions/mart/core_daily.sqlx` | Mart | Deployed |
| `definitions/mart/retention_daily.sqlx` | Mart | Deployed |

**ยังต้องสร้าง:** staging/transform/mart สำหรับ game-specific events (mode_select, level_start, boss_result, level_end, earn/spend_virtual_currency, unlock_achievement, paywall_impression) — รอ event verification ก่อน

---

## Evidence Precedence

1. **Production reality** — BigQuery query results, Dataform execution history
2. **Repository source** — `.sqlx`, `.yaml`, config
3. **Architecture documentation** — `GEMINI.md`
4. **Business documentation** — `TRACKING_PLAN.md`, `METRIC_DEFINITIONS.md`
