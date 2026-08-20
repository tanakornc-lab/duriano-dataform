# SYSTEM_ARCHITECTURE.md — Duriano Data Platform

> **สถานะเอกสาร:** เอกสารมีชีวิต (living document) — อัปเดตทุกครั้งที่จบ Phase หรือมีการเปลี่ยนโครงสร้าง
> **สร้างจาก:** การสรุปสถานะจริง ณ 20 ส.ค. 2026 — ทุกข้อมูลในไฟล์นี้มีหลักฐานจากระบบ ไม่มีการเดา
> **ใช้คู่กับ:** CLAUDE.md (กฎ pipeline) และ WORKLOG.md (ประวัติการทำงานรายวัน)
> **วิธีใช้กับ AI:** แนบไฟล์นี้เปิดทุก session ใหม่ เพื่อให้ AI รู้สภาพจริงของระบบโดยไม่ต้องพึ่งความจำของ session เก่า

---

## 1. ภาพรวมระบบ (สถานะ ณ 20 ส.ค. 2026)

```
[Duriano Game (Firebase/GA4)]    [App Store Connect]    [Google Play Console]
        │                               │                       │
        └─ GA4 → BigQuery Export ──→ duriano.analytics_485152863 (raw)
                                        │                       │
                        Cloud Run "asc-pipeline" (Scheduled)   │
                        (5:00 AM sales, 5:00 AM reviews,        │
                         6:00 AM analytics — internal ingress)  │
                                        ↓                       │
                              duriano.app_store_report.*  BigQuery DTS (ทุก 24h)
                              (asc_sales_raw,                    ↓
                               asc_reviews_raw,      duriano.play_console_data.*
                               asc_analytics_*_raw)  (p_Installs_*__duriano,
                                        │             p_Earnings_*,
                                        │             p_Ratings_*__duriano,
                                        │             p_Crashes_*__duriano,
                                        │             p_Store_Performance_*)
        ▼  [รันผ่าน Dataform UI (manual) — ยังไม่มี event-driven trigger]
        └──────────────────────────────────────────────────────────┘
analytics_staging  (15 views, stg_*)   ← GA4: 6, ASC: 4, Play Store: 5
        → analytics_transform  (8 views,  int_*)
        → analytics_mart      (15 tables, mart_*, partition: event_date/report_date, cluster: country/os)
        │
        ▼
[ยังไม่มี BI layer — รอ custom events ถึง production ก่อน]
```

**สถานะ pipeline:** GA4 pipeline มีข้อมูลจริง (mart_core_daily ล่าสุด 2026-08-18) — ASC pipeline ครบ 2 modes (sales/reviews) พร้อมแล้ว — Play Store pipeline พร้อมแล้ว — ASC analytics (mode=analytics) pending Part B

---

## 2. รายการทรัพยากรจริง (Inventory)

### 2.1 BigQuery Project & Datasets

| Dataset | บทบาท | สถานะ |
|---|---|---|
| `duriano.analytics_485152863` | GA4 raw export (property 485152863) | ✅ ใช้งาน — ห้ามแตะ |
| `duriano.app_store_report` | ASC raw tables (asc_sales_raw, asc_reviews_raw, asc_analytics_engagement_raw, asc_analytics_usage_raw) — เขียนโดย Cloud Run `asc-pipeline` | ✅ ใช้งาน — ห้ามแตะ |
| `duriano.play_console_data` | Google Play Console export ผ่าน BigQuery Data Transfer Service (ทุก 24h) | ✅ ใช้งาน — ห้ามแตะ |
| `duriano.analytics_staging` | ชั้น Staging (15 views: stg_*) | ✅ ใช้งาน |
| `duriano.analytics_transform` | ชั้น Transform (8 views: int_*) | ✅ ใช้งาน |
| `duriano.analytics_mart` | ชั้น Mart (15 tables — partition + cluster) | ✅ ใช้งาน — ชั้นเดียวที่ BI/Agent ควรเห็น |

> ⚠️ Duriano มี 1 BigQuery project เท่านั้น (ต่างจาก MCF ที่มี SIT/UAT/Prod แยกกัน)

### 2.2 ตารางชั้น Mart (15 ตัว)

**GA4 pipeline (7 ตัว)** — partition DAY บน `event_date`, cluster `country, os`:

| Table | uniqueKey | METRIC_DEFINITIONS §§ | สถานะข้อมูล |
|---|---|---|---|
| `mart_core_daily` | date, country, os | §1 §2 | ✅ มีข้อมูลจริง (ล่าสุด 2026-08-18) |
| `mart_retention_daily` | cohort_date, day_n, country, os | §2 | ✅ มีข้อมูลจริง (ล่าสุด 2026-08-18) |
| `mart_run_daily` | event_date, country, os, game_mode, hero_id, weapon_id, trail_id, difficulty, result, cause_of_death | §3 §4 §6 §7 | 🔲 รอ custom events |
| `mart_boss_daily` | event_date, country, os, boss_id, result | §5 | 🔲 รอ custom events |
| `mart_economy_daily` | event_date, country, os, economy_type, item_name | §8 | 🔲 รอ custom events |
| `mart_iap_daily` | event_date, country, os, event_type, item_name, offer_id | §9 §11 | 🔲 รอ custom events |
| `mart_achievement_daily` | event_date, country, os, achievement_category, achievement_id | §10 | 🔲 รอ custom events |

**ASC pipeline (5 ตัว)** — partition DAY บน `report_date`, source: `duriano.app_store_report`:

| Table | grain | KPIs | สถานะข้อมูล |
|---|---|---|---|
| `mart_asc_overview_daily` | report_date × storefront | units, iap_revenue, proceeds | ✅ มีข้อมูลจริง (ล่าสุด 2026-08-18) |
| `mart_asc_earnings_daily` | report_date × storefront × product_type_id × country_code | developer_proceeds | ✅ มีข้อมูลจริง (ล่าสุด 2026-08-18) |
| `mart_asc_reviews_daily` | review_date × territory × rating | review_count | ✅ มีข้อมูลจริง (ล่าสุด 2026-08-15) |
| `mart_asc_engagement_daily` | report_date × territory × device | impressions, page_views, taps | ⚠️ รอ ASC analytics Part B |
| `mart_asc_usage_daily` | report_date × territory × device | installs, deletes | ⚠️ รอ ASC analytics Part B |

**Play Store pipeline (3 ตัว)** — partition DAY บน `report_date`, source: `duriano.play_console_data`:

| Table | grain | KPIs | สถานะข้อมูล |
|---|---|---|---|
| `mart_play_overview_daily` | report_date × package_id | daily_device_installs, active_device_installs, daily_avg_rating, daily_crashes, daily_anrs | ✅ มีข้อมูลจริง (ล่าสุด 2026-08-04) |
| `mart_play_earnings_daily` | report_date × package_id × country × sku_id | gross_revenue_usd, refunds_usd, net_proceeds_usd, transactions | ✅ มีข้อมูลจริง (ล่าสุด 2026-07-31) |
| `mart_play_store_performance_daily` | report_date × package_id × country | store_listing_visitors, installers, visitor_to_installer_conversion_rate | ✅ มีไฟล์ (ยังไม่ verify row count) |

> ⚠️ Play Store Statistics (Installs, Ratings, Crashes): **monthly batch** — ข้อมูลเดือนปัจจุบันออก ~วันที่ 3–10 ของเดือนถัดไป gap ในช่วงปลายเดือน **ไม่ใช่ bug**

### 2.3 Dataform Repository & Orchestration

| รายการ | ค่า |
|---|---|
| Repo GitHub | `tanakornc-lab/duriano-dataform` (branch `main`) |
| BigQuery project | `duriano` |
| Region | `asia-southeast1` |
| Orchestration | ⚠️ ยังไม่มี event-driven trigger — รันผ่าน Dataform UI (manual) |

**Cloud Schedulers (project: `duriano`, region: `asia-southeast1`):**

| Job | Schedule (Bangkok) | Mode | สถานะ |
|---|---|---|---|
| `asc-pipeline-daily` | 5:00 AM ทุกวัน | `?mode=sales` | ✅ ทำงานอยู่ |
| `asc-reviews-daily` | 5:00 AM ทุกวัน | `?mode=reviews` | ✅ ทำงานอยู่ |
| `asc-analytics-daily` | 6:00 AM ทุกวัน | `?mode=analytics` | ⚠️ ยังไม่ได้สร้าง (pending Part B) |

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
definitions/sources/                   ← 9 ไฟล์ (ASC: 4, Play Store: 5)
definitions/staging/                   ← 15 ไฟล์ (GA4: 6, ASC: 4, Play Store: 5)
definitions/transform/                 ← 8 ไฟล์ (int_*)
definitions/mart/                      ← 15 ไฟล์ (GA4: 7, ASC: 5, Play Store: 3)
```

---

## 3. สถานะปัจจุบัน

| ส่วน | สถานะ | หมายเหตุ |
|---|---|---|
| GA4 pipeline (core + retention) | ✅ มีข้อมูลจริง | mart_core_daily ล่าสุด 2026-08-18 |
| GA4 pipeline (custom events) | 🔲 รอ game team | 12 events ยัง DESIGN — ยังไม่ถูก deploy สู่ production |
| ASC pipeline (sales + reviews) | ✅ ทำงานรายวัน | 2 schedulers ทำงานอยู่ |
| ASC pipeline (analytics) | ⚠️ Part B pending | ต้องสร้าง `asc-analytics-daily` scheduler — ASC_ANALYTICS_REQUEST_ID set แล้ว |
| Play Store pipeline | ✅ ทำงานรายวัน | DTS อัตโนมัติ — gap ปลายเดือนเป็น normal |
| Orchestration (event-driven) | 🔲 ยังไม่ setup | ต้อง setup Log Sink → Pub/Sub → Cloud Run เหมือน MCF |
| BI / Looker Studio | 🔲 ยังไม่เริ่ม | รอ data จากทุก custom event ก่อนออกแบบ dashboard |
| Branch protection / CI | 🟡 CI yml มีแล้ว | ต้องเปิด branch protection ใน GitHub Settings |

---

## 4. รายการรอจัดการ (Action Items)

### 4.1 🔴 สำคัญสุด: สร้าง `asc-analytics-daily` Cloud Scheduler (Part B)
- `ASC_ANALYTICS_REQUEST_ID=5ce4d3ff-f7ec-4f34-b542-54948054e240` set ใน Cloud Run แล้ว
- ต้องสร้าง scheduler job `asc-analytics-daily` (6:00 AM, `?mode=analytics`)
- รัน trigger ครั้งแรกเพื่อโหลดข้อมูลเข้า `asc_analytics_engagement_raw` + `asc_analytics_usage_raw`
- จากนั้น Full Refresh `mart_asc_engagement_daily` + `mart_asc_usage_daily`

### 4.2 🔴 รอ game team deploy custom events
- 12 events ใน TRACKING_PLAN ยังเป็น DESIGN — pipeline ยังไม่มีข้อมูลจริงให้รัน
- เมื่อ game team deploy แล้ว: รัน Dataform execution → ตรวจ row counts → อัปเดต TRACKING_PLAN status เป็น IMPLEMENTED

### 4.3 🟡 Setup orchestration (event-driven)
- สร้าง Log Sink ดักจับ `events_*` table creation ใน `duriano.analytics_485152863`
- ต่อ Pub/Sub → Cloud Run → Dataform API (ใช้ pattern เดียวกับ MCF `dataform-trigger`)

### 4.4 🟡 เปิด branch protection
- GitHub Settings → Branches → main → require PR + CI pass ก่อน merge

### 4.5 🟢 งานต่อยอด
- สร้าง Looker Studio dashboard เมื่อมีข้อมูลจาก custom events
- Setup alerting เมื่อ Dataform run FAILED → LINE/Slack

---

## 5. กฎการอัปเดตเอกสารนี้

1. ทุกการเปลี่ยนโครงสร้าง (dataset ใหม่, service ใหม่, ไฟล์ใหม่) ต้องบันทึกที่นี่
2. ข้อมูลทุกบรรทัดต้องมีหลักฐานจากระบบจริง — ห้ามให้ AI เติมสิ่งที่ "น่าจะมี"
3. อัปเดตขั้นต่ำ: ทุกครั้งที่ custom event เปลี่ยนสถานะ / ทุกครั้งที่จบ action item ใน §4
