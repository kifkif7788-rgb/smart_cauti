-- ════════════════════════════════════════════════════════════════════
--  รายละเอียดผลเพาะเชื้อปัสสาวะเพิ่มเติม
--    - เชื้อที่ระบุเอง เมื่อไม่มีในรายการ (ตัวเลือก "อื่นๆ")
--    - ผลที่พบเชื้อซึ่งไม่ใช่แบคทีเรีย พร้อมช่องระบุชื่อเชื้อ
--    - วันที่ส่งผล U/C
-- ════════════════════════════════════════════════════════════════════

alter type urine_culture_result add value if not exists 'NON_BACTERIAL';

alter table infection_diagnosis
  add column uc_result_date         date,
  add column organism_other         text,
  add column non_bacterial_organism text;

comment on column infection_diagnosis.organism_other is
  'ชื่อเชื้อที่ผู้ใช้พิมพ์เองเมื่อไม่มีในรายการ นับรวมกับ organisms ได้ไม่เกิน 2 ชนิด';
comment on column infection_diagnosis.non_bacterial_organism is
  'ชื่อเชื้อเมื่อผลเพาะเชื้อไม่ใช่แบคทีเรีย เช่น เชื้อรา';

alter table infection_diagnosis
  drop constraint infection_organisms_match_result;

-- นับเชื้อที่ระบุเองรวมกับเชื้อที่เลือกจากรายการ และกันไม่ให้ข้อมูลของผลแบบหนึ่ง
-- ค้างอยู่หลังผู้ใช้เปลี่ยนไปเลือกผลอีกแบบ
--
-- เทียบผ่าน uc_result::text เพราะค่า enum ที่เพิ่งเพิ่มด้านบนยังอ้างเป็น enum literal
-- ใน transaction เดียวกันไม่ได้ การแปลงเป็น text ทำให้รันไฟล์นี้รวดเดียวจบได้
alter table infection_diagnosis
  add constraint infection_organisms_match_result check (
    (uc_result::text = 'NO_GROWTH'
      and cardinality(organisms) = 0
      and organism_other is null
      and non_bacterial_organism is null)
    or
    (uc_result::text = 'SIGNIFICANT'
      and non_bacterial_organism is null
      and cardinality(organisms) + (case when organism_other is null then 0 else 1 end)
          between 1 and 2)
    or
    (uc_result::text = 'NON_BACTERIAL'
      and cardinality(organisms) = 0
      and organism_other is null
      and non_bacterial_organism is not null)
  );
