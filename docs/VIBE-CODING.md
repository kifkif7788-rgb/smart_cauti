# Smart CAUTI — คู่มือพัฒนาต่อจากดีไซน์

## เป้าหมาย

แอปภาษาไทยสำหรับใช้งานข้างเตียง: สแกน QR → CHECK 5 → ผลและการแก้ไข → Dashboard
อ้างอิงภาพดีไซน์ 4 หน้าจอที่ผู้ใช้ให้มา ใช้หน้าจอจริงตาม route ไม่ใส่กรอบโทรศัพท์ลงในแอป
ออกแบบ mobile first รองรับจอใหญ่ด้วยพื้นที่อ่านกว้างสูงสุด 540px ตาม `.assessment-page` และ page containers ใน CSS

## สิ่งที่ทำแล้ว

- หน้าแรก: แบรนด์โล่สีเขียวฟ้า ปุ่มเปิดกล้องสแกนสีเขียว จุดเด่น 4 ข้อ และข้อความส่งเสริมการดูแล
- Login ใช้แบรนด์เดียวกัน; header ฟ้าอ่อนและเมนูหน้าหลัก/สแกน/สื่อการเรียนรู้
- CHECK 5: การ์ดสีเขียว ฟ้า เหลือง ม่วง ชมพู แยก NEED / FIX / FLOW / BELOW / CLOSED
- คงการตอบครบ 5 ข้อ การกู้ร่าง หมายเหตุ การส่งข้อมูล และคิวออฟไลน์
- ผลลัพธ์: สีสถานะ คำแนะนำรายข้อ ส่วนข้อที่ผ่าน และข้อความดูแลต่อเนื่อง
- Dashboard: จำนวน Foley, Foley > 3 วัน, สถานะผลล่าสุด, วงแหวน bundle compliance, กราฟรายข้อ, กราฟ Foley 7 วัน
- Dashboard รีเฟรชทุก 60 วินาทีขณะแท็บมองเห็น และมีปุ่มอัปเดตทันที
- ใช้ SVG/CSS สำหรับโล่และกราฟ ไม่มี library กราฟเพิ่ม

ภาพโล่เป็น vector ที่สร้างในโค้ดให้เข้าธีม ยังไม่ใช่ artwork ต้นฉบับ ภาพพยาบาลเป็นภาพที่สร้างด้วย built-in imagegen พื้นหลังโปร่งใส อยู่ที่ `public/images/nurse-mascot.png` ใช้ Next Image เพื่อปรับขนาดภาพส่งให้ browser ภาพบนปุ่มสแกนเป็นไอคอน ไม่ใช่ QR ผู้ป่วยจริง กดแล้วเปิด `/scan` เพื่อสแกนแท็กเตียงที่มีลายเซ็นตามระบบเดิม

## แผนที่โค้ด

| ไฟล์ | หน้าที่ |
|---|---|
| `src/app/globals.css` | Design tokens, dark mode, การ์ด แบรนด์ และกราฟ |
| `src/components/Brand.tsx` | ShieldMark, Brand, ScanHero, CareNote |
| `src/components/AppHeader.tsx` | Header และเมนู |
| `src/app/page.tsx` | หน้าแรก รายการค้างในเวร ทางลัดตามสิทธิ์ |
| `src/components/QrScanner.tsx` | กล้อง/ตรวจ QR เดิม |
| `src/components/Check5Form.tsx` | ฟอร์มจริงและสถานะ client |
| `src/lib/check5.ts` | คำถาม คำแนะนำ และกฎประเมินกลาง |
| `src/app/result/[id]/page.tsx` | ผลลัพธ์และ feedback ตามโหมดวิจัย |
| `src/components/CorrectiveActionPanel.tsx` | บันทึกแก้ไข/บันทึกว่าแจ้งทีม |
| `src/app/dashboard/page.tsx` | Query ข้อมูลและส่ง props เข้า DashboardView |
| `src/components/DashboardView.tsx` | หน้าตา Dashboard ที่ใช้ทั้งหน้าจริงและ preview |
| `src/components/AssessmentFeedback.tsx` | Banner, คำแนะนำ, คำเตือน และข้อที่ผ่าน ใช้ร่วมกับ preview |
| `src/components/UiIcon.tsx` | ชุด SVG icons และ BundleIcon ห้าสี |
| `src/app/design-preview/page.tsx` | ตัวอย่างทั้ง 4 หน้าจอ เฉพาะ development |
| `src/components/DashboardRefresh.tsx` | การรีเฟรชข้อมูล |
| `src/lib/dashboard.ts` | คำนวณกราฟย้อนหลังตามวันไทย |
| `src/lib/dashboard.test.ts` | ทดสอบวันใส่/ถอดและเขตเวลา |

## กติกาดีไซน์

- ฟอนต์ Sarabun จาก local font; ไม่เพิ่ม dependency โหลดฟอนต์ภายนอก
- Primary blue `#0758ac`, brand green `#006951`, พื้นหลัง `#f3f9fe`
- CHECK 5: NEED เขียว, FIX ฟ้า, FLOW เหลือง, BELOW ม่วง, CLOSED ชมพู
- สีประจำข้อไม่ใช่สถานะทางคลินิก: สีสถานะใช้ `--pass`, `--correct`, `--review`
- ขอบมน 16–26px, พื้นสีอ่อน, ปุ่มหลัก gradient น้ำเงิน, ปุ่มสแกนเขียว
- คง touch targets 48px สำหรับคำตอบ ไม่ย่อปุ่มจนใช้งานด้วยถุงมือยากเพื่อให้เหมือนภาพ
- สื่อสารสถานะด้วยข้อความร่วมกับสี และรองรับ focus/keyboard/reduced motion
- รองรับ dark mode เดิม; เมื่อเพิ่ม pastel ใหม่ต้องกำหนดสีมืดด้วย
- หน้าที่ต้องยืนยันผู้ป่วยใช้ข้อมูลจริงที่ schema มี ไม่เติมชื่อ อายุ เพศตามตัวอย่างในภาพ

## นิยามข้อมูล Dashboard

1. Scope: episode ใน ward ที่ผู้ใช้มีสิทธิ์ ตามกติกาเดิม
2. จำนวน Foley: episode ที่ `is_active = true`; Foley > 3 วันใช้ `foleyDay()` เดิม
3. ผลประเมิน: เฉพาะ source `NURSE`, study mode ปัจจุบัน และช่วงเวรปัจจุบันตาม Asia/Bangkok
4. ใช้ assessment ล่าสุดต่อ episode เพียงหนึ่งรายการ ป้องกันประเมินซ้ำทำให้ตัวเลขผู้ป่วยเพิ่ม
5. ตัวหาร compliance คือผู้ป่วยที่ประเมินแล้วในเวรนี้; ผู้ยังไม่ประเมินแสดงแยก ไม่ถือว่าผ่าน
6. วงแหวน = จำนวนที่ผ่านครบทั้ง 5 / จำนวนที่ประเมิน; กราฟรายข้อใช้ตัวหารเดียวกัน
7. ไม่มีผลแสดง `—` ไม่ใช่ 0% หรือข้อมูลตัวอย่าง
8. กราฟ 7 วันนับ episode ที่ `insert_date <= วัน` และยังไม่ถอดหรือ `remove_date >= วัน` จึงรวมวันใส่และวันถอด ตัวเลขวันนี้อาจมากกว่าจำนวน active เพราะรวมรายที่ถอดวันนี้
9. กราฟย้อนหลังใช้ ward ปัจจุบันใน episode ไม่ได้สร้างประวัติย้าย ward ย้อนหลัง; มีคำอธิบายบนหน้าจอ
10. อัปเดตแบบ polling 60 วินาที ไม่ใช่ Supabase Realtime subscription
11. Query ล้มเหลวต้องไม่แสดงว่าไม่มีผู้ป่วย; กราฟย้อนหลังแสดงข้อความโหลดไม่สำเร็จ

## ข้อจำกัดที่ต้องรักษา

- อ่าน `AGENTS.md`, `README.md` และ Next.js guide ใน `node_modules/next/dist/docs/` ก่อนแก้
- ทุก role เห็นผล/คำแนะนำได้ทั้ง BASELINE และ INTERVENTION; ยังคงตรวจ session ที่หน้าและ API
- ไม่ใส่ HN ใน QR, URL, export วิจัย หรือกราฟรวม
- ไม่แก้ข้อความ/เกณฑ์ทางคลินิกเพื่อให้สั้นตามโปสเตอร์โดยไม่มีข้อกำหนดใหม่
- ปุ่ม “แจ้งทีม / แพทย์” เดิมเป็นการบันทึกสถานะ ไม่ใช่ส่ง LINE/email จริง
- ไม่เปลี่ยน logic การสแกน ลายเซ็น QR และการจัดการแท็กเสียจากงานเดิมโดยไม่จำเป็น
- ไม่แทนข้อมูลจริงด้วยตัวเลขตัวอย่าง 12 ราย / 92% จากภาพ

## งานแนะนำรอบถัดไป

- ตรวจหน้าจอจริงที่ 360, 390, 768 และ 1440px ทั้ง light/dark ด้วยบัญชีแต่ละ role
- หากมี artwork ต้นฉบับที่ได้รับอนุญาต สามารถแทนโล่ SVG และภาพพยาบาลที่สร้างใหม่ได้
- เพิ่ม dashboard error boundary และสถานะการโหลดระหว่างรีเฟรชอัตโนมัติ
- หากข้อมูลเกิน Supabase row limit ให้ย้าย aggregation ไป SQL/RPC ที่ตรวจสิทธิ์ หรือ paginate ให้ครบก่อนคำนวณ
- หากต้องการตัวเลขย้อนหลังตามตำแหน่งจริง ณ วันนั้น ให้เพิ่มประวัติย้าย ward ก่อนแก้กราฟ
- หากต้องการ push real-time ให้เพิ่ม subscription พร้อม unsubscribe และสิทธิ์ที่เหมาะสม

## วิธีตรวจงาน

```sh
npm test
npx tsc --noEmit
npm run build
npm run dev
```

ใช้ `.env.local` และฐานข้อมูลตาม README อย่าบันทึกค่า secret ลงเอกสาร
ทดสอบ manual: login → scan แท็กจริง → ยืนยันผู้ป่วย → ตอบ 5 ข้อ → ส่ง → บันทึกแก้ไข → dashboard
ตรวจคำตอบไม่ครบ, ผ่านทั้งหมด, ไม่ผ่านหลายข้อ, offline, เวรข้ามเที่ยงคืน, ไม่มีข้อมูล และ BASELINE

## Prompt สำหรับ vibe code ต่อ

> อ่าน AGENTS.md, README.md และ docs/VIBE-CODING.md ก่อนเริ่ม รักษา flow และสิทธิ์ผู้ใช้ของ Smart CAUTI ใช้ดีไซน์ pastel ตาม CHECK 5 และ component ที่มีอยู่ ห้ามใช้ mock data ปะปนกับข้อมูลจริง งานรอบนี้คือ [ระบุงาน] แก้ให้ทำงานครบตาม flow แล้วตรวจ tests/typecheck/build พร้อมรายงานข้อจำกัดที่ยังไม่ได้ตรวจใน browser

## ผลตรวจรอบปรับดีไซน์

- `npm test`: ผ่าน 76 tests (รวมกราฟย้อนหลัง 2 tests)
- `npx tsc --noEmit`: ผ่าน
- `npm run build -- --webpack`: ผ่าน
- Turbopack ใน environment นี้เปิดพอร์ตสำหรับประมวลผล CSS ไม่ได้ (`Operation not permitted`); ใช้ Webpack ตรวจ build ได้ โดยไม่เปลี่ยน default script ของโปรเจกต์
- ตรวจภาพใน Chrome แล้วที่ 390px ครบทั้ง 4 หน้าจอ, CHECK 5 ที่ 360px dark mode, และหน้าแรกที่ 1440px โดยไม่มี horizontal overflow
- ทดสอบ interaction ใน preview: ตอบไม่ครบ, เลือกครบ 5 ข้อ, สลับใช่/ไม่ใช่, เปิดคำอธิบาย, ส่งตัวอย่าง และขนาดปุ่มขั้นต่ำ 48px ผ่าน
- ยังไม่ได้ทำ end-to-end กับกล้องและฐานข้อมูลจริง


## รอบเก็บรายละเอียดให้เหมือน mock

- หน้าแรกใช้โล่ที่มีสายสวนและถุงปัสสาวะ, ฉากโรงพยาบาลแบบ SVG, ปุ่ม SCAN ME และการ์ตูนพยาบาลกับกล่องข้อความ
- Header กึ่งโปร่งใส ชื่อแอปตรงกลาง ไอคอนบ้านและเมนูเส้นเดียวกัน
- CHECK 5 ใช้การ์ดผู้ป่วยกระชับ, progress ด้านบน, ไอคอนวงกลมห้าสี และคำอธิบายเสริมแบบเปิด/ปิด ข้อความคำถามและกฎทางคลินิกเดิมยังคงอยู่
- ข้อความคำถามไม่เปลี่ยน แต่ย้าย hint เข้า `<details>` เพื่อลดความสูงของการ์ด
- ผลลัพธ์ใช้ไอคอนสถานะวงกลม, กล่องคำแนะนำซ้อนในการ์ดพาสเทล และกล่องผ่านเกณฑ์สีเขียว
- ใช้ component หน้าจอร่วมกับ preview เพื่อลดความคลาดเคลื่อนระหว่างตัวอย่างและแอปจริง

### เปิดดูตัวอย่าง

รัน `npm run dev` แล้วเปิด `/design-preview` เลือก สแกน QR / CHECK 5 / ผลลัพธ์ / Dashboard
มีป้ายระบุข้อมูลสมมติชัดเจน ตัวอย่าง CHECK 5 ใช้ `preview` prop จึงไม่ส่ง POST หรือเขียนข้อมูลลงฐานข้อมูล
Route นี้คืน 404 เมื่อ `NODE_ENV !== 'development'` และไม่ได้เปิดเผยผู้ป่วยจริง
หน้าใช้งานจริงยังตรวจ session/role/study mode ตามเดิม

### ภาพพยาบาล

- Path: `public/images/nurse-mascot.png`
- วิธีสร้าง: built-in `image_gen` ผ่าน skill imagegen ไม่ใช้ CLI/API key
- ผู้ใช้ขอให้ใกล้ภาพ mock จึงสร้างเป็น illustration ใหม่ให้เข้าธีม ไม่ใช่การตัดจากภาพต้นฉบับ
- Prompt ที่ใช้จริง:

```text
Use case: illustration-story. Create a production website asset: a single adorable Thai female nurse mascot, waist-up, smiling warmly and giving a thumbs-up with one hand. Dark brown hair tied in a low ponytail, white traditional nurse cap with a subtle pale blue edge, white short-sleeve nurse uniform with pale blue collar and trim. Cute hand-drawn chibi illustration like friendly Thai hospital patient-safety educational posters: large head, rounded black eyes, rosy cheeks, small cheerful open smile, clean dark brown outlines, softly shaded pastel colors. Three-quarter pose facing slightly to viewer's right, thumb on viewer's right. Composition: entire cap, hair, upper body and hand fully inside canvas, generous transparent padding on all sides, single character, no other objects. Truly transparent background with alpha. No text, no logos, no hearts, no background, no floor, no border. Portrait asset to place at bottom left of a mobile UI. Save generated image asset and return local path if available.
```

## Logout

เมนูมุมขวาบนใน `AppHeader` มีปุ่ม “ออกจากระบบ” จาก `src/components/LogoutButton.tsx`
เรียก `POST /api/auth/logout` เพื่อลบ session cookie แล้วใช้ `window.location.replace('/login')`
เพื่อทิ้ง client router cache ของ session เดิม ปิดปุ่มระหว่างส่ง และแสดงข้อผิดพลาดให้ลองใหม่เมื่อเชื่อมต่อไม่ได้


## สิทธิ์ดูผลประเมิน

ทุก role (`NURSE`, `AUDITOR`, `WARD_HEAD`, `IC_NURSE`, `ADMIN`) เห็นผลประเมินหลังบันทึกได้ทั้ง BASELINE และ INTERVENTION ใช้ `shouldRevealFeedback` ร่วมกันที่ API และหน้าผลลัพธ์ เปิดบันทึกการแก้ไขได้ทุกโหมดตามข้อกำหนดล่าสุดของผู้ใช้

## แป้นตัวเลข PIN

`LoginForm` แสดงแป้นตัวเลขในหน้าเมื่อ focus ช่อง PIN พร้อมปุ่ม 0–9, ล้างทั้งหมด และลบตัวล่าสุด จำกัด 6 หลักและปิดปุ่มระหว่างส่งข้อมูล ช่อง PIN ใช้ `type="password"` และ `inputMode="none"` เพื่อไม่เปิดคีย์บอร์ดมือถือซ้อนกับแป้นในแอป ยังรองรับคีย์บอร์ดจริงและการวางตัวเลข เมื่อ focus รหัสบุคลากรจะซ่อนแป้น PIN

## Favicon และไอคอนติดตั้งแอป

ใช้โล่เขียวขอบขาวและกากบาทสีขาวบนพื้นฟ้าน้ำเงิน ไม่ใส่ข้อความเพื่อให้อ่านรูปทรงได้ที่ 16px
ต้นฉบับแก้ไขได้ที่ `src/app/icon.svg`; รัน `node scripts/generate-icons.mjs` เพื่อสร้าง `favicon.ico` (16/32/48px), `apple-icon.png` (180px), `public/icon-192.png`, `public/icon-512.png` และ `public/icon-maskable-512.png`
Next.js เพิ่ม metadata สำหรับ favicon/SVG/Apple icon จากชื่อไฟล์อัตโนมัติ ส่วน PWA ใช้ path เดิมใน manifest ไอคอน maskable มีพื้นทึบและย่อโล่ให้อยู่ใน safe zone


### แก้กรณี N001 ตอบไม่ใช่ทุกข้อแล้วไม่เห็นคำแนะนำ

ฐานข้อมูลขณะตรวจอยู่ใน BASELINE จึงถูกเงื่อนไขเดิมพากลับหน้าแรก ปรับ `Check5Form` ให้เปิดหน้าผลทุกครั้งที่บันทึกออนไลน์สำเร็จ และเปิด feedback/การแก้ไขทุกโหมด โดยไม่เปลี่ยนค่า study mode ในฐานข้อมูล กรณีออฟไลน์ยังเก็บเข้าคิวตามเดิม
