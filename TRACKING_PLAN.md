# Duriano — Master Tracking Plan (Event Taxonomy)

## 🤖 AI Agent Instructions
* This document contains the approved Event Taxonomy for the "Duriano" project.
* When evaluating PRs or generating new `.sqlx` files, you MUST verify that the `event_name` and its `event_params` strictly match the definitions in this table.
* If a developer attempts to use an event or parameter not listed here, reject the PR and instruct them to update this Tracking Plan first.
* DO NOT invent new events without explicit user request.
* Items marked `DESIGN` are pending end-to-end BigQuery verification — do not treat them as final when generating code.

## 📋 Event Taxonomy

| event_name | trigger_condition | event_params | status |
| :--- | :--- | :--- | :--- |
| `session_start` | ทุกครั้งที่ผู้ใช้เปิดแอปและเริ่ม session ใหม่ | `ga_session_id` (int), `ga_session_number` (int) | IMPLEMENTED |
| `user_engagement` | เมื่อ app อยู่ใน foreground และ user มี activity | `engagement_time_msec` (int) | IMPLEMENTED |
| `first_open` | ติดตั้งและเปิดแอปครั้งแรก — เกิดครั้งเดียวต่อ device | (no custom params — ใช้เป็น cohort anchor) | IMPLEMENTED |
| `purchase` | เมื่อผู้เล่นชำระเงินจริงสำเร็จ | `transaction_id` (string), `value` (float), `currency` (string — ISO 4217 e.g. `THB`), `item_name` (string e.g. `full_game_unlock`), `item_category` (string e.g. `full_game` / `currency`) | DESIGN |
| `mode_select` | ผู้เล่นกดเลือกโหมดจากหน้าจอหลัก (Main Menu) เพื่อเข้าสู่หน้าเตรียมตัว | `game_mode` (string: `normal` / `ranked`) | DESIGN |
| `level_start` | ผู้เล่นกด confirm เริ่ม run หลังเลือก hero/trail/difficulty เสร็จ | `run_id` (string — UUID สร้างใหม่ทุก run, ต้องส่งไปกับทุก event ใน run นั้น), `hero_id` (string e.g. `durian_thor`), `weapon_id` (string e.g. `bow_frost`), `trail_id` (string e.g. `odin_trail`), `difficulty` (string: `normal` / `hard` / `god` / `n/a` — ใช้ `n/a` เมื่อ `game_mode=ranked`), `game_mode` (string: `normal` / `ranked`) | DESIGN |
| `boss_encounter` | เมื่อผู้เล่นเข้า boss room | `run_id` (string), `realm` (int — realm ที่ boss อยู่) | DESIGN |
| `boss_result` | เมื่อ boss fight จบ (ชนะหรือแพ้) | `run_id` (string), `boss_id` (string e.g. `odin`, `thor`), `result` (string: `win` / `death`), `duration_sec` (int) | DESIGN |
| `level_end` | เมื่อ run จบ ไม่ว่าจะ win / death / quit | `run_id` (string), `result` (string: `win` / `death` / `quit`), `duration_sec` (int), `realm_reached` (int — เริ่มที่ 1), `cause_of_death` (string: `boss_<id>` / `trap` / `horde` / `timeout` / `quit` — ส่งเฉพาะเมื่อ `result=death`) | DESIGN |
| `earn_virtual_currency` | จบ run — fire พร้อมกับ `level_end` | `virtual_currency_name` (string: `coin`), `value` (float), `run_id` (string) | DESIGN |
| `spend_virtual_currency` | เมื่อผู้เล่นกด upgrade ใน Permanent Upgrade hub | `virtual_currency_name` (string: `coin`), `item_name` (string e.g. `hp_upgrade_lv3`) | DESIGN |
| `unlock_achievement` | เมื่อผู้เล่น unlock achievement หรือ hero สำเร็จ | `achievement_id` (string e.g. `hero_id`, `weapon_id`, `trail_id`), `achievement_name` (string — display name e.g. `Durian Thor`), `achievement_category` (string: `hero` / `weapon` / `trail`) | DESIGN |
| `paywall_impression` | เมื่อหน้าต่างเสนอขายสินค้า (popup) เด้งขึ้นมาแสดงผล | `offer_id` (string e.g. `full_game`, `starter_pack`, `revive_bundle`), `placement` (string e.g. `realm_boss_clear`, `death_screen`, `main_menu`) | DESIGN |
| `restore_purchase` | เมื่อผู้เล่นกดปุ่ม Restore ในหน้า Settings หรือหน้า Shop | `item_category` (string e.g. `full_game`, `currency`), `status` (string: `success` / `failed`) | DESIGN |

## ⚠️ Critical Design Notes

### run_id — ต้องส่งทุก event ใน run
`run_id` สร้างตอน `level_start` แล้ว carry ไปยัง: `boss_encounter`, `boss_result`, `level_end`, `earn_virtual_currency`
หากขาด `run_id` จะไม่สามารถ link economy กับ performance ได้เลย

### difficulty กับ ranked mode
เมื่อ `game_mode = 'ranked'` ให้ส่ง `difficulty = 'n/a'` เสมอ เพื่อป้องกัน NULL ใน GROUP BY

### first_open vs first_visit
ใช้ `first_open` เป็น cohort anchor เท่านั้น (mobile app) — ห้ามใช้ `first_visit` (web only)

### boss_encounter vs boss_result integrity
ถ้า `encounter > result` = มี data loss หรือ app crash ก่อน fight จบ — ต้อง monitor ด้วย assertion

## 💰 Currency Registry

| virtual_currency_name | method / context | owning system |
| :--- | :--- | :--- |
| `coin` | `earn_virtual_currency` (run reward) + `spend_virtual_currency` (permanent upgrade) | Core economy |

*(Extend via PR เมื่อมีสกุลเงินใหม่)*
