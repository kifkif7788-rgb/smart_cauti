-- ════════════════════════════════════════════════════════════════════
--  ขยาย CHECK 8 เป็น CHECK 9 — เพิ่มข้อ Documentation
--
--  บันทึกวันที่ใส่สาย จำนวนวันคาสาย ผลการประเมิน และการส่งต่อปัญหา
--  เป็นข้อที่ 9 ตามโปสเตอร์ของหน่วยงาน
--
--  คอลัมน์ใหม่เปิดให้ว่างได้ เพราะการประเมินที่บันทึกไว้ก่อนหน้านี้ไม่มีข้อนี้
--  ค่าว่างจึงแปลว่า "ยังไม่เคยถาม" ซึ่งต่างจาก false ที่แปลว่า "ตอบว่าไม่ผ่าน"
-- ════════════════════════════════════════════════════════════════════

alter table assessment add column document boolean;

comment on column assessment.document is
  'ข้อที่เพิ่มภายหลัง — null คือการประเมินครั้งนั้นยังไม่มีข้อนี้';

-- all_pass เป็นคอลัมน์ generated จึงต้องสร้างใหม่เพื่อรวมข้อที่เพิ่มเข้ามา
-- มุมมอง research_assessment อ้างถึงคอลัมน์นี้ ต้องถอดออกก่อนแล้วสร้างคืน
drop view research_assessment;

alter table assessment drop column all_pass;

-- coalesce ทำให้แถวเก่าคงค่าเดิม ไม่ถูกตีว่าไม่ผ่านย้อนหลัง
-- ความหมายของ all_pass คือ "ผ่านทุกข้อที่ถูกถามในการประเมินครั้งนั้น"
alter table assessment
  add column all_pass boolean generated always as (
    need and fix and flow and below and closed
    and coalesce(hand, true)
    and coalesce(flush, true)
    and coalesce(drain, true)
    and coalesce(document, true)
  ) stored;

create view research_assessment as
select
  a.assessment_id,
  e.study_code,
  a.source,
  a.nurse_level,
  a.study_mode,
  a.assessed_at,
  a.shift,
  a.foley_day,
  a.need, a.fix, a.flow, a.below, a.closed,
  a.hand, a.flush, a.drain, a.document,
  a.all_pass,
  a.feedback,
  e.ward_code,
  e.insert_date,
  e.remove_date
from assessment a
join episode e on e.episode_id = a.episode_id;

comment on view research_assessment is
  'ข้อมูลการประเมินสำหรับวิเคราะห์สถิติ — ไม่มี HN, เตียง หรือหมายเหตุที่อาจระบุตัวผู้ป่วย';
