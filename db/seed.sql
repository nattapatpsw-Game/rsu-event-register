-- RSU Event Register — ข้อมูลตัวอย่าง
-- รันเป็นไฟล์สุดท้าย (หลัง schema.sql และ rls.sql) ใน Supabase → SQL Editor
--
-- ★ แก้ 5 ค่าข้างล่างให้เป็นงานของคุณเอง ก่อนกด Run
--   capacity แนะนำให้ตั้งเลขน้อย ๆ ตอนอบรม (เช่น 5) จะได้ทดสอบกติกา R2 "ที่นั่งเต็ม" ได้จริง

insert into public.events (name, description, event_date, location, capacity)
values (
  'อบรมเชิงปฏิบัติการ AI-Assisted Coding สำหรับการพัฒนาเว็บแอปพลิเคชัน',
  'เรียนรู้การใช้ AI ช่วยวิเคราะห์ ออกแบบ เขียนโปรแกรม ทดสอบ แก้ไขข้อผิดพลาด จนถึง deploy ขึ้น host จริงภายในวันเดียว',
  '2026-10-01 09:00:00+07',
  'ศูนย์บริการวิชาการ มหาวิทยาลัยรังสิต',
  100
);

-- ตรวจว่าเข้าจริงไหม
select id, name, capacity, event_date from public.events order by created_at desc;

-- ===========================================================================
-- ตั้งผู้ดูแลระบบ (R4) — ทำครั้งเดียวต่อโปรเจกต์
--
-- ขั้นที่ 1  สร้างบัญชีแอดมินในหน้าเว็บของ Supabase (ไม่ต้องเขียนโค้ด)
--            Dashboard → Authentication → Users → ปุ่ม Add user → Create new user
--            กรอกอีเมลกับรหัสผ่านที่ตั้งเอง แล้วติ๊ก "Auto Confirm User" ด้วย
--
--            ★ รหัสผ่านนี้อยู่ในระบบ auth ของ Supabase เท่านั้น
--              ไม่มีอยู่ในโค้ด ไม่มีอยู่ใน .env.local และไม่มีทางหลุดขึ้น git
--
-- ขั้นที่ 2  บอกฐานข้อมูลว่าบัญชีนี้คือแอดมิน — แก้อีเมลข้างล่างเป็นของคุณ แล้ว Run
-- ===========================================================================

insert into public.admins (user_id, note)
select id, 'ผู้ดูแลงานลงทะเบียน'
  from auth.users
 where email = 'admin@rsu.ac.th'   -- ★ เปลี่ยนเป็นอีเมลที่สร้างไว้ในขั้นที่ 1
on conflict (user_id) do nothing;

-- ตรวจว่าเพิ่มสำเร็จ — ต้องได้ 1 แถว ถ้าได้ 0 แถวแปลว่าอีเมลไม่ตรงกับที่สร้างไว้
select a.user_id, u.email, a.note
  from public.admins a
  join auth.users u on u.id = a.user_id;

-- ---------------------------------------------------------------------------
-- เผื่อต้องการล้างข้อมูลทดสอบระหว่างซ้อม (ลบเฉพาะผู้ลงทะเบียน ไม่ลบกิจกรรม)
--   delete from public.registrations;
--
-- เผื่อต้องการเริ่มใหม่ทั้งหมด
--   delete from public.registrations;
--   delete from public.events;
--
-- เผื่อต้องการถอดสิทธิ์แอดมิน (บัญชียังอยู่ แต่เข้าหน้าแอดมินไม่ได้แล้ว)
--   delete from public.admins
--    where user_id = (select id from auth.users where email = 'admin@rsu.ac.th');
-- ---------------------------------------------------------------------------
