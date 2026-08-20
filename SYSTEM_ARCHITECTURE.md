# SYSTEM_ARCHITECTURE.md — Duriano Data Platform

> **สถานะเอกสาร:** เอกสารมีชีวิต (living document) — อัปเดตทุกครั้งที่จบ Phase หรือมีการเปลี่ยนโครงสร้าง
> **สร้างจาก:** การสรุปสถานะจริง ณ 10 ส.ค. 2026 — ทุกข้อมูลในไฟล์นี้มีหลักฐานจากระบบ ไม่มีการเดา
> **ใช้คู่กับ:** CLAUDE.md (กฎ pipeline) และ WORKLOG.md (ประวัติการทำงานรายวัน)
> **วิธีใช้กับ AI:** แนบไฟล์นี้เปิดทุก session ใหม่ เพื่อให้ AI รู้สภาพจริงของระบบโดยไม่ต้องพึ่งความจำของ session เก่า

---

## 1. ภาพรวมระบบ (สถานะ ณ 10 ส.ค. 2026)

```
[Duriano Game (Firebase/GA4)]
        │
        └─ GA4 → BigQuery Export ──→ duriano.analytics_485152863 (raw, events_YYYYMMDD)
        │
        ▼  [ยังไม่มี event-driven trigger — รันผ่าน Dataform UI / Manual]
analytics_staging  (6 views,  stg_*)
        → analytics_transform (8 views, int_*)
        → analytics_mart      (7 tables, mart_*, partition: event_date, cluster: country/os/...)
        │
        ▼
[ยังไม่มี BI layer — รอ custom events ถึง production ก่อน]
```

**สถานะ pipeline:** ไฟล์ครบทุกชั้น — รอ game team deploy custom events สู่ production ก่อนรัน execution ครั้งแรก

---

## 2. รายการทรัพยากรจริง (Inventory)

### 2.1 BigQuery Project & Datasets

| Dataset | บทบาท | สถานะ |
|---|---|---|
| `duriano.analytics_485152863` | GA4 raw export (property 485152863) | ✅ ใช้งาน — ห้ามแตะ |
| `duriano.analytics_staging` | ชั้น Staging (6 views: stg_*) | ✅ พร้อมใช้ (รอ custom events) |
| `duriano.analytics_transform` | ชั้น Transform (8 views: int_*) | ✅ พร้อมใช้ (รอ custom events) |
| `duriano.analytics_mart` | ชั้น Mart (7 tables — partition + cluster) | ✅ พร้อมใช้ (รอ custom events) |

> ⚠️ Duriano มี 1 BigQuery project เท่านั้น (ต่างจาก MCF ที่มี SIT/UAT/Prod แยกกัน)

### 2.2 ไฟล์ pipeline ทั้งหมด (ณ 10 ส.ค. 2026)

**Staging — 6 views (`analytics_staging`)**

| ไฟล์ | Events ที่ครอบคลุม | สถานะ events |
|---|---|---|
| `stg_core_events.sqlx` | `session_start`, `first_open`, `user_engagement` | ✅ IMPLEMENTED |
| `stg_run_events.sqlx` | `level_start`, `boss_encounter`, `boss_result`, `level_end` | 🔲 DESIGN |
| `stg_mode_events.sqlx` | `mode_select` | 🔲 DESIGN |
| `stg_economy_events.sqlx` | `earn_virtual_currency`, `spend_virtual_currency` | 🔲 DESIGN |
| `stg_iap_events.sqlx` | `purchase`, `restore_purchase`, `paywall_impression` | 🔲 DESIGN |
| `stg_achievement_events.sqlx` | `unlock_achievement` | 🔲 DESIGN |

**Transform — 8 views (`analytics_transform`)**

| ไฟล์ | grain | ขึ้นจาก |
|---|---|---|
| `int_core_kpis.sqlx` | date × country × os | stg_core_events |
| `int_retention_kpis.sqlx` | user × cohort_date | stg_core_events |
| `int_runs.sqlx` | 1 row per run_id | stg_run_events |
| `int_run_kpis.sqlx` | date × country × os × game_mode × hero × weapon × trail × difficulty × result × cause_of_death | int_runs + stg_mode_events |
| `int_boss_kpis.sqlx` | date × country × os × boss_id × result | stg_run_events |
| `int_economy_kpis.sqlx` | date × country × os × economy_type × item_name | stg_economy_events |
| `int_iap_kpis.sqlx` | date × country × os × event_type × item_name × offer_id | stg_iap_events |
| `int_achievement_kpis.sqlx` | date × country × os × achievement_category × achievement_id | stg_achievement_events |

**Mart — 7 tables (`analytics_mart`, incremental MERGE)**

| ไฟล์ | uniqueKey | METRIC_DEFINITIONS §§ |
|---|---|---|
| `mart_core_daily.sqlx` | date, country, os | §1 §2 |
| `mart_retention_daily.sqlx` | cohort_date, day_n, country, os | §2 |
| `mart_run_daily.sqlx` | event_date, country, os, game_mode, hero_id, weapon_id, trail_id, difficulty, result, cause_of_death | §3 §4 §6 §7 |
| `mart_boss_daily.sqlx` | event_date, country, os, boss_id, result | §5 |
| `mart_economy_daily.sqlx` | event_date, country, os, economy_type, item_name | §8 |
| `mart_iap_daily.sqlx` | event_date, country, os, event_type, item_name, offer_id | §9 §11 |
| `mart_achievement_daily.sqlx` | event_date, country, os, achievement_category, achievement_id | §10 |

### 2.3 Dataform Repository

| รายการ | ค่า |
|---|---|
| Repo GitHub | `tanakornc-lab/duriano-dataform` (branch `main`) |
| BigQuery project | `duriano` |
| Region | asia-southeast1 |
| Orchestration | ⚠️ ยังไม่มี — รันผ่าน Dataform UI (manual) |
| Scheduled MERGE | daily 07:00 Asia/Bangkok (target, ยังไม่ได้ setup) |

### 2.4 GitHub Repo: `tanakornc-lab/duriano-dataform`

```
CLAUDE.md                              ← กฎ pipeline และ standards
TRACKING_PLAN.md                       ← 15 events (3 IMPLEMENTED, 12 DESIGN)
METRIC_DEFINITIONS.md                  ← §1–§11 KPI definitions
FINAL_HANDOVER.md                      ← handover checklist
WORKLOG.md                             ← ประวัติการทำงานรายวัน
SYSTEM_ARCHITECTURE.md                 ← ไฟล์นี้
.sqlfluff                              ← SQL linter config
.github/workflows/dataform-ci.yml      ← CI: SQLFluff lint + Dataform compile
.claude_skills/                        ← AI skills (event-schema-designer, experiment-analyst, metric-analyst)
workflow_settings.yaml                 ← Dataform vars: ga4_dataset
includes/utils.js                      ← surrogate_key() helper
definitions/staging/                   ← 6 ไฟล์ (stg_*)
definitions/transform/                 ← 8 ไฟล์ (int_*)
definitions/mart/                      ← 7 ไฟล์ (mart_*)
```

---

## 3. สถานะปัจจุบัน

| ส่วน | สถานะ | หมายเหตุ |
|---|---|---|
| Pipeline files (code) | ✅ ครบ | 21 ไฟล์ merge เข้า main แล้ว |
| Custom events (production) | 🔲 รอ game team | 12 events ยัง DESIGN — ยังไม่ถูก deploy |
| Pipeline execution ครั้งแรก | 🔲 รอ custom events | รันได้ทันทีหลัง game team deploy |
| Orchestration (event-driven) | 🔲 ยังไม่ setup | ต้อง setup Log Sink → Pub/Sub → Cloud Run เหมือน MCF |
| BI / Looker Studio | 🔲 ยังไม่เริ่ม | รอ data จริงก่อนออกแบบ dashboard |
| Branch protection / CI | 🟡 CI yml มีแล้ว | ต้องเปิด branch protection ใน GitHub Settings |

---

## 4. รายการรอจัดการ (Action Items)

### 4.1 🔴 สำคัญสุด: รอ game team deploy custom events
- 12 events ใน TRACKING_PLAN ยังเป็น DESIGN — pipeline ยังไม่มีข้อมูลจริงให้รัน
- เมื่อ game team deploy แล้ว: รัน Dataform execution → ตรวจ row counts → อัปเดต TRACKING_PLAN status เป็น IMPLEMENTED

### 4.2 🟡 Setup orchestration
- สร้าง Log Sink ดักจับ `events_*` table creation ใน `duriano.analytics_485152863`
- ต่อ Pub/Sub → Cloud Run → Dataform API (ใช้ pattern เดียวกับ MCF `dataform-trigger`)

### 4.3 🟡 เปิด branch protection
- GitHub Settings → Branches → main → require PR + CI pass ก่อน merge

### 4.4 🟢 งานต่อยอด
- สร้าง Looker Studio dashboard เมื่อมีข้อมูลจริง
- Setup alerting เมื่อ Dataform run FAILED → LINE/Slack

---

## 5. กฎการอัปเดตเอกสารนี้

1. ทุกการเปลี่ยนโครงสร้าง (dataset ใหม่, service ใหม่, ไฟล์ใหม่) ต้องบันทึกที่นี่
2. ข้อมูลทุกบรรทัดต้องมีหลักฐานจากระบบจริง — ห้ามให้ AI เติมสิ่งที่ "น่าจะมี"
3. อัปเดตขั้นต่ำ: ทุกครั้งที่ custom event เปลี่ยนสถานะ / ทุกครั้งที่จบ action item ใน §4
