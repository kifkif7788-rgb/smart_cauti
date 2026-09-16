-- ════════════════════════════════════════════════════════════════════
--  ย้ายการบันทึกอาการแสดงไปอยู่กับการประเมินรายวัน
--
--  อาการมาได้จากสองทาง จึงผูกกับเจ้าของได้ทางใดทางหนึ่งเท่านั้น
--    assessment_id — พยาบาลบันทึกตอนประเมินรายวัน (ทางหลัก)
--    diagnosis_id  — IC บันทึกในแบบวินิจฉัย เช่น อาการที่ใช้ได้หลังถอดสาย
--
--  ตารางยังว่างอยู่ จึงย้ายโครงสร้างได้โดยไม่ต้องแปลงข้อมูลเดิม
-- ════════════════════════════════════════════════════════════════════

alter table infection_symptom
  alter column diagnosis_id drop not null,
  add column assessment_id uuid references assessment(assessment_id) on delete cascade;

-- เดิมบังคับไม่ให้ซ้ำต่อหนึ่งการวินิจฉัย ตอนนี้ต้องคุมแยกตามเจ้าของแต่ละทาง
alter table infection_symptom drop constraint infection_symptom_unique;

create unique index infection_symptom_diagnosis_code_idx
  on infection_symptom(diagnosis_id, code) where diagnosis_id is not null;

create unique index infection_symptom_assessment_code_idx
  on infection_symptom(assessment_id, code) where assessment_id is not null;

create index infection_symptom_assessment_idx on infection_symptom(assessment_id);

-- กันแถวกำพร้าและแถวที่อ้างสองเจ้าของพร้อมกัน
alter table infection_symptom
  add constraint infection_symptom_owner_ok check (
    (diagnosis_id is not null and assessment_id is null) or
    (diagnosis_id is null and assessment_id is not null)
  );

comment on column infection_symptom.assessment_id is
  'อาการที่พยาบาลบันทึกตอนประเมินรายวัน — ใช้ดูว่าอาการเริ่มปรากฏเวรไหน';
