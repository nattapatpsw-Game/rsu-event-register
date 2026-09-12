// โค้ดที่คุยกับฐานข้อมูลทั้งหมดอยู่ในไฟล์นี้ที่เดียว
// หน้าเว็บและ route handler ห้ามเรียก supabase ตรง ๆ ให้เรียกฟังก์ชันจากไฟล์นี้เท่านั้น
//
// ทำแบบนี้เพื่ออะไร:
//   - เปลี่ยนชื่อคอลัมน์ทีเดียวจบ ไม่ต้องไล่แก้ทุกหน้า
//   - รู้ได้ทันทีว่า "ใครแตะฐานข้อมูลบ้าง" เวลาตรวจเรื่องความปลอดภัย
//   - เขียน test ได้ง่าย เพราะตรรกะฐานข้อมูลไม่ปนกับ UI

import { getPublicSupabase } from "@/lib/supabase";
import { getServerSupabase } from "@/lib/supabaseServer";
import { generateTicketCode, normalizeEmail } from "@/lib/validate";
import type { AppErrorCode, EventRow, RegistrationInput, RegistrationRow } from "@/lib/types";

const TICKET_CODE_MAX_ATTEMPTS = 5;

/** Postgres unique violation */
const PG_UNIQUE_VIOLATION = "23505";

// ---------------------------------------------------------------------------
// events — อ่านได้สาธารณะ จึงใช้ anon client ได้
// ---------------------------------------------------------------------------

/** กิจกรรมล่าสุด (วันนี้มีแถวเดียว คือ งานของคุณเอง) */
export async function getCurrentEvent(): Promise<EventRow | null> {
  const { data, error } = await getPublicSupabase()
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`อ่านข้อมูลกิจกรรมไม่สำเร็จ: ${error.message}`);
  return (data as EventRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// registrations — ฝั่งเซิร์ฟเวอร์เท่านั้น (RLS ปิดตายสำหรับ anon)
// ---------------------------------------------------------------------------

/** จำนวนที่นั่งที่ถูกจองไปแล้ว */
export async function countRegistrations(eventId: string): Promise<number> {
  const { count, error } = await getServerSupabase()
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) throw new Error(`นับจำนวนผู้ลงทะเบียนไม่สำเร็จ: ${error.message}`);
  return count ?? 0;
}

/** ที่นั่งคงเหลือ ไม่ติดลบ */
export async function getSeatsLeft(event: EventRow): Promise<number> {
  const taken = await countRegistrations(event.id);
  return Math.max(0, event.capacity - taken);
}

/**
 * R1 — มีอีเมลนี้ในกิจกรรมนี้แล้วหรือยัง
 * เทียบแบบไม่สนตัวพิมพ์เล็ก-ใหญ่ ตรงกับ unique index (event_id, lower(email))
 */
export async function hasDuplicateEmail(eventId: string, email: string): Promise<boolean> {
  const { data, error } = await getServerSupabase()
    .from("registrations")
    .select("email")
    .eq("event_id", eventId);

  if (error) throw new Error(`ตรวจอีเมลซ้ำไม่สำเร็จ: ${error.message}`);

  const target = normalizeEmail(email);
  // เทียบใน JS ด้วย normalizeEmail ตัวเดียวกับที่ฐานข้อมูลใช้ (lower())
  // ไม่ใช้ ilike เพราะอักขระ _ ในอีเมล (first_last@…) เป็น wildcard ของ LIKE
  // จะทำให้ตรวจเจอผิดคน
  return (data ?? []).some(
    (row) => normalizeEmail((row as { email: string }).email) === target
  );
}

export type CreateRegistrationResult =
  | { ok: true; ticketCode: string }
  | { ok: false; code: AppErrorCode };

/**
 * บันทึกผู้ลงทะเบียน 1 คน — จุดรวมของกติกา R1 R2 R5
 *
 * ด่านที่ 1 (ที่นี่)      : ตรวจก่อนเพื่อให้ข้อความ error อ่านรู้เรื่อง
 * ด่านที่ 2 (ฐานข้อมูล)  : unique index + trigger เป็นตัวตัดสินจริงเมื่อมีคนกดพร้อมกัน
 */
export async function createRegistration(
  input: RegistrationInput
): Promise<CreateRegistrationResult> {
  const supabase = getServerSupabase();

  // R2 — ด่านแรก ตรวจที่นั่งเพื่อให้ได้ข้อความที่ถูกต้อง (ด่านจริงคือ trigger)
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, capacity")
    .eq("id", input.eventId)
    .maybeSingle();

  if (eventError) throw new Error(`อ่านข้อมูลกิจกรรมไม่สำเร็จ: ${eventError.message}`);
  if (!eventData) return { ok: false, code: "EVENT_NOT_FOUND" };

  const taken = await countRegistrations(input.eventId);
  // เต็มคือ >= ไม่ใช่ > : capacity 30 ต้องลงได้ 30 คน ไม่ใช่ 31
  if (taken >= (eventData as { capacity: number }).capacity) {
    return { ok: false, code: "EVENT_FULL" };
  }

  // R1 — ด่านแรก
  if (await hasDuplicateEmail(input.eventId, input.email)) {
    return { ok: false, code: "DUPLICATE_EMAIL" };
  }

  // R5 — สุ่มรหัสแล้ว retry เมื่อชน แทนที่จะล้มเหลวทันที
  for (let attempt = 0; attempt < TICKET_CODE_MAX_ATTEMPTS; attempt++) {
    const ticketCode = generateTicketCode();

    const { error } = await supabase.from("registrations").insert({
      event_id: input.eventId,
      full_name: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      faculty: input.faculty.trim() || null,
      shirt_size: input.shirtSize || null,
      ticket_code: ticketCode,
      consent_at: new Date().toISOString(),
    });

    if (!error) return { ok: true, ticketCode };

    // trigger ฝั่งฐานข้อมูลตะโกนกลับมาเมื่อที่นั่งเต็มระหว่างทาง (คนกดพร้อมกัน)
    if (error.message.includes("EVENT_FULL")) {
      return { ok: false, code: "EVENT_FULL" };
    }

    if (error.code === PG_UNIQUE_VIOLATION) {
      // ★ 23505 ตัวเดียวมาได้จาก 2 สาเหตุ — ต้องแยกให้ออก ไม่งั้นข้อความจะหลอกผู้ใช้
      if (error.message.includes("ticket_code")) {
        continue; // R5 : รหัสชน → สุ่มใหม่
      }
      return { ok: false, code: "DUPLICATE_EMAIL" }; // R1 : อีเมลชน (แข่งกันส่งพร้อมกัน)
    }

    throw new Error(`บันทึกการลงทะเบียนไม่สำเร็จ: ${error.message}`);
  }

  return { ok: false, code: "TICKET_CODE_COLLISION" };
}

/** รายชื่อผู้ลงทะเบียนสำหรับหน้าแอดมิน (R4 — ผู้เรียกต้องตรวจสิทธิ์มาก่อนแล้ว) */
export async function listRegistrations(eventId?: string): Promise<RegistrationRow[]> {
  let query = getServerSupabase()
    .from("registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) throw new Error(`อ่านรายชื่อผู้ลงทะเบียนไม่สำเร็จ: ${error.message}`);
  return (data ?? []) as RegistrationRow[];
}

/** สลับสถานะเช็คอิน */
export async function setCheckedIn(
  registrationId: string,
  checkedIn: boolean
): Promise<void> {
  const { error } = await getServerSupabase()
    .from("registrations")
    .update({ checked_in: checkedIn })
    .eq("id", registrationId);

  if (error) throw new Error(`อัปเดตสถานะเช็คอินไม่สำเร็จ: ${error.message}`);
}
