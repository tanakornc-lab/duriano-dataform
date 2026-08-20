# WORKLOG.md — Duriano Analytics Platform

> **กติกา (append-only เหมือน ledger):**
> 1. เพิ่ม entry ใหม่ไว้**บนสุด**เสมอ ห้ามแก้หรือลบ entry เก่า
> 2. หนึ่ง AI session = อย่างน้อยหนึ่ง entry — ก่อนปิดแชททุกครั้ง สั่ง AI ว่า: *"สรุปสิ่งที่ทำทั้งหมดใน session นี้เป็น WORKLOG entry ตาม template"*
> 3. เริ่ม session ใหม่ทุกครั้งด้วยการแนบ: FINAL_HANDOVER.md + CLAUDE.md + entry ล่าสุด 2–3 รายการจากไฟล์นี้
> 4. เก็บไฟล์นี้ใน Git คู่กับ TRACKING_PLAN.md

## Template (copy ไปใช้)

```
## [YYYY-MM-DD] — <ชื่องานสั้นๆ>
- **ทำโดย:** <คน / Claude / Gemini>
- **เสร็จ:** <สิ่งที่สำเร็จ พร้อมชื่อไฟล์/ตาราง/service ที่ถูกสร้างหรือแก้>
- **ค้าง:** <สิ่งที่ยังไม่จบ + จุดที่หยุดไว้>
- **ตัดสินใจ:** <การตัดสินใจเชิงสถาปัตยกรรมที่เกิดขึ้น + เหตุผล>
- **ระวัง:** <สิ่งที่ session ถัดไปต้องรู้>
```

---

## [2026-08-20] — Rule standardization + ASC Analytics Part B

- **ทำโดย:** JOEKER + Claude (claude-sonnet-4-6)
- **เสร็จ:**
  - **Rule standardization (CLAUDE.md)**: เขียน CLAUDE.md ใหม่ทั้งหมดตาม template มาตรฐาน (PROJECT CONFIG + ARCHITECTURE + NAMING CONVENTIONS + SQL STANDARDS + EXTERNAL PIPELINES + SCHEDULER INVENTORY + HEALTHCHECK REFERENCE + SAFETY & GIT) — ลบ GEMINI.md ทิ้ง — PR #14 merged ✅
  - **FINAL_HANDOVER.md**: เขียนใหม่ให้ครบ (Evidence precedence, Authority, Access rules, Cost discipline, Plan-as-contract, Lessons paid for, Session exit) — PR #14 merged ✅
  - **Fix GEMINI.md references**: แทนที่ GEMINI.md ด้วย CLAUDE.md ใน SYSTEM_ARCHITECTURE.md, .claude_skills/event-schema-designer.md, WORKLOG.md header — PR #15 merged ✅
  - **SYSTEM_ARCHITECTURE.md full update**: เพิ่ม ASC pipeline + Play Store pipeline ใน diagram, datasets, mart table inventory (7→15 ตัว), scheduler inventory, file counts (sources 0→9, staging 6→15, mart 7→15) — PR #16 merged ✅
  - **ASC Analytics Part B**: verify `ASC_ANALYTICS_REQUEST_ID=5ce4d3ff-f7ec-4f34-b542-54948054e240` set อยู่แล้ว — scheduler `asc-analytics-daily` มีอยู่แล้ว (สร้าง 20 ส.ค. 06:12 UTC, schedule 5:00 AM Bangkok) — data โหลดแล้ว (3,824 rows engagement + 996 rows usage) — Full Refresh `mart_asc_engagement_daily` + `mart_asc_usage_daily` ✅
- **ค้าง:**
  - รอ game team deploy custom events (12 events ยัง DESIGN)
  - Setup event-driven orchestration (Log Sink → Pub/Sub → Cloud Run)
- **ตัดสินใจ:**
  - GEMINI.md ถูกลบ → CLAUDE.md เป็น source of truth เดียวสำหรับกฎ pipeline
  - ASC analytics scheduler ใช้ 5:00 AM (ไม่ใช่ 6:00 AM ที่วางแผนไว้ — ใช้ schedule ที่ job มีอยู่จริง)
- **ระวัง:**
  - WORKLOG entries เก่าที่อ้าง GEMINI.md เป็น historical record — ไม่ต้องแก้
  - Play Store Statistics (Installs/Ratings/Crashes): monthly batch — gap ปลายเดือนเป็น normal

---

## [2026-08-13] — ยืนยัน Play Store data + KPI strategy

- **ทำโดย:** JOEKER + Claude (claude-sonnet-4-6)
- **เสร็จ:**
  - ยืนยันว่า `play_store_report` ใน `campfire-production-445306` มีข้อมูล Duriano อยู่แล้ว (`com.adisoft.duriano` ปนอยู่ใน `p_Earnings_monster_campfire` และตารางอื่นๆ) — สามารถสร้าง Play Store pipeline สำหรับ Duriano ได้ทันทีโดยไม่ต้อง setup BDT ใหม่
  - ยืนยัน KPI source strategy สำหรับ Duriano (เหมือน MCF):
    - DAU, MAU, Retention, Engagement → GA4
    - Game mechanics (run, boss, economy) → GA4 custom events
    - Downloads, Installs, Revenue, Ratings, Crashes → Play Console / ASC (ไม่ใช่ GA4)
  - ตรวจสอบ MCF PR #21–23 ที่เป็น template: Play Store pipeline ใช้ pattern `declaration → staging (filter Package_ID) → mart (incremental)` — นำมาทำ Duriano ได้โดย clone แล้วเปลี่ยน filter เป็น `com.adisoft.duriano`
- **ค้าง:**
  - 🔴 Game team ยังไม่ deploy custom events → GA4 pipeline ยัง execute ไม่ได้
  - 🟡 Play Store pipeline สำหรับ Duriano — พร้อมสร้างเมื่อ confirm กับทีมว่าต้องการ (pattern จาก MCF พร้อมแล้ว)
  - 🟡 Apple App Store Connect pipeline — รอ account recovery ของทีม
  - 🟡 Orchestration (Log Sink → Pub/Sub → Cloud Run) — ยังไม่เริ่ม
  - 🟡 Branch protection บน GitHub — ยังไม่เปิด
- **ตัดสินใจ:**
  - Duriano Play Store pipeline จะ filter `Package_ID = 'com.adisoft.duriano'` เหมือน MCF filter `com.adisoft.campfire` — ข้อมูลจาก dataset เดียวกัน
  - Revenue source of truth = Play Console / ASC (ไม่ใช่ GA4) — ยืนยันใช้กับ Duriano ด้วย
- **ระวัง:** Duriano mart tables ยังว่างทั้งหมด — รอ custom events ถึง production ก่อน execute

---

## [2026-08-10] — สร้าง pipeline ครบ 3 ชั้น + ทำ repo structure ให้ parity กับ MCF

- **ทำโดย:** JOEKER + Claude (claude-sonnet-4-6)
- **เสร็จ:**
  - **Pipeline files ครบ 21 ไฟล์** commit เข้า main (PR #2 merged ✅)
    - Staging 6 ไฟล์: `stg_core_events`, `stg_run_events`, `stg_mode_events`, `stg_economy_events`, `stg_iap_events`, `stg_achievement_events`
    - Transform 8 ไฟล์: `int_core_kpis`, `int_retention_kpis`, `int_runs`, `int_run_kpis`, `int_boss_kpis`, `int_economy_kpis`, `int_iap_kpis`, `int_achievement_kpis`
    - Mart 7 ไฟล์: `mart_core_daily`, `mart_retention_daily`, `mart_run_daily`, `mart_boss_daily`, `mart_economy_daily`, `mart_iap_daily`, `mart_achievement_daily`
  - **Rename convention แก้ไขครบ** (PR #2): 10 ไฟล์ที่ขาด prefix ถูก rename + `name:` + `${ref(...)}` ทุกจุดอัปเดตแล้ว
  - **Shared configs เพิ่มเข้า repo** ให้ parity กับ MCF (PR #3 merged ✅): `.sqlfluff`, `.github/workflows/dataform-ci.yml`, `includes/utils.js`, `.claude_skills/` (3 skills)
  - **SYSTEM_ARCHITECTURE.md** สร้างเสร็จ (PR #4 merged ✅) — document สถานะจริง ณ 10 ส.ค. 2026
- **ค้าง:**
  - 🔴 Game team ยังไม่ deploy custom events สู่ production — 12 events ยัง DESIGN — pipeline ยังรัน execution ไม่ได้
  - 🟡 Setup orchestration (Log Sink → Pub/Sub → Cloud Run) เหมือน MCF pattern — ยังไม่เริ่ม
  - 🟡 Branch protection บน GitHub ยังไม่เปิด
  - 🟡 Looker Studio dashboard — รอ data จริงก่อน
  - 🟡 Website Analytics — on hold รอเคลียร์สถานการณ์ event tracking
- **ตัดสินใจ:**
  - Transform KPI files ใช้ `int_` prefix (เช่น `int_run_kpis`) ตาม MCF convention — ไม่ใช่ `run_kpis` แบบไม่มี prefix
  - SYSTEM_ARCHITECTURE.md เป็น project-specific — ไม่ share ข้าม repo (ต่างจาก EXPERIMENT_PLAYBOOK ที่ย้ายไป ads-company)
  - `experiment-analyst.md` skill ชี้ไปที่ `../../ads-company/playbooks/EXPERIMENT_PLAYBOOK.md` เพราะ playbook ถูก centralize แล้ว
- **ระวัง:** ทุก mart table ยังว่างอยู่ — pipeline code พร้อมแล้วแต่ยังไม่มี data จริง เพราะ custom events ยังไม่ถึง production

---

## [2026-08-10] — ตั้งค่า documentation และ TRACKING_PLAN

- **ทำโดย:** JOEKER + Claude (claude-sonnet-4-6)
- **เสร็จ:**
  - Clone repo `tanakornc-lab/duriano-dataform` — พบ staging/transform/mart มีอยู่แล้วบางส่วน (`core_events`, `core_daily`, `retention_daily`, `core_kpis`, `retention_kpis`)
  - สร้าง `TRACKING_PLAN.md` — map จาก KPI sheet ครบทุก event (15 events: 3 IMPLEMENTED, 12 DESIGN)
  - สร้าง `WORKLOG.md`, `METRIC_DEFINITIONS.md`, `FINAL_HANDOVER.md`
  - แก้ `GEMINI.md` — เติม placeholder ด้วยค่าจริง (project: duriano, ga4: analytics_485152863)
- **ค้าง:**
  - Event tracking ใน SIT/UAT ยังไม่ verified end-to-end ผ่าน BigQuery — ทุก custom event ยัง DESIGN
  - ยังต้องสร้าง staging/transform/mart สำหรับ game-specific events (level_start, boss_result, level_end ฯลฯ)
  - Website Analytics — รอเคลียร์สถานการณ์ก่อน (event tracking ยังไม่ verified)
- **ตัดสินใจ:** ต่อยอดจาก repo เดิม ไม่ลบทิ้ง เพราะ Dataform workspace (`duriano-production-workspace`) เชื่อมอยู่แล้ว
- **ระวัง:** `GEMINI.md` เดิมมี `<placeholder>` ที่ยังไม่กรอก — แก้ไขแล้วใน session นี้ ตรวจสอบก่อนใช้งาน
