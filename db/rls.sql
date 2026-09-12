-- RSU Event Register — สิทธิ์เข้าถึงตาราง (Row Level Security)
-- รันหลัง schema.sql และก่อน seed.sql
--
-- กฎของโปรเจกต์นี้ อ่านออกเสียงได้ 2 บรรทัด:
--   1) ใครก็อ่านรายละเอียด "กิจกรรม" ได้
--   2) ไม่มีใครแตะตาราง "ผู้ลงทะเบียน" ได้เลย ยกเว้นฝั่งเซิร์ฟเวอร์ของเรา
--
-- ทำไม AI มักตั้งให้เปิดกว้าง: เพราะปิดแล้วโค้ดที่มันเขียน (อ่านจากเบราว์เซอร์ตรง ๆ)
-- จะรันไม่ผ่าน มันจึงเลือกทางที่ "ใช้งานได้" ไว้ก่อน ไม่ใช่ทางที่ปลอดภัย
-- เราแก้ที่ต้นเหตุแทน คือย้ายการอ่านไปไว้ฝั่งเซิร์ฟเวอร์

alter table public.events        enable row level security;
alter table public.registrations enable row level security;

-- ---------------------------------------------------------------------------
-- events : อ่านได้สาธารณะ แต่เขียนไม่ได้
-- ---------------------------------------------------------------------------
drop policy if exists events_public_read on public.events;
create policy events_public_read
  on public.events
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- registrations : ไม่สร้าง policy ให้ anon/authenticated เลยแม้แต่ข้อเดียว
--                 เมื่อเปิด RLS แล้วไม่มี policy = ทำอะไรไม่ได้ทั้งหมด
--
-- service_role ข้าม RLS โดยธรรมชาติ จึงยังทำงานได้จาก route handler ของเรา
-- (SUPABASE_SERVICE_ROLE_KEY ต้องอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามขึ้นต้น NEXT_PUBLIC_)
-- ---------------------------------------------------------------------------
drop policy if exists registrations_public_read   on public.registrations;
drop policy if exists registrations_public_insert on public.registrations;

revoke all on public.registrations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- วิธีตรวจด้วยตัวเอง (ทำทุกครั้งก่อนปิดงาน)
--
-- 1) เปิดหน้าต่างไม่ระบุตัวตน แล้วยิงคำสั่งนี้ใน terminal
--    (ใส่ URL และ anon key ของคุณเอง — สองค่านี้คือค่าที่ใครก็เห็นได้จากหน้าเว็บอยู่แล้ว)
--
--    curl "https://<project>.supabase.co/rest/v1/registrations?select=*" \
--         -H "apikey: <anon-key>"
--
--    ผลที่ถูกต้อง : []  หรือ error เรื่องสิทธิ์
--    ผลที่อันตราย : รายชื่อ อีเมล เบอร์โทรของทั้งห้อง  → แปลว่ายังเปิดกว้างอยู่
--
-- 2) ลองเปลี่ยนเป็น events ดู ต้องได้ข้อมูลกิจกรรมกลับมา (นี่คือของที่ตั้งใจให้เปิด)
-- ---------------------------------------------------------------------------
