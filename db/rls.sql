-- RSU Event Register — สิทธิ์เข้าถึงตาราง (Row Level Security)
-- รันหลัง schema.sql และก่อน seed.sql
--
-- กฎของโปรเจกต์นี้ อ่านออกเสียงได้ 3 บรรทัด:
--   1) ใครก็อ่านรายละเอียด "กิจกรรม" ได้
--   2) ไม่มีใครอ่านตาราง "ผู้ลงทะเบียน" ได้ ยกเว้นแอดมินที่ล็อกอินแล้ว
--   3) ไม่มีใครเขียนตาราง "ผู้ลงทะเบียน" ได้ตรง ๆ เลย — ต้องผ่านฟังก์ชัน create_registration()
--
-- ทำไม AI มักตั้งให้เปิดกว้าง: เพราะปิดแล้วโค้ดที่มันเขียน (อ่าน/เขียนจากเบราว์เซอร์ตรง ๆ)
-- จะรันไม่ผ่าน มันจึงเลือกทางที่ "ใช้งานได้" ไว้ก่อน ไม่ใช่ทางที่ปลอดภัย
-- เราแก้ที่ต้นเหตุแทน คือทำให้ "ประตูเข้าออก" มีแค่ทางเดียวที่เราคุมได้

alter table public.events        enable row level security;
alter table public.registrations enable row level security;
alter table public.admins        enable row level security;

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
-- registrations
--   · anon (คนทั่วไปที่เปิดเว็บ)      → ไม่มี policy เลย = แตะอะไรไม่ได้ทั้งสิ้น
--   · authenticated ที่อยู่ในตาราง admins → อ่านได้ และกดเช็คอินได้
--
-- สังเกตว่าไม่มี policy for insert ให้ใครเลยแม้แต่แอดมิน
-- การเพิ่มแถวเกิดได้ทางเดียวคือผ่าน public.create_registration() ซึ่งเป็น security definer
-- ---------------------------------------------------------------------------
drop policy if exists registrations_public_read   on public.registrations;
drop policy if exists registrations_public_insert on public.registrations;
drop policy if exists registrations_admin_read    on public.registrations;
drop policy if exists registrations_admin_update  on public.registrations;

revoke all on public.registrations from anon, authenticated;
grant select, update (checked_in) on public.registrations to authenticated;

-- R4 / AC-4.5 — อ่านรายชื่อได้เฉพาะแอดมิน
create policy registrations_admin_read
  on public.registrations
  for select
  to authenticated
  using (public.is_admin());

-- เช็คอินหน้างาน — อัปเดตได้เฉพาะแอดมิน (และคอลัมน์เดียวตาม grant ข้างบน)
create policy registrations_admin_update
  on public.registrations
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- admins : ไม่มี policy ให้ใครเลย
-- อ่านได้เฉพาะผ่านฟังก์ชัน is_admin() ซึ่งเป็น security definer
-- (ต่อให้แอดมินเอง ก็ไม่ควรดึงรายชื่อแอดมินคนอื่นออกมาจากเบราว์เซอร์)
-- ---------------------------------------------------------------------------
revoke all on public.admins from anon, authenticated;

-- ---------------------------------------------------------------------------
-- สิทธิ์เรียกฟังก์ชัน
--
-- ★ ใน Postgres ฟังก์ชันที่สร้างใหม่ "ทุกคนเรียกได้" โดยอัตโนมัติ
--   ต้อง revoke from public ก่อน แล้วค่อย grant เฉพาะที่ตั้งใจ
-- ---------------------------------------------------------------------------
revoke execute on function public.create_registration(uuid, text, text, text, text, text, text) from public;
revoke execute on function public.seats_taken(uuid) from public;
revoke execute on function public.is_admin() from public;

-- หน้าเว็บสาธารณะต้องเรียก 2 ตัวนี้ได้ (ลงทะเบียน และดูที่นั่งคงเหลือ)
grant execute on function public.create_registration(uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.seats_taken(uuid) to anon, authenticated;

-- is_admin() ใช้ตอนล็อกอินแล้วเท่านั้น
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- วิธีตรวจด้วยตัวเอง (ทำทุกครั้งก่อนปิดงาน)
--
-- 1) เปิด terminal แล้วยิงคำสั่งนี้ด้วยคีย์สาธารณะของคุณเอง
--    (URL กับ anon key คือสองค่าที่ใครเปิดเว็บก็เห็นได้อยู่แล้ว — นั่นคือเหตุผลที่ต้องทดสอบ)
--
--    curl "https://<project>.supabase.co/rest/v1/registrations?select=*" \
--         -H "apikey: <anon-key>"
--
--    ผลที่ถูกต้อง : []  หรือ error เรื่องสิทธิ์
--    ผลที่อันตราย : รายชื่อ อีเมล เบอร์โทรของทั้งห้อง  → แปลว่ายังเปิดกว้างอยู่
--
-- 2) ลองเปลี่ยนเป็น events ดู ต้องได้ข้อมูลกิจกรรมกลับมา (นี่คือของที่ตั้งใจให้เปิด)
--
-- 3) ลองยิงเพิ่มแถวตรง ๆ ต้องถูกปฏิเสธ
--
--    curl -X POST "https://<project>.supabase.co/rest/v1/registrations" \
--         -H "apikey: <anon-key>" -H "Content-Type: application/json" \
--         -d '{"event_id":"...","full_name":"ทดสอบ","email":"a@b.co","phone":"0800000000","ticket_code":"X"}'
--
--    ผลที่ถูกต้อง : error เรื่องสิทธิ์ (ประตูเดียวคือฟังก์ชัน create_registration)
-- ---------------------------------------------------------------------------
