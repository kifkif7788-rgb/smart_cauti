-- ════════════════════════════════════════════════════════════════════
--  บันทึกการใช้ชุดอุปกรณ์ใส่สาย
--
--  พยาบาลสแกน QR บนชุด set kit แล้วกรอกเลขเตียงที่นำไปใช้
--  หนึ่งแถวคือการใช้ชุดอุปกรณ์หนึ่งครั้ง ซึ่งเท่ากับการใส่สายหนึ่งครั้ง
--  ใช้นับปริมาณการใส่สายของหอผู้ป่วย และเป็นตัวส่วนของอัตรา CAUTI ได้
--
--  บันทึกได้ทุกเตียง ไม่จำกัดเฉพาะเตียงว่าง เพราะการใส่สายใหม่ให้ผู้ป่วย
--  ที่คาสายอยู่ (เปลี่ยนสาย) ก็นับเป็นการใช้ชุดอุปกรณ์เช่นกัน
--  ตารางนี้เก็บแค่เลขเตียง ไม่มีข้อมูลผู้ป่วย การบันทึกจึงไม่เปิดเผยอะไร
-- ════════════════════════════════════════════════════════════════════

create table kit_usage (
  usage_id    uuid        primary key default gen_random_uuid(),
  -- รหัสป้ายที่สแกน เก็บไว้เผื่อวันหน้าแยกป้ายรายชุดหรือรายหอ
  kit_code    text        not null,
  ward_code   text        not null,
  bed_no      text        not null,
  used_by     uuid        not null references app_user(user_id),
  used_at     timestamptz not null default now(),
  -- กันบันทึกซ้ำเมื่อกดสองครั้งหรือเครือข่ายสะดุดแล้วส่งใหม่
  client_uuid text        not null unique,
  created_at  timestamptz not null default now()
);

-- รายงานนับตามช่วงเวลาของหอผู้ป่วยเป็นการอ่านหลักของตารางนี้
create index kit_usage_ward_time_idx on kit_usage(ward_code, used_at desc);
create index kit_usage_bed_idx       on kit_usage(ward_code, bed_no, used_at desc);

comment on table kit_usage is
  'การใช้ชุดอุปกรณ์ใส่สายหนึ่งครั้งต่อหนึ่งแถว — ไม่มี HN หรือข้อมูลผู้ป่วย';

alter table kit_usage enable row level security;
