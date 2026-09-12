# RSU Event Register

ระบบลงทะเบียนและเช็คอินกิจกรรม — โจทย์กลางของหลักสูตร
**อบรมเชิงปฏิบัติการ AI-Assisted Coding สำหรับการพัฒนาเว็บแอปพลิเคชัน**
ศูนย์บริการวิชาการ มหาวิทยาลัยรังสิต

## ระบบทำอะไรได้

| หน้า | ใครเข้าได้ | ทำอะไร |
|---|---|---|
| `/` | ทุกคน | ดูรายละเอียดกิจกรรมและที่นั่งคงเหลือ |
| `/register` | ทุกคน | กรอกฟอร์ม → ได้รหัสลงทะเบียนของตัวเอง |
| `/admin` | ผู้ที่มีรหัสผ่าน | ดูรายชื่อ ค้นหา เช็คอิน ส่งออก CSV |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL) · Vercel

## เริ่มใช้งาน

```bash
# 1. ติดตั้ง
npm install

# 2. ตั้งค่าตัวแปร environment
cp .env.example .env.local     # Windows: copy .env.example .env.local
#    แล้วเปิด .env.local ใส่ค่าจริงให้ครบ 5 ตัว

# 3. สร้างฐานข้อมูล — เปิด Supabase → SQL Editor แล้วรันตามลำดับ
#    db/schema.sql   →   db/rls.sql   →   db/seed.sql

# 4. รัน
npm run dev          # http://localhost:3000
```

## คำสั่งที่ใช้บ่อย

```bash
npm run dev        # โหมดพัฒนา
npm run build      # ต้องผ่านก่อน push ทุกครั้ง
npm run lint       # ESLint
npx tsc --noEmit   # ตรวจชนิดข้อมูล
```

## โครงไฟล์

```
src/app/           หน้าจอ (page.tsx, register/, admin/)
src/app/api/       route handler ฝั่งเซิร์ฟเวอร์
src/lib/db.ts      ★ โค้ดที่คุยกับฐานข้อมูล ที่เดียว
src/lib/validate.ts ★ ตรรกะตรวจข้อมูล ที่เดียว
db/                schema.sql · rls.sql · seed.sql
workshop/          ของสำหรับผู้สอน (แบบฝึก ชุดแทรกบั๊ก ต้นแบบ AGENTS.md)
```

## กติกา 5 ข้อที่ระบบนี้ต้องทำได้

| | กติกา |
|---|---|
| R1 | อีเมลซ้ำในกิจกรรมเดียวกัน ลงทะเบียนไม่ได้ (ไม่สนตัวพิมพ์เล็ก-ใหญ่) |
| R2 | ที่นั่งเต็มแล้วต้องปิดรับ |
| R3 | ชื่อ/อีเมล/เบอร์ บังคับกรอก อีเมลถูกรูปแบบ เบอร์ 10 หลัก |
| R4 | หน้าแอดมินต้องใส่รหัสผ่านก่อนเข้า |
| R5 | รหัสลงทะเบียนห้ามซ้ำ |

ทุกข้อบังคับทั้งที่ฝั่งเซิร์ฟเวอร์และที่ฐานข้อมูล — รายละเอียดอยู่ใน `design.md`

## ความปลอดภัย

ตาราง `registrations` ไม่เปิดให้คีย์สาธารณะแตะเลย ทุกการอ่าน/เขียนผ่าน `src/app/api/`
ตรวจด้วยตัวเองได้ตามวิธีท้ายไฟล์ `db/rls.sql`

## Deploy

1. push ขึ้น GitHub (ตรวจก่อนว่า `.env.local` ไม่ติดไปด้วย)
2. Vercel → Add New Project → เลือก repository
3. ใส่ตัวแปรทั้ง 5 ตัวใน Environment Variables
4. Deploy — แล้ว **Redeploy อีกครั้งหลังใส่ตัวแปร**

## เอกสารในโปรเจกต์

- `requirements.md` — สเปกและ acceptance criteria
- `design.md` — สถาปัตยกรรม โครงตาราง และเหตุผลของการออกแบบ
- `AGENTS.md` — กติกาสำหรับ AI agent ที่มาทำงานในโปรเจกต์นี้
