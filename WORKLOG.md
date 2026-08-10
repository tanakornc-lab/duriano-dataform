# WORKLOG.md — Duriano Analytics Platform

> **กติกา (append-only เหมือน ledger):**
> 1. เพิ่ม entry ใหม่ไว้**บนสุด**เสมอ ห้ามแก้หรือลบ entry เก่า
> 2. หนึ่ง AI session = อย่างน้อยหนึ่ง entry — ก่อนปิดแชททุกครั้ง สั่ง AI ว่า: *"สรุปสิ่งที่ทำทั้งหมดใน session นี้เป็น WORKLOG entry ตาม template"*
> 3. เริ่ม session ใหม่ทุกครั้งด้วยการแนบ: FINAL_HANDOVER.md + GEMINI.md + entry ล่าสุด 2–3 รายการจากไฟล์นี้
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
