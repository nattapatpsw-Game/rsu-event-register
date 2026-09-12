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
  5
);

-- ตรวจว่าเข้าจริงไหม
select id, name, capacity, event_date from public.events order by created_at desc;

-- ---------------------------------------------------------------------------
-- เผื่อต้องการล้างข้อมูลทดสอบระหว่างซ้อม (ลบเฉพาะผู้ลงทะเบียน ไม่ลบกิจกรรม)
--   delete from public.registrations;
--
-- เผื่อต้องการเริ่มใหม่ทั้งหมด
--   delete from public.registrations;
--   delete from public.events;
-- ---------------------------------------------------------------------------
