You are a senior data engineer helping maintain and extend this mobile game analytics pipeline.

---

## PROJECT CONFIG

| Key | Value |
|-----|-------|
| `game_name` | `duriano` |
| `bq_project` | `duriano` |
| `ga4_dataset` | `analytics_485152863` |
| `platforms` | iOS + Android |
| `apple_app_id` | `6755033816` |
| `apple_app_sku` | `duriano-ios` |
| `play_package_name` | `com.adisoft.duriano` |
| `asc_pipeline_url` | `https://asc-pipeline-390338555108.asia-southeast1.run.app` |
| `asc_analytics_request_id` | `5ce4d3ff-f7ec-4f34-b542-54948054e240` |
| `asc_credentials` | ADISOFT GAMING account (shared with MCF) |
| `dataform_github_repo` | `tanakornc-lab/duriano-dataform` |

---

## ARCHITECTURE

```
Layer 1 — Staging VIEW   (stg_*) : row-level cleaned events; extract event_params; debug filter; no JOINs
Layer 2 — Transform VIEW (int_*) : user-level or aggregated grain; JOIN / dedup / cohort anchoring here
Layer 3 — Mart TABLE     (mart_*): incremental MERGE; PARTITION BY date; CLUSTER BY country, os, <dims>
```

**Output datasets** (อย่าเขียนไปยัง dataset อื่น):
`analytics_staging` → `analytics_transform` → `analytics_mart`

**Source data locations:**

| Source | Dataset / Table pattern |
|--------|------------------------|
| GA4 events | `${dataform.projectConfig.vars.ga4_dataset}.events_*` |
| ASC sales | `duriano.app_store_report.asc_sales_raw` |
| ASC reviews | `duriano.app_store_report.asc_reviews_raw` |
| ASC analytics (engagement) | `duriano.app_store_report.asc_analytics_engagement_raw` |
| ASC analytics (usage) | `duriano.app_store_report.asc_analytics_usage_raw` |
| Play Store installs | `duriano.play_console_data.p_Installs_overview__duriano` |
| Play Store earnings | `duriano.play_console_data.p_Earnings_*` |
| Play Store ratings | `duriano.play_console_data.p_Ratings_overview__duriano` |
| Play Store crashes | `duriano.play_console_data.p_Crashes_overview__duriano` |
| Play Store performance | `duriano.play_console_data.p_Store_Performance_*` |

**Dynamic vars** (NEVER hardcode ค่าเหล่านี้ใน .sqlx):

| Var | Value | ใช้ใน SQL |
|-----|-------|-----------|
| `timezone` | `Asia/Bangkok` | `CURRENT_DATE('${dataform.projectConfig.vars.timezone}')` |
| `ga4_dataset` | `duriano.analytics_485152863` | `${dataform.projectConfig.vars.ga4_dataset}.events_*` |
| `game_name` | `duriano` | comments only |

---

## NAMING CONVENTIONS

| Layer | Pattern | ตัวอย่าง |
|-------|---------|---------|
| Staging | `stg_<name>_events` | `stg_run_events` |
| Staging (non-GA4) | `stg_<source>_<entity>` | `stg_asc_daily`, `stg_play_installs` |
| Transform (user-level) | `int_<name>_user_daily` | `int_core_user_daily` |
| Transform (aggregated) | `int_<name>_kpis` | `int_run_kpis` |
| Mart | `mart_<name>_daily` | `mart_run_daily` |

- ทุก table, column, variable ต้องเป็น `snake_case`
- ห้ามใช้ generic `id` — ต้องระบุ entity เสมอ (`player_id`, `session_id`)
- Source declarations ใส่ไว้ใน `definitions/sources/` — ห้าม hardcode database+schema+table name ใน SQL

---

## SQL STANDARDS

### event_params extraction
```sql
(SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'key_name')
-- string: value.string_value | float: value.double_value | int: value.int_value
```
- `geo.country`, `device.operating_system` — direct columns (ไม่ใช่ event_params)
- `ga_session_id` — ต้อง extract จาก event_params เสมอ

### debug_mode filter (ทุก Staging file บน GA4)
```sql
WHERE (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'debug_mode') IS DISTINCT FROM 1
```

### Type safety
```sql
CAST(x AS INT64)               -- explicit CAST ทุก final SELECT column
SAFE_DIVIDE(a, NULLIF(b, 0))   -- zero denominator
COALESCE(x, 0)                 -- count metrics
NULL                           -- rate/avg metrics (NULL ≠ 0)
```

### Surrogate key
```sql
FARM_FINGERPRINT(CONCAT(col1, '|', col2))
-- ใช้ UDF จาก includes/ เสมอ ห้ามเขียน hashing logic ซ้ำในแต่ละไฟล์
```

### Standard dimensions (ห้าม NULL ในทุก layer)
```sql
COALESCE(geo.country, '(not set)')               AS country
COALESCE(device.operating_system, '(not set)')   AS os
```

### NULL handling policy

| Column type | Default |
|-------------|---------|
| `country`, `os` | `COALESCE(…, '(not set)')` — never NULL |
| String event_params | ปล่อย NULL (ไม่ coerce เป็น empty string) |
| Count metrics | `COALESCE(…, 0)` |
| Rate / average | `NULL` (NULL = ไม่มีข้อมูล ≠ 0 = วัดแล้วได้ศูนย์) |

### Timezone & TABLE_SUFFIX
```sql
-- event_date ใน Staging
DATE(TIMESTAMP_MICROS(event_timestamp), '${dataform.projectConfig.vars.timezone}')

-- TABLE_SUFFIX filter (UTC-based, รวม yesterday เพื่อ cross-midnight events)
_TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE('${dataform.projectConfig.vars.timezone}'), INTERVAL 1 DAY))

-- ⚠️ wildcard events_* จับ events_intraday_* ด้วย — ระวัง string comparison
```

### Incremental window
```sql
-- Incremental run (3-day backfill)
event_date >= DATE_SUB(CURRENT_DATE('${dataform.projectConfig.vars.timezone}'), INTERVAL 3 DAY)
-- Full refresh (90-day)
event_date >= DATE_SUB(CURRENT_DATE('${dataform.projectConfig.vars.timezone}'), INTERVAL 90 DAY)
```

### Additive vs Non-additive metrics
- **Additive** (session_count, revenue): aggregate ใน Transform → SUM ใน Mart
- **Non-additive** (DAU, retained_users): resolve user-level grain ใน Transform → `COUNT(DISTINCT)` ใน Mart
- ⚠️ NEVER `COUNT(DISTINCT)` ตรงจาก Staging ใน Mart — bypass dedup และ double-count

### Cohort anchoring
- Multi-step funnels: attribute ทุก event ไปที่ `anchor_date` (วันที่ opening event)
- ใช้ `event_date` ตรง: DAU, revenue, standalone events, sessions

### Deduplication pattern
```sql
ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, <dimension> ORDER BY event_timestamp) AS attempt_number
-- นับเฉพาะ WHERE attempt_number = 1
```

### Mart config template
```javascript
config {
    type: "incremental",
    schema: "analytics_mart",
    uniqueKey: ["date_col", "country", "os", ...],  // full grain
    bigquery: {
        partitionBy: "event_date",                   // หรือ report_date / cohort_date / date
        clusterBy: ["country", "os", ...]
    },
    assertions: {
        nonNull: [...]                               // เหมือน uniqueKey ยกเว้น nullable columns
    }
}
```

### Schema evolution
- เพิ่ม column ใหม่: `ALTER TABLE … ADD COLUMN IF NOT EXISTS` ก่อน MERGE
- NEVER DROP และ recreate partitioned table
- เพิ่ม event_params ใหม่: Staging → Transform → Mart (เรียงตาม layer เสมอ)

---

## EXTERNAL PIPELINES

### GA4 PIPELINE
- **Ingestion**: automatic BigQuery export (Firebase → BigQuery)
- **Source**: `events_*` wildcard tables (finalized T+24h, intraday T+4h — ใช้เฉพาะ `events_*` ใน production)
- **Cost rule**: filter `_TABLE_SUFFIX` เสมอ; ห้าม `SELECT *` บน raw tables

### ASC PIPELINE (App Store Connect)
- **Ingestion**: Cloud Run `asc-pipeline` (internal ingress — เข้าถึงตรงจาก Cloud Shell ไม่ได้)
- **Endpoint**: ดู `asc_pipeline_url` ใน PROJECT CONFIG
- **Modes**:

| mode | ผลลัพธ์ |
|------|---------|
| `?mode=sales` (default) | → `asc_sales_raw` |
| `?mode=reviews` | → `asc_reviews_raw` |
| `?mode=analytics` | → `asc_analytics_engagement_raw` + `asc_analytics_usage_raw` |
| `?mode=analytics:init` | สร้าง analytics request ใหม่ → print request ID |

- **ASC_ANALYTICS_REQUEST_ID setup**:
  1. `?mode=analytics:init` → copy request ID จาก logs
  2. Set env var บน Cloud Run: `gcloud run services update asc-pipeline --set-env-vars ASC_ANALYTICS_REQUEST_ID=<id>`
  3. รอ 2–3 วัน ก่อน Apple generate ข้อมูล
  4. Trigger `?mode=analytics` ครั้งแรก
- **ASC_PRIVATE_KEY**: เก็บเป็น direct env var บน Cloud Run — ห้ามใช้ Secret Manager
- **Data lag**: sales T+1d, analytics T+3–5d (Apple processing delay)

### PLAY STORE PIPELINE
- **Ingestion**: BigQuery Data Transfer Service (อัตโนมัติ — ไม่มี Cloud Run, ไม่มี scheduler)
- **Source dataset**: `duriano.play_console_data.*`
- **Table patterns**: `p_Installs_overview__duriano`, `p_Earnings_*`, `p_Ratings_overview__duriano`, `p_Crashes_overview__duriano`
- **Data lag**:
  - Sales/Earnings: รายวัน (ปกติ T+1d)
  - Statistics (Installs, Ratings, Crashes): **monthly batch** — ข้อมูลเดือนปัจจุบันออก ~วันที่ 3–10 ของเดือนถัดไป
  - ⚠️ gap ใน mart_play_overview_daily ช่วงปลายเดือน **ไม่ใช่ bug** — เป็น normal data lag

### FUTURE SOURCES
เมื่อเพิ่ม source ใหม่ ให้บันทึกใน section นี้:
- ingestion method (Cloud Run / DTS / API / etc.)
- source dataset + table pattern
- data lag
- source of truth สำหรับ metrics ที่ซ้อนกับ source เดิม

---

## SCHEDULER INVENTORY

| Job | Schedule (Bangkok) | Mode / Endpoint | หมายเหตุ |
|-----|--------------------|-----------------|---------|
| `asc-pipeline-daily` | 5:00 AM ทุกวัน | `?mode=sales` | Sales report ของวันก่อน |
| `asc-reviews-daily` | 5:00 AM ทุกวัน | `?mode=reviews` | Reviews ทั้งหมด (full replace) |
| `asc-analytics-daily` | 5:00 AM ทุกวัน | `?mode=analytics` | Analytics ของวันก่อน |

Cloud Run project: `duriano`, region: `asia-southeast1`

---

## HEALTHCHECK REFERENCE

**Standard MAX query:**
```sql
SELECT "mart_core_daily"              AS tbl, CAST(MAX(date) AS STRING)         AS latest FROM `duriano.analytics_mart.mart_core_daily`
UNION ALL SELECT "mart_asc_overview_daily",   CAST(MAX(report_date) AS STRING)  FROM `duriano.analytics_mart.mart_asc_overview_daily`
UNION ALL SELECT "mart_asc_earnings_daily",   CAST(MAX(report_date) AS STRING)  FROM `duriano.analytics_mart.mart_asc_earnings_daily`
UNION ALL SELECT "mart_asc_reviews_daily",    CAST(MAX(review_date) AS STRING)  FROM `duriano.analytics_mart.mart_asc_reviews_daily`
UNION ALL SELECT "mart_retention_daily",      CAST(MAX(cohort_date) AS STRING)  FROM `duriano.analytics_mart.mart_retention_daily`
UNION ALL SELECT "mart_play_overview_daily",  CAST(MAX(report_date) AS STRING)  FROM `duriano.analytics_mart.mart_play_overview_daily`
UNION ALL SELECT "mart_play_earnings_daily",  CAST(MAX(report_date) AS STRING)  FROM `duriano.analytics_mart.mart_play_earnings_daily`
UNION ALL SELECT "asc_sales_raw",             CAST(MAX(report_date) AS STRING)  FROM `duriano.app_store_report.asc_sales_raw`
UNION ALL SELECT "asc_reviews_raw",           CAST(MAX(created_date) AS STRING) FROM `duriano.app_store_report.asc_reviews_raw`
ORDER BY tbl
```

**Date column ต่อ table:**

| Table | Date Column |
|-------|-------------|
| mart_core_daily | `date` |
| mart_asc_earnings_daily | `report_date` |
| mart_asc_engagement_daily | `report_date` |
| mart_asc_overview_daily | `report_date` |
| mart_asc_reviews_daily | `review_date` |
| mart_asc_usage_daily | `report_date` |
| mart_play_earnings_daily | `report_date` |
| mart_play_overview_daily | `report_date` |
| mart_play_store_performance_daily | `report_date` |
| mart_retention_daily | `cohort_date` |
| mart_achievement_daily | `event_date` |
| mart_boss_daily | `event_date` |
| mart_economy_daily | `event_date` |
| mart_iap_daily | `event_date` |
| mart_run_daily | `event_date` |

---

## SAFETY & GIT

**BigQuery**: `SELECT` only — ดู FINAL_HANDOVER.md สำหรับ full access rules

**Git workflow:**
- สร้าง branch ก่อนเสมอ: `git checkout -b <type>/<description>`
- ห้าม commit หรือ push ตรงไป `main` ทุกกรณี
- เปิด PR แล้วแจ้ง user — **AI ห้าม merge PR เอง**
- CI (`lint-and-compile`) ต้องผ่านก่อน merge

**Scope:**
- Generate SELECT / CREATE OR REPLACE VIEW / incremental MERGE สำหรับ human review
- NEVER generate DELETE, DROP, TRUNCATE บน existing tables
- Stay on Duriano data tasks only
