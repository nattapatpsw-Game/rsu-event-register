<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# กติกาโปรเจกต์ — RSU Event Register

โปรเจกต์นี้เป็น**โจทย์กลางของหลักสูตรอบรมเชิงปฏิบัติการ AI-Assisted Coding สำหรับการพัฒนาเว็บแอปพลิเคชัน**
ไฟล์นี้คือกติกาของโปรเจกต์ ทุก agent ที่เปิดโฟลเดอร์นี้ต้องทำตาม ไม่ว่าจะเป็น Antigravity, Claude Code, Codex หรือเครื่องมืออื่น

---

## 0. อ่านอะไรก่อนเริ่มงานทุกครั้ง

1. `requirements.md` — สเปกและ acceptance criteria (ผลลัพธ์ขั้นที่ 1)
2. `design.md` — โครงหน้าจอ flow และเหตุผลของการออกแบบ (ผลลัพธ์ขั้นที่ 2)
3. `db/schema.sql` — โครงตารางจริง ห้ามเดา field name เอง
4. ไฟล์นี้

ถ้าสิ่งที่ฉันสั่ง **ขัด** กับไฟล์ทั้ง 4 ให้หยุดแล้วถามฉันก่อน อย่าเลือกข้างเอง

---

## 1. Stack ที่ล็อกไว้ — ห้ามเปลี่ยน

| ชั้น | ของที่ใช้ | เวอร์ชันที่ผูกไว้ |
|---|---|---|
| Framework | Next.js **App Router** | `16.3.4` (ไม่ใช่ Pages Router) |
| UI | React + Tailwind CSS | React `19.2.8`, Tailwind `v4` (ตั้งค่าใน CSS ไม่มี `tailwind.config.js`) |
| ไอคอน | `lucide-react` | `^1.44.0` |
| ฐานข้อมูล | Supabase (PostgreSQL) | `@supabase/supabase-js ^2.116.0` |
| Host | Vercel | — |
| ภาษา | TypeScript `strict: true` | `^5` |

- **ห้ามเพิ่ม dependency ใหม่โดยไม่ถามฉันก่อน** ทุกครั้ง ไม่มีข้อยกเว้น
  ต้องการ library ใหม่ → บอกชื่อ เหตุผล และทางเลือกที่ไม่ต้องลงอะไรเพิ่ม แล้วรอฉันตอบ
- ห้ามเปลี่ยน framework, ห้ามย้ายไป Pages Router, ห้ามเพิ่ม ORM (Prisma/Drizzle), ห้ามเพิ่ม state library, ห้ามเพิ่ม component library
- ถ้าคิดว่ามีทางที่ดีกว่า ให้**เสนอ**มา แต่อย่าลงมือเปลี่ยนเอง
- Tailwind v4: สีและ token ประกาศใน `src/app/globals.css` ใต้ `@theme inline` เท่านั้น อย่าสร้าง `tailwind.config.js`

---

## 2. โครงไฟล์จริง (ยึดตามนี้ ไม่ใช่ตามที่จำมา)

```
rsu-event-register/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              เฮดเดอร์ ฟุตเตอร์ ฟอนต์ไทย
│  │  ├─ page.tsx                หน้าแรก (Server Component)
│  │  ├─ globals.css             Tailwind v4 + ตัวแปรสีธีม
│  │  ├─ register/page.tsx       ฟอร์มลงทะเบียน (Client Component)
│  │  ├─ admin/page.tsx          หน้าแอดมิน (Client Component)
│  │  └─ api/
│  │     ├─ register/route.ts            POST  สมัคร
│  │     └─ admin/
│  │        ├─ login/route.ts            POST  เข้าสู่ระบบ
│  │        ├─ logout/route.ts           POST  ออกจากระบบ
│  │        ├─ registrations/route.ts    GET   รายชื่อผู้ลงทะเบียน
│  │        └─ checkin/route.ts          POST  สลับสถานะเช็คอิน
│  └─ lib/
│     ├─ db.ts                   ★ โค้ดที่คุยกับฐานข้อมูล อยู่ที่นี่ที่เดียว
│     ├─ validate.ts             ★ ตรรกะตรวจข้อมูล อยู่ที่นี่ที่เดียว
│     ├─ adminAuth.ts            ตรวจคุกกี้ + ตรวจว่าเป็นแอดมินจริง (R4)
│     ├─ supabaseServer.ts       client ที่สวมสิทธิ์ผู้ล็อกอิน (แนบ JWT) ใช้ฝั่งเซิร์ฟเวอร์
│     ├─ supabase.ts             client คีย์สาธารณะ (anon) — ใช้ได้ทั้งสองฝั่ง
│     └─ types.ts                ชนิดข้อมูลของ 2 ตาราง
├─ db/
│  ├─ schema.sql                 ตาราง index constraint trigger
│  ├─ seed.sql                   ข้อมูลกิจกรรมตัวอย่าง 1 แถว
│  └─ rls.sql                    สิทธิ์เข้าถึงตาราง (Row Level Security)
├─ workshop/                     ของสำหรับผู้สอน ไม่ใช่โค้ดแอป
├─ public/                       รูปและโลโก้
├─ requirements.md · design.md · AGENTS.md
└─ .env.local (ห้าม commit) · .env.example (commit ได้)
```

กติกาไฟล์:

- ชื่อโฟลเดอร์ใต้ `src/app/` ใช้ **ตัวพิมพ์เล็ก** เสมอ ห้ามเว้นวรรค ห้ามภาษาไทย
- import ภายในโปรเจกต์ใช้ alias `@/` (ชี้ไปที่ `src/`) ห้ามใช้ `../../..`
- **ห้ามสร้างไฟล์ใหม่ที่ root ของโปรเจกต์** ถ้าไม่ได้ระบุในโครงข้างบน
- ห้ามสร้าง `README` อัตโนมัติ ห้ามสร้างไฟล์สรุปงานให้ตัวเอง

---

## 3. กติกา R1–R5 และชั้นที่บังคับ

นี่คือหัวใจของทั้งหลักสูตร กติกาเดียวกันนี้ไหลจาก acceptance criteria → test case → บั๊กที่แทรก
**ทุกข้อต้องบังคับที่ฐานข้อมูลด้วย ไม่ใช่ที่หน้าจออย่างเดียว** — หน้าจอกันคนพิมพ์ผิด ฐานข้อมูลกันของจริง

| กติกา | เนื้อหา | บังคับที่ client | บังคับที่ server | บังคับที่ DB |
|---|---|---|---|---|
| **R1** | อีเมลซ้ำในกิจกรรมเดียวกัน ลงทะเบียนไม่ได้ | – | ส่งต่อให้ `create_registration()` ตัดสิน | เทียบด้วย `lower()` + `unique (event_id, lower(email))` |
| **R2** | ที่นั่งเต็มแล้วต้องปิดรับ | ซ่อนปุ่มเมื่อเต็ม | อ่านที่นั่งคงเหลือจาก `seats_taken()` | `create_registration()` + `select … for update` + trigger |
| **R3** | ชื่อ/อีเมล/เบอร์ บังคับกรอก อีเมลถูกรูปแบบ เบอร์ 10 หลัก | แจ้งเตือนในฟอร์ม | `validateRegistration()` ตรวจซ้ำ | `check (phone ~ '^[0-9]{10}$')` |
| **R4** | หน้าแอดมินต้องเข้าสู่ระบบก่อน | ซ่อน UI | `requireAdmin()` ตรวจคุกกี้ httpOnly ทุก request | policy `is_admin()` + ไม่มี policy ให้ `anon` |
| **R5** | รหัสลงทะเบียนห้ามซ้ำ | – | สุ่มใหม่แล้ว **retry** เมื่อชน | `unique (ticket_code)` |

ข้อห้ามที่เกี่ยวกับ R1–R5 โดยตรง:

- **ห้ามตรวจอีเมลซ้ำแบบ case-sensitive** — `Somchai@rsu.ac.th` กับ `somchai@rsu.ac.th` คือคนเดียวกัน
- **ห้ามใช้ `<=` กับการนับที่นั่ง** — เต็มคือ `taken >= capacity` ไม่ใช่ `taken > capacity`
- **ห้ามแปลง error 23505 (unique violation) เป็นข้อความเดียวรวด** — ต้องแยกว่าชนที่ index ไหน (`email` = R1, `ticket_code` = R5) แล้วตอบคนละข้อความ
- **ห้ามเก็บเบอร์โทรเป็น `number`** — `08…` จะกลายเป็น `8…` ทันที เก็บเป็น `text` เสมอ
- ทุกครั้งที่แก้โค้ดที่แตะกติกาข้อไหน ให้บอกในคำตอบว่าแตะข้อไหน

---

## 4. ฐานข้อมูลและความปลอดภัย

### กติกาข้อแรกของโปรเจกต์นี้ — ตัวแปร environment มีได้แค่ 2 ตัว

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**ห้ามเพิ่มตัวแปร environment ตัวที่ 3 ไม่ว่ากรณีใด** โดยเฉพาะอย่างยิ่ง
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
หรือชื่ออื่นที่ทำหน้าที่เดียวกัน — ถ้าคิดว่างานที่สั่งทำไม่ได้ถ้าไม่มีคีย์ลับ **ให้หยุดแล้วถามฉันก่อน**
ส่วนใหญ่แล้วคำตอบคือ "เขียนเป็นฟังก์ชัน `security definer` ใน `db/schema.sql` แทน"

ความปลอดภัยของโปรเจกต์นี้ไม่ได้ฝากไว้กับการซ่อนคีย์ แต่ฝากไว้กับ 3 อย่างนี้

| ชั้น | ไฟล์ | ทำหน้าที่ |
|---|---|---|
| Row Level Security | `db/rls.sql` | ใครอ่าน/แก้แถวไหนได้ |
| ฟังก์ชัน `security definer` | `db/schema.sql` | ประตูเดียวที่เขียน `registrations` ได้ |
| Supabase Auth + ตาราง `admins` | Dashboard + `db/seed.sql` | รหัสผ่านแอดมินอยู่นอกโค้ดทั้งหมด |

### ข้อห้ามและข้อบังคับ

- **ห้ามแก้ schema โดยไม่ถามฉันก่อน** ถ้าต้องเพิ่ม/แก้คอลัมน์หรือฟังก์ชัน ให้เสนอ SQL มาก่อน แล้วแก้ที่ `db/schema.sql` เป็นแหล่งความจริงเดียว — ห้ามกด edit ใน Supabase UI แล้วไม่อัปเดตไฟล์
- **ห้ามเขียนตาราง `registrations` ด้วยคำสั่ง `insert` จากโค้ด TypeScript** ทางเดียวคือเรียก `create_registration()` ผ่าน `src/lib/db.ts`
- **ห้ามอ่านตาราง `registrations` จาก Client Component** ทุกการอ่านต้องผ่าน route handler ใต้ `src/app/api/admin/` ซึ่งเรียก `requireAdmin()` เป็นบรรทัดแรกเสมอ
- **ห้ามปิด RLS หรือเปิด policy แบบ `using (true)` ให้ตาราง `registrations`** เพื่อให้โค้ดรันผ่าน ถ้าติดสิทธิ์ให้บอกฉัน อย่าแก้ด้วยการเปิดสิทธิ์
- **ห้ามเขียน policy ว่า `to authenticated using (true)`** — "ล็อกอินแล้ว" ไม่เท่ากับ "เป็นแอดมิน" ต้องผ่าน `public.is_admin()` เสมอ
- ฟังก์ชัน `security definer` ทุกตัวต้องมี `set search_path = public` และต้อง `revoke execute … from public` ก่อน `grant` ให้ role ที่ตั้งใจ
- ห้าม log ข้อมูลส่วนบุคคล (ชื่อ อีเมล เบอร์โทร) ลง console หรือส่งออกนอกระบบ
- ห้าม commit `.env.local` ถ้าเพิ่มตัวแปรใหม่ ให้เพิ่มชื่อ (ไม่ใส่ค่า) ลง `.env.example` ด้วยเสมอ — แต่ดูกติกาข้อแรกก่อนว่าจำเป็นจริงไหม

---

## 5. ภาษาและธีมบนหน้าจอ

- **ข้อความที่ผู้ใช้เห็นทั้งหมดเป็นภาษาไทย** รวมถึงข้อความ error, placeholder, ปุ่ม, หัวตาราง
- ชื่อตัวแปร ฟังก์ชัน คอมเมนต์ในโค้ด และ commit message เป็นภาษาอังกฤษ
- ฟอนต์: `Noto Sans Thai` ผ่าน `next/font/google` **ห้ามเปลี่ยนกลับไปใช้ฟอนต์ที่ไม่มี glyph ไทย** (เช่น `Inter` subset `latin`)
- สีธีมอ่านจาก CSS variable `--color-rsu-*` ใน `globals.css` เท่านั้น **ห้าม hardcode ค่า hex ในไฟล์ component**
- วันที่แสดงผลด้วย locale `th-TH` เสมอ
- ผู้เรียนแต่ละคนจะเปลี่ยน 3 อย่าง (ชื่องาน / สีธีม / โลโก้) + เพิ่มฟิลด์ของตัวเอง 1 ฟิลด์ — เขียนโค้ดให้ทั้ง 4 อย่างนี้แก้ได้จากจุดเดียว อย่ากระจายชื่องานไปฝังตามหน้า

---

## 6. คุณภาพโค้ดที่ทำให้ deploy ไม่พัง

Vercel รัน `next build` ซึ่งรัน ESLint และ TypeScript ด้วย **error ตัวเดียว = deploy ไม่ขึ้น** ดังนั้น:

- **ห้ามใช้ `any`** ใช้ชนิดจาก `@/lib/types` หรือ `unknown` + narrowing แทน
  - `catch (err: any)` → `catch (err: unknown)` แล้วค่อยเช็ก `err instanceof Error`
- **ห้ามใช้ `<img>`** ใช้ `next/image` (ถ้าจำเป็นต้องใช้ `<img>` จริง ๆ ให้ถามฉันก่อน)
- ห้ามเหลือ `console.log` ที่ไม่จำเป็น และห้ามเหลือตัวแปรที่ประกาศแล้วไม่ได้ใช้
- ห้ามใช้ `alert()` / `confirm()` เป็น UI จริง ให้แสดงข้อความในหน้าแทน
- ก่อนบอกว่า "เสร็จแล้ว" ให้รัน `npx tsc --noEmit` และ `npm run lint` แล้วรายงานผลจริง
- **ห้ามปิด lint rule, ห้ามใส่ `// eslint-disable`, ห้ามใส่ `ignoreDuringBuilds: true` ใน `next.config.ts`** เพื่อให้ build ผ่าน — ให้แก้ที่ต้นเหตุ

**warning ที่รู้แล้วว่าไม่ต้องแก้ (มี 1 ข้อ):**
`@next/next/no-page-custom-font` ที่ `layout.tsx` — กฎนี้เขียนไว้สำหรับ Pages Router
ใน App Router การใส่ `<link>` ฟอนต์ไว้ที่ root layout โหลดให้ทุกหน้าอยู่แล้ว
**ห้ามแก้ด้วยการถอดฟอนต์ออก และห้ามเปลี่ยนไปใช้ `next/font/google`**
(เหตุผลอยู่ในคอมเมนต์บนสุดของ `layout.tsx` — `next/font` ดึงฟอนต์ตอน build
ถ้าเครือข่ายห้องอบรมเข้า Google Fonts ไม่ได้ `next build` จะล้มทั้งงาน)

---

## 7. วิธีทำงานกับฉัน

- **ทำทีละฟีเจอร์** หนึ่งคำสั่ง = หนึ่งงาน ห้ามรวบทำหลายฟีเจอร์ในรอบเดียวแม้จะทำได้
- ก่อนแก้ไฟล์ ให้บอกก่อนว่าจะแตะไฟล์ไหนบ้าง แล้วค่อยลงมือ
- **ห้ามลบหรือเขียนทับโค้ดที่ไม่เกี่ยวกับงานที่สั่ง** ถ้าเจอโค้ดที่คิดว่าผิดแต่อยู่นอกขอบเขต ให้รายงาน อย่าแก้เอง
- **ห้ามใส่ข้อมูลตัวอย่างปลอมค้างไว้ในโค้ด** (mock array, ชื่อคนสมมติ, รหัสผ่านใน UI) ถ้าต้องการข้อมูลทดสอบให้ใช้ `db/seed.sql`
- ห้ามแต่งชื่อฟังก์ชันหรือ API ขึ้นมาเอง ถ้าไม่แน่ใจว่ามีจริง ให้เปิดเอกสารใน `node_modules/next/dist/docs/` หรือถามฉัน
- ถ้าแก้บั๊กเดิมไม่สำเร็จ **3 ครั้ง** ให้หยุด อธิบายสาเหตุที่แท้จริงก่อน ห้ามแก้ต่อแบบเดา
- เมื่อฉันส่ง error มา ให้อธิบายสาเหตุก่อน แล้วรอฉันบอกว่าให้แก้ จึงค่อยแก้

### git

- จบทุกฟีเจอร์ **ให้เตือนฉันให้ commit** พร้อมเสนอข้อความ commit มาให้เลย
- ห้ามรัน `git commit`, `git push`, `git reset`, `git checkout` เองโดยไม่ได้รับคำสั่ง
- ห้าม `git add .` แบบเหมารวมโดยไม่บอกว่ามีไฟล์อะไรติดไปบ้าง

---

## 8. คำสั่งที่ใช้ในโปรเจกต์นี้

```bash
npm run dev      # พัฒนาที่ http://localhost:3000
npm run build    # ต้องผ่านก่อน push ทุกครั้ง
npm run lint     # ESLint
npx tsc --noEmit # ตรวจชนิดข้อมูล
```

SQL ทั้ง 3 ไฟล์รันใน Supabase → SQL Editor ตามลำดับ: `schema.sql` → `rls.sql` → `seed.sql`
(ห้ามสลับลำดับ — `rls.sql` สั่ง grant ให้ฟังก์ชันที่ `schema.sql` สร้าง)

บัญชีแอดมินสร้างใน Dashboard → Authentication → Users → Add user
แล้วเพิ่ม `user_id` ลงตาราง `admins` ด้วยคำสั่งท้ายไฟล์ `db/seed.sql`

---

## 9. Definition of Done ของทุกฟีเจอร์

งานจะถือว่า "เสร็จ" ก็ต่อเมื่อครบทั้ง 6 ข้อ:

1. `npx tsc --noEmit` ผ่าน
2. `npm run lint` ไม่มี error
3. `npm run build` ผ่าน
4. ทดสอบด้วยมือในเบราว์เซอร์แล้วได้ผลตามที่สั่งจริง (บอกมาว่าทดสอบอะไรบ้าง)
5. กติกา R1–R5 ข้อที่เกี่ยวข้องยังทำงานอยู่ (ไม่พังของเดิม)
6. เตือนให้ commit พร้อมข้อความ commit ที่เสนอไว้

ห้ามตอบว่า "เสร็จแล้ว" หรือ "น่าจะใช้ได้แล้ว" ถ้ายังไม่ได้รันคำสั่งจริงในข้อ 1–3
