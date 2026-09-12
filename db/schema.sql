-- RSU Event Register — schema
-- รันไฟล์นี้เป็นไฟล์แรกใน Supabase → SQL Editor
-- ลำดับ: schema.sql → rls.sql → seed.sql
-- ไฟล์นี้คือแหล่งความจริงเดียวของโครงตาราง — ห้ามแก้ผ่าน Supabase UI แล้วไม่อัปเดตที่นี่

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ตาราง events — กิจกรรม (วันนี้มี 1 แถว คือ งานของคุณเอง)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  event_date  timestamptz not null,
  location    text,
  capacity    integer     not null check (capacity > 0),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ตาราง registrations — ผู้ลงทะเบียน (เพิ่มทีละแถวทุกครั้งที่มีคนสมัคร)
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid        not null references public.events (id) on delete cascade,
  full_name   text        not null,
  email       text        not null,
  phone       text        not null,
  faculty     text,

  -- ★ ฟิลด์ส่วนตัวของคุณ — เปลี่ยนชื่อ/ชนิดได้ตามงานของตัวเอง
  --   (ถ้าเปลี่ยน ต้องไปแก้ให้ครบอีก 3 ที่: ฟอร์ม · ตารางแอดมิน · CSV)
  shirt_size  text,

  ticket_code text        not null,
  checked_in  boolean     not null default false,
  consent_at  timestamptz,
  created_at  timestamptz not null default now(),

  -- R3: เบอร์โทรต้องเป็นตัวเลข 10 หลักพอดี (เก็บเป็น text เสมอ ไม่งั้นเลข 0 หน้าหาย)
  constraint registrations_phone_format check (phone ~ '^[0-9]{10}$'),

  -- R3: อีเมลต้องพอมีรูปร่าง (ตรวจละเอียดที่ชั้น validate.ts)
  constraint registrations_email_format check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),

  constraint registrations_full_name_not_blank check (length(btrim(full_name)) > 0)
);

-- R1 — อีเมลซ้ำในกิจกรรมเดียวกันไม่ได้ และต้องไม่สนตัวพิมพ์เล็ก-ใหญ่
--      ชั้นนี้คือชั้นที่กติกา R1 "เป็นจริง" — โค้ดฝั่งเซิร์ฟเวอร์เป็นแค่ด่านแรก
create unique index if not exists registrations_event_email_unique
  on public.registrations (event_id, lower(email));

-- R5 — รหัสลงทะเบียนห้ามซ้ำทั้งระบบ
create unique index if not exists registrations_ticket_code_unique
  on public.registrations (ticket_code);

-- index ช่วยให้นับที่นั่งและเรียงตารางแอดมินเร็ว
create index if not exists registrations_event_created_idx
  on public.registrations (event_id, created_at desc);

-- ---------------------------------------------------------------------------
-- R2 — ที่นั่งเต็มแล้วต้องปิดรับ (บังคับที่ฐานข้อมูล ไม่ใช่แค่ที่หน้าจอ)
--
-- ทำไมต้องมี trigger ทั้งที่ฝั่งเซิร์ฟเวอร์นับให้แล้ว:
--   "นับ" กับ "insert" เป็นคนละคำสั่ง ถ้ามีคนกดพร้อมกัน 5 คนตอนเหลือที่สุดท้าย
--   ทั้ง 5 จะนับได้เลขเดียวกันแล้วผ่านหมด → ยอดเกิน capacity
--   select ... for update ล็อกแถว events ไว้ ทำให้คำสั่งเข้าคิวทีละคน
-- ---------------------------------------------------------------------------
create or replace function public.enforce_capacity()
returns trigger
language plpgsql
as $$
declare
  event_capacity integer;
  seats_taken    integer;
begin
  select capacity into event_capacity
    from public.events
   where id = new.event_id
     for update;

  if event_capacity is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  select count(*) into seats_taken
    from public.registrations
   where event_id = new.event_id;

  -- เต็มคือ >= ไม่ใช่ > : capacity 30 ต้องลงได้ 30 คน ไม่ใช่ 31
  if seats_taken >= event_capacity then
    raise exception 'EVENT_FULL';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_capacity on public.registrations;
create trigger trg_enforce_capacity
  before insert on public.registrations
  for each row
  execute function public.enforce_capacity();
