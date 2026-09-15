-- ════════════════════════════════════════════════════════════
--  Smart CAUTI — Seed data
--  สร้างเมื่อ 2026-09-15T14:12:41.203Z
--  PIN และ URL ของป้ายถูกพิมพ์ออกทาง stderr ตอนรันสคริปต์
-- ════════════════════════════════════════════════════════════

insert into study (name, ward_code, current_mode, baseline_start, study_end)
values (
  'Smart CAUTI — หอผู้ป่วยศัลยกรรมชาย',
  'SURG_M',
  'BASELINE',
  '2026-09-15',
  '2026-10-13'
);

insert into app_user (employee_id, full_name, role, ward_codes, pin_hash) values
  ('N001', 'พยาบาลตัวอย่าง หนึ่ง', 'NURSE'::user_role, array['SURG_M'], 'scrypt$3055ded6644f227d78a7b036d81d5eed$9d0e564535f3a9c32f3ee911840ccbaf32ff9c9517c7dc8ed52cbcf6d11a1295'),
  ('N002', 'พยาบาลตัวอย่าง สอง', 'NURSE'::user_role, array['SURG_M'], 'scrypt$bc1aa7e4922d18b5189cce5388ccd07c$4fbb9c3f4c6bae63fb58c7b11c92d9d07cfbaf320446867b096099f7d6cf7b84'),
  ('H001', 'หัวหน้าหอผู้ป่วย ตัวอย่าง', 'WARD_HEAD'::user_role, array['SURG_M'], 'scrypt$1f4556e9f014bc96f20a1b54c996b7ea$f46e9d158e36e5c95919b3cb2507c35a06a42f2dfd0e0e7f828de782043353b3'),
  ('IC01', 'พยาบาล IC ตัวอย่าง', 'IC_NURSE'::user_role, array['SURG_M'], 'scrypt$bc040de9a981e0ceab3b0f316ee796e3$a463d6daee03226062c8a281dc22207448fc801d0a73eb95e51e3e09578c9701'),
  ('AU01', 'ผู้ประเมิน ตัวอย่าง', 'AUDITOR'::user_role, array['SURG_M'], 'scrypt$13c66a5a9697635fe612259232ba2061$c8c766f6fd101c3bba900cda53bf22d0fe633d4e94d17a5cc1c26b360ba40070'),
  ('AD01', 'ผู้ดูแลระบบ ตัวอย่าง', 'ADMIN'::user_role, array['SURG_M'], 'scrypt$98d1ebe968be602714513f2a7259e04c$c322e94358fea1ac64330a2c303ee2848f1e6db16d71d59a1ebf1c2176faac73');

insert into tag (tag_code, ward_code, bed_no) values
  ('SM-B01', 'SURG_M', '1'),
  ('SM-B02', 'SURG_M', '2'),
  ('SM-B03', 'SURG_M', '3'),
  ('SM-B04', 'SURG_M', '4'),
  ('SM-B05', 'SURG_M', '5'),
  ('SM-B06', 'SURG_M', '6'),
  ('SM-B07', 'SURG_M', '7'),
  ('SM-B08', 'SURG_M', '8'),
  ('SM-B09', 'SURG_M', '9'),
  ('SM-B10', 'SURG_M', '10'),
  ('SM-B11', 'SURG_M', '11'),
  ('SM-B12', 'SURG_M', '12'),
  ('SM-B13', 'SURG_M', '13'),
  ('SM-B14', 'SURG_M', '14'),
  ('SM-B15', 'SURG_M', '15'),
  ('SM-B16', 'SURG_M', '16'),
  ('SM-B17', 'SURG_M', '17'),
  ('SM-B18', 'SURG_M', '18'),
  ('SM-B19', 'SURG_M', '19'),
  ('SM-B20', 'SURG_M', '20'),
  ('SM-B21', 'SURG_M', '21'),
  ('SM-B22', 'SURG_M', '22'),
  ('SM-B23', 'SURG_M', '23'),
  ('SM-B24', 'SURG_M', '24'),
  ('SM-B25', 'SURG_M', '25'),
  ('SM-B26', 'SURG_M', '26'),
  ('SM-B27', 'SURG_M', '27'),
  ('SM-B28', 'SURG_M', '28'),
  ('SM-B29', 'SURG_M', '29'),
  ('SM-B30', 'SURG_M', '30');

