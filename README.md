# Smart CAUTI GUARD

ระบบบันทึกและติดตามการปฏิบัติตาม CAUTI Maintenance Bundle (CHECK 5) สำหรับหอผู้ป่วยศัลยกรรมชาย
รองรับโครงการวิจัยกึ่งทดลองแบบ one-group pretest–posttest ระยะเวลา 1 เดือน

**Stack** — Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · PWA

---

## สิ่งที่ต้องเข้าใจก่อนแก้โค้ด

### Study Mode คือหัวใจของระบบ

ระบบทำงานสองโหมด และ**ความถูกต้องของข้อมูลวิจัยทั้งชุดขึ้นอยู่กับเรื่องนี้**

| โหมด | ช่วง | พฤติกรรม |
|---|---|---|
| `BASELINE` | สัปดาห์ที่ 1 | บันทึก CHECK 5 ตามปกติ แต่**ไม่แสดง feedback** แก่ผู้ปฏิบัติงาน |
| `INTERVENTION` | สัปดาห์ที่ 2–4 | แสดง feedback เต็มรูปแบบ เปิด dashboard ให้พยาบาล |

กฎที่ห้ามละเมิด:

1. **เซิร์ฟเวอร์ต้องไม่ส่ง feedback กลับมาในโหมด BASELINE** — ไม่ใช่แค่ให้ client ซ่อน
   ถ้าส่งลงมาแล้วซ่อน ผู้ใช้ที่เปิด devtools หรือ bug ของ client จะทำให้ intervention รั่ว
   จุดบังคับใช้อยู่ที่ `src/app/api/assessments/response.ts` และมี test คุมที่ `response.test.ts`
2. **ห้ามสลับกลับจาก INTERVENTION เป็น BASELINE** — บังคับใน `src/lib/study.ts`
   เพราะเมื่อผู้ปฏิบัติงานได้รับ feedback แล้ว ข้อมูลหลังจากนั้นไม่ใช่ baseline อีกต่อไป
3. **`AUDITOR` ไม่เห็น feedback ในทุกโหมด** — ผู้ประเมินต้องสังเกตอย่างอิสระ
4. **ทุก assessment บันทึก `study_mode` ณ เวลาที่บันทึกจริง** — ห้ามอนุมานย้อนหลังจากวันที่

### ไม่เก็บข้อมูลระบุตัวตนผู้ป่วย

สคีมานี้**ไม่มีคอลัมน์สำหรับ HN หรือชื่อผู้ป่วย** โดยตั้งใจ ใช้ `study_code` (Study ID) เท่านั้น
เพราะป้าย QR ติดอยู่บน drainage tubing ซึ่งผู้อื่นในหอผู้ป่วยมองเห็นได้
ตารางเชื่อม Study ID กับ HN เก็บแยกนอกระบบตามนโยบายหน่วยงาน

`POST /api/episodes` ปฏิเสธ Study ID ที่เป็นตัวเลขล้วน 7 หลักขึ้นไป เพื่อกัน HN หลุดเข้ามาโดยไม่ตั้งใจ

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

สคริปต์จะพิมพ์ **PIN ของผู้ใช้แต่ละคน** และ **URL ของป้าย QR ทั้ง 25 ใบ** ออกทาง stderr
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
- [ ] ทดสอบสแกน QR บนมือถือจริงในหอผู้ป่วย (แสงและสัญญาณต่างจากที่ทดสอบ)
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
│   ├── qr.ts            HMAC ของป้าย QR (มี test)
│   ├── auth.ts          PIN hashing + JWT session
│   ├── study.ts         อ่าน/สลับ study mode (แตะ DB)
│   ├── db.ts            Supabase service-role client
│   └── offline.ts       คิว IndexedDB สำหรับบันทึกออฟไลน์
├── app/
│   ├── api/             route handlers
│   ├── s/[tagCode]/     ปลายทางของ QR บนป้าย
│   ├── bind/[tagCode]/  ผูกป้ายกับผู้ป่วย
│   ├── assess/          แบบประเมิน CHECK 5
│   ├── result/[id]/     feedback (เฉพาะ INTERVENTION)
│   ├── dashboard/       สถานะหอผู้ป่วย
│   └── learn/           สื่อการเรียนรู้
└── components/
```

ตรรกะสำคัญถูกแยกเป็น pure function โดยตั้งใจ เพื่อให้ทดสอบได้โดยไม่ต้อง mock Supabase

---

## สถานะการพัฒนา

**เสร็จแล้ว** — flow พยาบาลครบวงจร: login → สแกน QR → ผูกป้าย → CHECK 5 → feedback →
บันทึกการแก้ไข · offline queue · baseline gating · สื่อการเรียนรู้ · dashboard สถานะพื้นฐาน

**ยังไม่ได้ทำ** — กราฟ compliance รายข้อ · เปรียบเทียบ baseline กับ intervention ·
export CSV/PDF · แบบประเมิน usability · LINE Notify · service worker (ตัว manifest พร้อมแล้ว)

---

## การทดสอบ

```bash
npm test
```

52 tests ครอบคลุม: ตรรกะ feedback ทั้ง 5 ข้อและลำดับความรุนแรง ·
การรั่วของ feedback ในโหมด baseline (ตรวจถึงระดับ JSON ที่ส่งออกจริง) ·
การคำนวณเวรที่คร่อมเที่ยงคืน · Foley Day ตามเวลาไทย · HMAC ของป้าย QR

`src/app/api/assessments/response.test.ts` เป็นชุดทดสอบที่สำคัญที่สุด —
ถ้า test นั้นแดง อย่า deploy
