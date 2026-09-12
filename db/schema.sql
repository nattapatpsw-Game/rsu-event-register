-- RSU Event Register — schema
-- รันไฟล์นี้เป็นไฟล์แรกใน Supabase → SQL Editor
-- ลำดับ: schema.sql → rls.sql → seed.sql
-- ไฟล์นี้คือแหล่งความจริงเดียวของโครงตาราง — ห้ามแก้ผ่าน Supabase UI แล้วไม่อัปเดตที่นี่
--
-- ★ หลักการของโปรเจกต์นี้ (อ่านก่อนแก้อะไรก็ตาม)
--   เว็บของเรารู้จัก "คีย์สาธารณะ" เพียงตัวเดียว (NEXT_PUBLIC_SUPABASE_ANON_KEY)
--   ไม่มีคีย์ลับ ไม่มีรหัสผ่านแอดมินเก็บไว้ในไฟล์ตั้งค่าเลย
--   แปลว่า "กติกาทุกข้อต้องบังคับได้จริงที่ชั้นฐานข้อมูล" ไม่ใช่ที่โค้ด
--     · เขียนตาราง registrations  → ผ่านฟังก์ชัน security definer เท่านั้น
--     · อ่านตาราง registrations   → ต้องเป็นแอดมินที่ล็อกอินแล้วเท่านั้น (RLS)

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
  --   (ถ้าเปลี่ยน ต้องไปแก้ให้ครบอีก 4 ที่: ฟังก์ชัน create_registration · ฟอร์ม · ตารางแอดมิน · CSV)
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
-- ตาราง admins — ใครเป็นผู้ดูแล (R4)
--
-- ทำไมต้องมีตารางนี้ ทั้งที่ Supabase มีระบบล็อกอินให้แล้ว:
--   "ล็อกอินแล้ว" (authenticated) ไม่เท่ากับ "เป็นแอดมิน"
--   ถ้าเผลอเขียน policy ว่า to authenticated using (true) วันไหนเปิดให้สมัครสมาชิก
--   ใครก็สมัครแล้วอ่านรายชื่อทั้งห้องได้ทันที — ตารางนี้คือเส้นแบ่งสองอย่างนั้น
--
-- วิธีเพิ่มแอดมิน: ดูขั้นตอนท้ายไฟล์ db/seed.sql
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

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

-- ===========================================================================
-- ฟังก์ชันที่เว็บเรียกใช้ได้ด้วยคีย์สาธารณะ
--
-- security definer = ฟังก์ชันทำงานด้วยสิทธิ์ของ "เจ้าของฟังก์ชัน" ไม่ใช่ของคนเรียก
-- จึงข้าม RLS ได้เฉพาะงานที่เราเขียนไว้ในตัวมันเท่านั้น
-- เทียบกับคีย์ลับ (secret key) ที่ข้าม RLS ได้ "ทุกอย่าง" — อันนี้แคบกว่ามาก และปลอดภัยกว่า
--
-- ★ ทุกฟังก์ชัน security definer ต้องมี  set search_path = public
--   ไม่งั้นคนเรียกสร้างตารางชื่อซ้ำมาหลอกให้ฟังก์ชันไปทำงานผิดตัวได้
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- นับที่นั่งที่ถูกจองไปแล้ว — คืน "ตัวเลขตัวเดียว" ไม่ใช่รายชื่อ
-- หน้าแรกต้องโชว์ที่นั่งคงเหลือ แต่ห้ามเห็นว่าใครลงบ้าง
-- ---------------------------------------------------------------------------
create or replace function public.seats_taken(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.registrations
   where event_id = p_event_id;
$$;

-- ---------------------------------------------------------------------------
-- คนที่ล็อกอินอยู่ตอนนี้เป็นแอดมินไหม (R4)
-- ใช้ทั้งใน policy ข้างล่าง และให้ฝั่งเซิร์ฟเวอร์เรียกตรวจก่อนตอบ API
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- บันทึกผู้ลงทะเบียน 1 คน — จุดรวมของกติกา R1 R2 R5
--
-- นี่คือ "ประตูเดียว" ที่เขียนตาราง registrations ได้
-- ตัวตารางเองไม่มี policy ให้ anon เขียนเลย ยิง REST ตรง ๆ จึงเข้าไม่ถึง
--
-- คืนค่าเป็น jsonb เสมอ ไม่ throw — ฝั่งเว็บจะได้แปลงเป็นข้อความไทยที่ถูกต้องได้
--   { "ok": true,  "ticket_code": "RSU-XXXXXX" }
--   { "ok": false, "code": "DUPLICATE_EMAIL" | "EVENT_FULL" | "EVENT_NOT_FOUND"
--                          | "TICKET_CODE_COLLISION" | "INVALID_INPUT" }
-- ---------------------------------------------------------------------------
create or replace function public.create_registration(
  p_event_id    uuid,
  p_full_name   text,
  p_email       text,
  p_phone       text,
  p_faculty     text,
  p_shirt_size  text,
  p_ticket_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_taken    integer;
  v_email    text := btrim(coalesce(p_email, ''));
  v_name     text := btrim(coalesce(p_full_name, ''));
  v_phone    text := btrim(coalesce(p_phone, ''));
begin
  -- R3 — ด่านสุดท้ายของการตรวจข้อมูล ต่อให้มีคนยิงฟังก์ชันนี้ตรง ๆ ข้ามหน้าเว็บ
  if v_name = '' or v_email = '' or v_phone = '' or coalesce(p_ticket_code, '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  -- R2 — ล็อกแถวกิจกรรมไว้ก่อน คนที่กดพร้อมกันจะเข้าคิวทีละคนตรงบรรทัดนี้
  select capacity into v_capacity
    from public.events
   where id = p_event_id
     for update;

  if v_capacity is null then
    return jsonb_build_object('ok', false, 'code', 'EVENT_NOT_FOUND');
  end if;

  select count(*) into v_taken
    from public.registrations
   where event_id = p_event_id;

  -- เต็มคือ >= ไม่ใช่ > : capacity 30 ต้องลงได้ 30 คน ไม่ใช่ 31
  if v_taken >= v_capacity then
    return jsonb_build_object('ok', false, 'code', 'EVENT_FULL');
  end if;

  -- R1 — ด่านแรก (ด่านจริงคือ unique index ข้างล่าง)
  if exists (
    select 1 from public.registrations
     where event_id = p_event_id
       and lower(email) = lower(v_email)
  ) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
  end if;

  begin
    insert into public.registrations (
      event_id, full_name, email, phone, faculty, shirt_size, ticket_code, consent_at
    ) values (
      p_event_id,
      v_name,
      v_email,
      v_phone,
      nullif(btrim(coalesce(p_faculty, '')), ''),
      nullif(btrim(coalesce(p_shirt_size, '')), ''),
      p_ticket_code,
      now()
    );
  exception
    -- ★ unique_violation ตัวเดียวมาได้จาก 2 สาเหตุ — ต้องแยกให้ออก
    --   ไม่งั้นข้อความบนหน้าจอจะหลอกผู้ใช้ (ดู AC-5.4)
    when unique_violation then
      if position('ticket_code' in sqlerrm) > 0 then
        return jsonb_build_object('ok', false, 'code', 'TICKET_CODE_COLLISION');
      end if;
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
    when others then
      if sqlerrm like '%EVENT_FULL%' then
        return jsonb_build_object('ok', false, 'code', 'EVENT_FULL');
      end if;
      raise;
  end;

  return jsonb_build_object('ok', true, 'ticket_code', p_ticket_code);
end;
$$;
