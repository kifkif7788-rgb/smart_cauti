# Smart CAUTI

ระบบบันทึกและติดตามการปฏิบัติตาม CAUTI Maintenance Bundle (CHECK 5) สำหรับหอผู้ป่วยศัลยกรรมชาย
รองรับโครงการวิจัยกึ่งทดลองแบบ one-group pretest–posttest ระยะเวลา 1 เดือน

**Stack** — Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · PWA

---

## สิ่งที่ต้องเข้าใจก่อนแก้โค้ด

### Study Mode คือหัวใจของระบบ

ระบบเก็บโหมดไว้เพื่อจัดกลุ่มข้อมูล โดยข้อกำหนดปัจจุบันเปิดผลและคำแนะนำให้ทุก role ในทั้งสองโหมด

| โหมด | ช่วง | พฤติกรรม |
|---|---|---|
| `BASELINE` | สัปดาห์ที่ 1 | บันทึก CHECK 5 และแสดงผลพร้อมคำแนะนำให้ทุก role |
| `INTERVENTION` | สัปดาห์ที่ 2–4 | แสดง feedback เต็มรูปแบบ เปิด dashboard ให้พยาบาล |

กติกาปัจจุบัน:

1. ทุก role รวม `NURSE` และ `AUDITOR` เห็นผล/คำแนะนำทั้ง BASELINE และ INTERVENTION
2. หลังบันทึกสำเร็จเปิด `/result/[id]` ทุกโหมด และบันทึกการแก้ไขได้ทั้งสองโหมด
3. ทุก assessment บันทึก `study_mode` ณ เวลาที่บันทึกจริง ไม่แก้โหมดหรือข้อมูลเก่าย้อนหลัง
4. สิทธิ์ Dashboard และกติกาสลับโหมดโครงการยังใช้เงื่อนไขเดิม

### QR ผูกกับเตียง ไม่ผูกกับผู้ป่วย

ป้าย QR หนึ่งใบต่อหนึ่งเตียง (เตียง 1–30 → `SM-B01`…`SM-B30`) ติดถาวรที่เตียง
ไม่ต้องเปลี่ยนป้ายเมื่อผู้ป่วยเปลี่ยน สแกนแล้วระบบดูว่าเตียงนั้นมีผู้ป่วยคาสายอยู่หรือไม่

- เตียงว่าง → หน้าลงทะเบียน (กรอก HN + วันที่ใส่สาย)
- มีผู้ป่วยอยู่ → หน้าประเมิน CHECK 5

พิมพ์ป้ายพร้อมเลขเตียงตัวใหญ่ได้ที่ `/admin/tags` (role ADMIN หรือ WARD_HEAD)

### HN กับข้อมูลงานวิจัยแยกกันคนละชั้น

ระบบเก็บ **HN** ไว้ใช้ยืนยันตัวผู้ป่วยหน้าเตียงและเชื่อมกับ HIS ภายหลัง
และสร้าง **Study ID** (`SM-001`, `SM-002`…) ให้อัตโนมัติจาก sequence สำหรับงานวิจัย

HN ไม่เคยปรากฏใน:

- **QR code** — บรรจุเพียงรหัสเตียงกับลายเซ็น HMAC
- **ไฟล์ export งานวิจัย** — view `research_assessment` ไม่มีคอลัมน์ `hn` ตั้งแต่ต้นทาง
- **URL หรือ query string** — กันรั่วผ่าน log ของเซิร์ฟเวอร์
- **audit log** — บันทึก `study_code` แทน

ในรายการรวมบนหน้าแรก HN ถูกปิดบังเหลือ 4 ตัวท้าย แสดงเต็มเฉพาะหน้าประเมิน
ที่พยาบาลต้องยืนยันว่าประเมินถูกคน และการเปิดดูทุกครั้งถูกบันทึก audit log

> โครงการวิจัยระบุให้ใช้ Study ID ในการเชื่อมข้อมูล — การเก็บ HN เพิ่มเติมนี้
> ควรแจ้งและขออนุมัติจากคณะกรรมการที่พิจารณาโครงการก่อนใช้กับผู้ป่วยจริง

### ย้ายเตียงต้องไม่รีเซ็ตวันคาสาย

เมื่อผู้ป่วยย้ายเตียงโดยยังคาสายเส้นเดิม ต้องใช้ปุ่ม **ย้ายเตียง**
ซึ่งคง `episode_id`, `study_code` และ `insert_date` เดิมไว้ทั้งหมด

ถ้าเผลอปิดรายการเก่าแล้วเปิดใหม่ Foley Day จะกลับไปเป็น 1
ผู้ป่วยที่คาสายมา 6 วันจะหลุดจากการเตือน "ทบทวนข้อบ่งชี้เมื่อเกิน 3 วัน"
ซึ่งเป็นกลไกหลักของโครงการ — ระบบจึงปฏิเสธการลงทะเบียน HN ที่มี episode active อยู่แล้ว
และเสนอทางลัดไปหน้าย้ายเตียงแทน

### ระบบไม่ทดแทนการตัดสินใจทางคลินิก

ไม่มีฟังก์ชันสั่งถอดสาย หน้าผลลัพธ์แสดงคำเตือนนี้ทุกครั้งที่พบ Review for Removal และปิดไม่ได้

---

## เริ่มใช้งาน

### 1. ติดตั้ง

```bash
npm install
cp .env.example .env.local
```

### 2. สร้าง secret

```bash
openssl rand -base64 48   # ใส่ใน SESSION_SECRET
openssl rand -base64 48   # ใส่ใน QR_SECRET
```

> **สำคัญ:** เมื่อเปลี่ยน `QR_SECRET` ป้าย QR ที่พิมพ์ไปแล้วทั้งหมดจะใช้ไม่ได้ทันที

### 3. สร้างฐานข้อมูล

สร้างโปรเจ็คที่ [supabase.com](https://supabase.com) แล้วรัน SQL ตามลำดับใน SQL Editor:

```
supabase/migrations/0001_init.sql
```

กรอก `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ลง `.env.local`

### 4. Seed ข้อมูลเริ่มต้น

```bash
node scripts/seed.mjs > supabase/migrations/0002_seed.sql
```

สคริปต์จะพิมพ์ **PIN ของผู้ใช้แต่ละคน** และ **URL ของป้าย QR ทั้ง 30 เตียง** ออกทาง stderr
จดไว้ให้ครบก่อนปิดหน้าต่าง เพราะ PIN เก็บเป็น hash และดูย้อนหลังไม่ได้

จากนั้นรัน `0002_seed.sql` ใน Supabase SQL Editor

### 5. รัน

```bash
npm run dev     # http://localhost:3000
npm run build   # ตรวจ type และ build
npm test        # รัน test ทั้งหมด
```

---

## Deploy บน Vercel

1. push โค้ดขึ้น GitHub แล้ว import เข้า Vercel
2. ตั้ง environment variables ให้ครบตาม `.env.example`
   โดย `NEXT_PUBLIC_BASE_URL` ต้องเป็น URL จริงของระบบ
3. deploy แล้ว**สร้าง URL ป้ายใหม่** ด้วย `NEXT_PUBLIC_BASE_URL` ที่ถูกต้องก่อนพิมพ์ป้าย

ตรวจก่อนเปิดใช้จริง:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` ไม่ได้ขึ้นต้นด้วย `NEXT_PUBLIC_`
- [ ] RLS เปิดอยู่ทุกตาราง (สคีมาตั้งไว้แล้ว — เข้าถึงได้เฉพาะ service role)
- [ ] `study.current_mode` เป็น `BASELINE` ก่อนเริ่มเก็บข้อมูลสัปดาห์แรก
- [ ] พิมพ์ป้ายจาก `/admin/tags` หลังตั้ง `NEXT_PUBLIC_BASE_URL` เป็น URL จริงแล้วเท่านั้น
- [ ] ทดสอบสแกน QR ที่พิมพ์จริงในหอผู้ป่วย (แสงและสัญญาณต่างจากที่ทดสอบ)
- [ ] โครงการผ่านการพิจารณาตามนโยบายหน่วยงานแล้ว

---

## โครงสร้างโค้ด

```
src/
├── lib/
│   ├── check5.ts        นิยาม CHECK 5 และตรรกะ feedback (pure, มี test)
│   ├── study-mode.ts    ประตูเปิดเผย feedback (pure, มี test)
│   ├── auth-roles.ts    กฎสิทธิ์ตาม role (pure, มี test)
│   ├── shift.ts         เวรและ Foley Day ตามเวลาไทย (pure, มี test)
│   ├── qr.ts            รหัสเตียงและ HMAC ของป้าย QR (มี test)
│   ├── hn.ts            ตรวจและปิดบัง HN (pure, มี test)
│   ├── auth.ts          PIN hashing + JWT session
│   ├── study.ts         อ่าน/สลับ study mode (แตะ DB)
│   ├── db.ts            Supabase service-role client
│   └── offline.ts       คิว IndexedDB สำหรับบันทึกออฟไลน์
├── app/
│   ├── api/             route handlers
│   ├── s/[tagCode]/     ปลายทางของ QR บนป้าย
│   ├── bind/[tagCode]/  ลงทะเบียนผู้ป่วยที่เตียงว่าง (กรอก HN)
│   ├── admin/tags/      หน้าพิมพ์ป้าย QR 30 เตียง
│   ├── assess/          แบบประเมิน CHECK 5
│   ├── result/[id]/     feedback (ทุกโหมด)
│   ├── dashboard/       สถานะหอผู้ป่วย
│   └── learn/           สื่อการเรียนรู้
└── components/
```

ตรรกะสำคัญถูกแยกเป็น pure function โดยตั้งใจ เพื่อให้ทดสอบได้โดยไม่ต้อง mock Supabase

---

## สถานะการพัฒนา

**เสร็จแล้ว** — flow พยาบาลครบวงจร: login → สแกน QR ประจำเตียง → ลงทะเบียน HN →
CHECK 5 → feedback → บันทึกการแก้ไข · ย้ายเตียง · ปิดรายการ (ถอดสาย/จำหน่าย) ·
offline queue · baseline gating · หน้าพิมพ์ป้าย QR 30 เตียง · สื่อการเรียนรู้ ·
dashboard สถานะพื้นฐาน

**ยังไม่ได้ทำ** — กราฟ compliance รายข้อ · เปรียบเทียบ baseline กับ intervention ·
export CSV/PDF · แบบประเมิน usability · LINE Notify · service worker (ตัว manifest พร้อมแล้ว)

---

## การทดสอบ

```bash
npm test
```

74 tests ครอบคลุม: ตรรกะ feedback ทั้ง 5 ข้อและลำดับความรุนแรง ·
ผลประเมินทุก role ทั้งสองโหมด รวมกรณีตอบไม่ใช่ครบ 5 ข้อ ·
การคำนวณเวรที่คร่อมเที่ยงคืน · Foley Day ตามเวลาไทย · รหัสเตียงและ HMAC ·
การปิดบัง HN · กฎการย้ายเตียงที่ต้องไม่รีเซ็ตวันคาสาย

`src/app/api/assessments/response.test.ts` เป็นชุดทดสอบที่สำคัญที่สุด —
ถ้า test นั้นแดง อย่า deploy

## คู่มือดีไซน์และพัฒนาต่อ

ดู [docs/VIBE-CODING.md](docs/VIBE-CODING.md) สำหรับหน้าจออ้างอิง โครงสร้าง component, design tokens, นิยามตัวเลข Dashboard และ prompt สำหรับพัฒนาต่อ
