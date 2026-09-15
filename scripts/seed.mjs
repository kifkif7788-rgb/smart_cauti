#!/usr/bin/env node
/**
 * สร้างไฟล์ SQL สำหรับ seed ข้อมูลเริ่มต้น
 *
 *   node scripts/seed.mjs > supabase/migrations/0002_seed.sql
 *
 * สคริปต์นี้สร้าง PIN hash และรหัสป้ายให้ใหม่ทุกครั้งที่รัน
 * แล้วพิมพ์ PIN กับ URL ของป้ายออกทาง stderr เพื่อให้จดไว้
 * (stdout เป็น SQL ล้วน จึง redirect ลงไฟล์ได้เลย)
 *
 * ต้องตั้ง QR_SECRET ให้ตรงกับที่ใช้ตอน deploy มิฉะนั้นป้ายที่พิมพ์จะใช้ไม่ได้
 */

import { scrypt, randomBytes, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';

const scryptAsync = promisify(scrypt);

// อ่าน .env.local ถ้ามี เพื่อให้ QR_SECRET ตรงกับที่แอปใช้
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  /* ไม่มีไฟล์ก็ไม่เป็นไร */
}

const QR_SECRET = process.env.QR_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

if (!QR_SECRET || QR_SECRET.length < 32) {
  console.error('❌ ต้องตั้ง QR_SECRET (อย่างน้อย 32 อักขระ) ก่อนรันสคริปต์นี้');
  process.exit(1);
}

async function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(pin, salt, 32);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

function signTagCode(tagCode) {
  return createHmac('sha256', QR_SECRET).update(tagCode).digest('base64url').slice(0, 12);
}

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTagCode(prefix) {
  let suffix = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i += 1) suffix += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  return `${prefix}-${suffix}`;
}

function randomPin() {
  // หลีกเลี่ยง PIN ที่เดาง่าย เช่น 000000 หรือ 123456
  let pin;
  do {
    pin = String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0');
  } while (/^(\d)\1{5}$/.test(pin) || pin === '123456');
  return pin;
}

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const WARD = 'SURG_M';
const TAG_PREFIX = 'SM';

const USERS = [
  { employeeId: 'N001', fullName: 'พยาบาลตัวอย่าง หนึ่ง', role: 'NURSE' },
  { employeeId: 'N002', fullName: 'พยาบาลตัวอย่าง สอง', role: 'NURSE' },
  { employeeId: 'H001', fullName: 'หัวหน้าหอผู้ป่วย ตัวอย่าง', role: 'WARD_HEAD' },
  { employeeId: 'IC01', fullName: 'พยาบาล IC ตัวอย่าง', role: 'IC_NURSE' },
  { employeeId: 'AU01', fullName: 'ผู้ประเมิน ตัวอย่าง', role: 'AUDITOR' },
  { employeeId: 'AD01', fullName: 'ผู้ดูแลระบบ ตัวอย่าง', role: 'ADMIN' },
];

const TAG_COUNT = 25; // ตามงบประมาณโครงการ 20–30 ชิ้น

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

const lines = [];
lines.push('-- ════════════════════════════════════════════════════════════');
lines.push('--  Smart CAUTI GUARD — Seed data');
lines.push(`--  สร้างเมื่อ ${today.toISOString()}`);
lines.push('--  PIN และ URL ของป้ายถูกพิมพ์ออกทาง stderr ตอนรันสคริปต์');
lines.push('-- ════════════════════════════════════════════════════════════');
lines.push('');

// ── study ────────────────────────────────────────────────────────────
lines.push('insert into study (name, ward_code, current_mode, baseline_start, study_end)');
lines.push('values (');
lines.push(`  ${quote('Smart CAUTI GUARD — หอผู้ป่วยศัลยกรรมชาย')},`);
lines.push(`  ${quote(WARD)},`);
lines.push(`  'BASELINE',`);
lines.push(`  ${quote(iso(today))},`);
lines.push(`  ${quote(iso(addDays(today, 28)))}`);
lines.push(');');
lines.push('');

// ── users ────────────────────────────────────────────────────────────
const credentials = [];
lines.push('insert into app_user (employee_id, full_name, role, ward_codes, pin_hash) values');
const userRows = [];
for (const user of USERS) {
  const pin = randomPin();
  const hash = await hashPin(pin);
  credentials.push({ ...user, pin });
  userRows.push(
    `  (${quote(user.employeeId)}, ${quote(user.fullName)}, ${quote(user.role)}::user_role, ` +
      `array[${quote(WARD)}], ${quote(hash)})`,
  );
}
lines.push(userRows.join(',\n') + ';');
lines.push('');

// ── tags ─────────────────────────────────────────────────────────────
const tags = [];
const seen = new Set();
while (tags.length < TAG_COUNT) {
  const code = generateTagCode(TAG_PREFIX);
  if (seen.has(code)) continue;
  seen.add(code);
  tags.push(code);
}

lines.push('insert into tag (tag_code, ward_code) values');
lines.push(tags.map((c) => `  (${quote(c)}, ${quote(WARD)})`).join(',\n') + ';');
lines.push('');

process.stdout.write(lines.join('\n') + '\n');

// ── ข้อมูลที่ต้องจดไว้ ────────────────────────────────────────────────
console.error('\n═══ บัญชีผู้ใช้ (เก็บเป็นความลับ และเปลี่ยน PIN หลังเข้าใช้ครั้งแรก) ═══\n');
for (const c of credentials) {
  console.error(`  ${c.employeeId.padEnd(6)} ${c.role.padEnd(10)} PIN ${c.pin}   ${c.fullName}`);
}

console.error(`\n═══ รหัสป้าย QR ${TAG_COUNT} ใบ — URL สำหรับพิมพ์ลงป้าย ═══\n`);
for (const code of tags) {
  console.error(`  ${code}   ${BASE_URL}/s/${code}?k=${signTagCode(code)}`);
}
console.error(
  '\n⚠️  URL เหล่านี้ผูกกับ QR_SECRET ปัจจุบัน — ถ้าเปลี่ยน secret ป้ายที่พิมพ์แล้วจะใช้ไม่ได้ทั้งหมด\n',
);
