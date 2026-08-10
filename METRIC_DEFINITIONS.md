# METRIC_DEFINITIONS.md — Duriano Analytics Platform

**Last updated:** 2026-08-10
**Status:** DRAFT — metrics ยังรอ event verification end-to-end ผ่าน BigQuery

---

## §1 — Engagement & Session

### Daily Active Users (DAU)
- **Source event:** `session_start`
- **SQL:** `COUNT(DISTINCT user_pseudo_id)` per `event_date`
- **Note:** ใช้ `COUNT(DISTINCT)` เท่านั้น ห้ามใช้ `COUNT(*)` เพราะ user เปิดหลายครั้งจะนับซ้ำ

### Sessions per User
- **Source event:** `session_start`
- **SQL:** `COUNT(ga_session_id) / COUNT(DISTINCT user_pseudo_id)` per day
- **Benchmark roguelite:** 3–5 sessions/day

### Avg Session Duration
- **Source event:** `user_engagement`
- **SQL:** `SUM(engagement_time_msec) / 1000 / COUNT(DISTINCT ga_session_id)` (วินาที)
- **Benchmark roguelite:** 10–20 นาที/session

---

## §2 — Retention

### D1 / D7 / D30 Retention
- **Cohort anchor:** `first_open` — MIN(event_date) per user
- **Return signal:** `session_start`
- **SQL pattern:**
  - D1 = `DATE_DIFF(return_date, cohort_date) = 1`
  - D7 = `DATE_DIFF BETWEEN 6 AND 8`
  - D30 = `DATE_DIFF BETWEEN 27 AND 33`
- **Benchmark roguelite mobile:** D1 ~40%, D7 ~20%, D30 ~10%
- **Note:** ใช้ `first_open` เท่านั้น ห้ามใช้ `first_visit` (web only)

---

## §3 — Mode Selection

### Game Mode Pick Rate
- **Source event:** `mode_select`
- **SQL:** `COUNT(*) FILTER (WHERE game_mode = 'ranked') / COUNT(*)` × 100
- **Signal:** Ranked < 10% = reward ไม่จูงใจ หรือ unlock condition ยากเกินไป

---

## §4 — Pre-Run Selection

### Hero Pick Rate
- **Source event:** `level_start`
- **SQL:** `COUNT(*) per hero_id / SUM(COUNT(*)) OVER ()` × 100
- **Signal:** < 5% = hero ไม่มีใครสนใจ ควรตรวจ stats หรือ visual

### Weapon Pick Rate
- **Source event:** `level_start`
- **SQL:** `COUNT(*) per weapon_id / total runs` × 100
- **Signal:** < 5% = ควรบัฟ / > 60% = อาจ overpowered → cross-check กับ Win Rate

### Trail Pick Rate
- **Source event:** `level_start`
- **SQL:** `COUNT(*) per trail_id / total runs` × 100
- **Signal:** Trail ไม่มีใครเลือก = unlock ยากเกินไป หรือ reward ไม่คุ้ม

### Difficulty Distribution
- **Source event:** `level_start`
- **SQL:** `COUNT(*) per difficulty / total runs` × 100
- **Note:** filter `WHERE game_mode != 'ranked'` เมื่อวิเคราะห์ difficulty — ranked ใช้ `difficulty = 'n/a'`
- **Signal:** > 95% เลือก normal = ผู้เล่นกลัวลอง hard → ปรับ reward

---

## §5 — Boss Analytics

### Boss Win Rate
- **Source event:** `boss_result`
- **SQL:** `COUNTIF(result = 'win') / COUNT(*)` per `boss_id`
- **Signal:** < 10% = ยากเกินไป / > 80% = ง่ายเกินไป

### Avg Time to Kill (Boss)
- **Source event:** `boss_result`
- **SQL:** `AVG(duration_sec) WHERE result = 'win'` per `boss_id`
- **Signal:** นานเกิน = tank เกิน หรือ player ไม่รู้ mechanic

### Boss Encounter Integrity
- **Source events:** `boss_encounter` + `boss_result`
- **Check:** `encounter_count > result_count` = มี data loss หรือ app crash

---

## §6 — Run Performance

### Win Rate
- **Source event:** `level_end`
- **SQL:** `COUNTIF(result = 'win') / COUNT(*)`
- **Benchmark roguelite (normal difficulty):** 5–15%
- **Signal:** > 15% = เกมง่ายไป / < 5% = เกมยากไป

### Avg Run Duration
- **Source event:** `level_end`
- **SQL:** `AVG(duration_sec)` แยกตาม `result`
- **Signal:** death runs สั้น (< 60s) = early spike damage ใน realm แรก

### Avg Realm Reached
- **Source event:** `level_end`
- **SQL:** `AVG(realm_reached) WHERE result = 'death'`
- **Signal:** < 2 = realm แรกยากเกินไป

---

## §7 — Top Cause of Death

### Cause of Death Distribution
- **Source event:** `level_end` (WHERE result = 'death')
- **SQL:** `COUNT(*) per cause_of_death ORDER BY count DESC`
- **Signal:** `quit` สูง = ผู้เล่นออกเองเพราะเบื่อ/หงุดหงิด → ตรวจ UX

### Death by Realm
- **SQL:** `COUNT(*) GROUP BY realm_reached, cause_of_death`
- **Use:** pinpoint realm ที่ต้องปรับ difficulty

---

## §8 — Economy

### Coins Earned per Run
- **Source event:** `earn_virtual_currency` (WHERE virtual_currency_name = 'coin')
- **SQL:** `AVG(value) per run_id` — JOIN กับ `level_end` ผ่าน `run_id`
- **Signal:** ต่ำมาก = ผู้เล่นไม่มีแรงจูงใจ grind

### Coins Spent (Upgrade)
- **Source event:** `spend_virtual_currency` (WHERE virtual_currency_name = 'coin')
- **SQL:** `SUM(value) per user per day`; `GROUP BY item_name ORDER BY SUM(value) DESC`
- **Signal:** item ที่ไม่มีใครซื้อ = ไม่คุ้มค่า หรือ UI ไม่ชัด

---

## §9 — IAP / Revenue

### Conversion Rate (Demo → Full Game)
- **Source events:** `purchase` + `first_open`
- **SQL:** `COUNT(DISTINCT users ที่ยิง purchase) / COUNT(DISTINCT users ที่มี first_open)` × 100
- **Benchmark:** 2–5% สำหรับ Demo → Full Game

### Revenue Tracking
- **Source event:** `purchase`
- **SQL:** `SUM(value)` — GA4 จะ normalize ค่าเงินอัตโนมัติถ้ามี `currency` field ครบ
- **Note:** `currency` (ISO 4217) จำเป็นมาก — ขาดแล้ว GA4 ไม่แปลงค่าเงินให้

---

## §10 — Achievement & Unlock

### Achievement Unlock Rate
- **Source event:** `unlock_achievement`
- **SQL:** `COUNT(DISTINCT user_pseudo_id) per achievement_id / total users` × 100
- **Signal:** < 1% = ยากเกิน/ซ่อนอยู่ / > 95% = ง่ายเกิน

### Unlock by Category
- **SQL:** `COUNT(*) GROUP BY achievement_category`
- **Use:** ดูว่าผู้เล่นชอบ achievement หมวดไหน → ทีมสร้าง content ตาม

---

## §11 — Paywall

### Paywall Hit Rate
- **Source event:** `paywall_impression`
- **SQL:** `COUNT(*) per offer_id per day`

### Placement Analysis
- **SQL:** `COUNT(*) per placement ORDER BY count DESC`
- **Use:** ดูว่า placement ไหนเจอ paywall บ่อยสุด

### Paywall → Purchase Conversion
- **Source events:** `paywall_impression` + `purchase`
- **SQL:** link ผ่าน `offer_id` และ `user_pseudo_id` ใน session window
