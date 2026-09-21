-- ════════════════════════════════════════════════════════════════════
--  ช่องทางแจ้งปัญหาถึงผู้ดูแลระบบ
--
--  เดิมพยาบาลที่ติดปัญหาหน้าเตียงต้องไปตามตัวแอดมินเอง ซึ่งคนละเวรกันก็ไม่เจอ
--  เก็บเป็นตารางแทนการส่งไปช่องทางภายนอก เพื่อให้เรื่องไม่ตกหล่นเมื่อแอดมิน
--  ไม่อยู่เวร และตามได้ว่าเรื่องไหนแก้แล้ว
-- ════════════════════════════════════════════════════════════════════

create type support_category as enum ('APP', 'TAG', 'DATA', 'ACCOUNT', 'OTHER');
create type support_status   as enum ('OPEN', 'RESOLVED');

create table support_request (
  request_id   uuid             primary key default gen_random_uuid(),
  -- ไม่ใช้ on delete cascade เพราะบัญชีถูกปิดใช้งาน ไม่ได้ถูกลบ
  reporter_id  uuid             not null references app_user(user_id),
  ward_code    text             not null,
  category     support_category not null,
  -- เตียงที่เกี่ยวข้อง ว่างได้เพราะบางปัญหาไม่ผูกกับเตียงใด
  bed_no       text,
  message      text             not null check (length(btrim(message)) between 5 and 1000),
  -- หน้าที่ผู้แจ้งอยู่ตอนกดแจ้ง ช่วยให้แอดมินเห็นบริบทโดยไม่ต้องถามกลับ
  page_path    text,
  status       support_status   not null default 'OPEN',
  admin_note   text,
  resolved_by  uuid             references app_user(user_id),
  resolved_at  timestamptz,
  created_at   timestamptz      not null default now(),

  -- ปิดเรื่องแล้วต้องรู้ว่าใครปิดและเมื่อไร มิฉะนั้นตามกลับไม่ได้
  constraint support_resolved_complete check (
    (status = 'OPEN'     and resolved_by is null and resolved_at is null)
    or
    (status = 'RESOLVED' and resolved_by is not null and resolved_at is not null)
  )
);

-- แอดมินเปิดหน้านี้เพื่อดูเรื่องที่ยังไม่ได้แก้ก่อนเสมอ
create index support_request_open_idx
  on support_request(created_at desc)
  where status = 'OPEN';

create index support_request_reporter_idx
  on support_request(reporter_id, created_at desc);

comment on table support_request is
  'เรื่องที่ผู้ใช้แจ้งถึงผู้ดูแลระบบ — ไม่ควรใส่ HN หรือชื่อผู้ป่วยในข้อความ';

alter table support_request enable row level security;
