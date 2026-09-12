// โค้ดที่คุยกับฐานข้อมูลทั้งหมดอยู่ในไฟล์นี้ที่เดียว
// หน้าเว็บและ route handler ห้ามเรียก supabase ตรง ๆ ให้เรียกฟังก์ชันจากไฟล์นี้เท่านั้น
//
// ทำแบบนี้เพื่ออะไร:
//   - เปลี่ยนชื่อคอลัมน์ทีเดียวจบ ไม่ต้องไล่แก้ทุกหน้า
//   - รู้ได้ทันทีว่า "ใครแตะฐานข้อมูลบ้าง" เวลาตรวจเรื่องความปลอดภัย
//   - เขียน test ได้ง่าย เพราะตรรกะฐานข้อมูลไม่ปนกับ UI
//
// ★ โปรเจกต์นี้ไม่มีคีย์ที่ข้าม RLS ได้ ฟังก์ชันในไฟล์นี้จึงแบ่งเป็น 2 กลุ่มชัดเจน
//   กลุ่มสาธารณะ : ใช้ anon client เรียก "ฟังก์ชันในฐานข้อมูล" ที่เราเปิดไว้ให้เท่านั้น
//   กลุ่มแอดมิน  : ต้องรับ supabase ที่สวมสิทธิ์ผู้ล็อกอินเข้ามา (มาจาก requireAdmin)

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabase } from "@/lib/supabase";
import { generateTicketCode, normalizeEmail } from "@/lib/validate";
import type { AppErrorCode, EventRow, RegistrationInput, RegistrationRow } from "@/lib/types";

const TICKET_CODE_MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// กลุ่มสาธารณะ — ใครเปิดเว็บก็ทำได้ (แต่ทำได้แค่ 3 อย่างนี้)
// ---------------------------------------------------------------------------

/** กิจกรรมล่าสุด (วันนี้มีแถวเดียว คือ งานของคุณเอง) — events เปิดให้อ่านสาธารณะ */
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

/**
 * จำนวนที่นั่งที่ถูกจองไปแล้ว
 *
 * ★ ไม่ได้นับด้วยการ select จากตาราง registrations เพราะคีย์สาธารณะอ่านตารางนั้นไม่ได้
 *   เรียกฟังก์ชัน seats_taken() ที่คืน "ตัวเลขตัวเดียว" แทน
 *   หน้าแรกจึงบอกได้ว่าเหลือกี่ที่ โดยไม่มีทางรู้ว่าใครลงบ้าง
 */
export async function countRegistrations(eventId: string): Promise<number> {
  const { data, error } = await getPublicSupabase().rpc("seats_taken", {
    p_event_id: eventId,
  });

  if (error) throw new Error(`นับจำนวนผู้ลงทะเบียนไม่สำเร็จ: ${error.message}`);
  return Number(data ?? 0);
}

/** ที่นั่งคงเหลือ ไม่ติดลบ */
export async function getSeatsLeft(event: EventRow): Promise<number> {
  const taken = await countRegistrations(event.id);
  return Math.max(0, event.capacity - taken);
}

export type CreateRegistrationResult =
  | { ok: true; ticketCode: string }
  | { ok: false; code: AppErrorCode };

/** รูปร่างของค่าที่ฟังก์ชัน create_registration() ในฐานข้อมูลคืนกลับมา */
type CreateRegistrationRpcResult = {
  ok: boolean;
  code?: string;
  ticket_code?: string;
};

/**
 * บันทึกผู้ลงทะเบียน 1 คน — จุดรวมของกติกา R1 R2 R5
 *
 * ★ ไม่ได้ insert จากตรงนี้ เพราะตาราง registrations ไม่เปิดให้ใครเขียนตรง ๆ เลย
 *   ประตูเดียวคือฟังก์ชัน create_registration() ใน db/schema.sql
 *   ซึ่งตรวจที่นั่ง ตรวจอีเมลซ้ำ และ insert ในคำสั่งเดียวกัน — คนกดพร้อมกันจึงแซงกันไม่ได้
 *
 * ด่านที่ 1 (validate.ts)  : ตรวจก่อนเพื่อให้ข้อความ error อ่านรู้เรื่อง
 * ด่านที่ 2 (ฐานข้อมูล)    : ฟังก์ชัน + unique index + trigger เป็นตัวตัดสินจริง
 */
export async function createRegistration(
  input: RegistrationInput
): Promise<CreateRegistrationResult> {
  const supabase = getPublicSupabase();

  // R2 — ด่านแรก ตรวจที่นั่งเพื่อให้ได้ข้อความที่ถูกต้อง (ด่านจริงคือฟังก์ชันในฐานข้อมูล)
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

  // R5 — สุ่มรหัสแล้ว retry เมื่อชน แทนที่จะล้มเหลวทันที
  for (let attempt = 0; attempt < TICKET_CODE_MAX_ATTEMPTS; attempt++) {
    const ticketCode = generateTicketCode();

    const { data, error } = await supabase.rpc("create_registration", {
      p_event_id: input.eventId,
      p_full_name: input.fullName.trim(),
      // R1 — เก็บอีเมลในรูปมาตรฐาน (ตัดช่องว่าง + ตัวพิมพ์เล็ก) ด้วยฟังก์ชันตัวเดียวกับที่ทุกที่ใช้
      p_email: normalizeEmail(input.email),
      p_phone: input.phone.trim(),
      p_faculty: input.faculty.trim(),
      p_shirt_size: input.shirtSize,
      p_ticket_code: ticketCode,
    });

    if (error) throw new Error(`บันทึกการลงทะเบียนไม่สำเร็จ: ${error.message}`);

    const result = data as CreateRegistrationRpcResult | null;
    if (!result) throw new Error("บันทึกการลงทะเบียนไม่สำเร็จ: ฐานข้อมูลไม่ได้ตอบอะไรกลับมา");

    if (result.ok) return { ok: true, ticketCode: result.ticket_code ?? ticketCode };

    // R5 : รหัสชน → สุ่มใหม่  (ต่างจาก R1 อีเมลซ้ำ ซึ่งสุ่มใหม่กี่ครั้งก็ไม่ช่วย — ดู AC-5.4)
    if (result.code === "TICKET_CODE_COLLISION") continue;

    return { ok: false, code: toAppErrorCode(result.code) };
  }

  return { ok: false, code: "TICKET_CODE_COLLISION" };
}

/** แปลงรหัสจากฐานข้อมูลเป็นรหัส error ของแอป (ไม่รู้จัก = SERVER_ERROR ไว้ก่อน) */
function toAppErrorCode(code: string | undefined): AppErrorCode {
  switch (code) {
    case "DUPLICATE_EMAIL":
    case "EVENT_FULL":
    case "EVENT_NOT_FOUND":
    case "TICKET_CODE_COLLISION":
      return code;
    case "INVALID_INPUT":
      return "MISSING_FIELD";
    default:
      return "SERVER_ERROR";
  }
}

// ---------------------------------------------------------------------------
// กลุ่มแอดมิน — ต้องส่ง supabase ที่สวมสิทธิ์ผู้ล็อกอินเข้ามา
//
// ★ สังเกตว่าไม่มีการเช็ก "เป็นแอดมินไหม" ในไฟล์นี้เลย
//   เพราะเช็กไปแล้ว 2 ชั้น: requireAdmin() ที่ route handler และ policy ใน db/rls.sql
//   ถ้าใครส่ง client ของคนที่ไม่ใช่แอดมินเข้ามา ฐานข้อมูลจะคืนลิสต์ว่างเอง ไม่ใช่คืนข้อมูล
// ---------------------------------------------------------------------------

/** รายชื่อผู้ลงทะเบียนสำหรับหน้าแอดมิน (R4) */
export async function listRegistrations(
  supabase: SupabaseClient,
  eventId?: string
): Promise<RegistrationRow[]> {
  let query = supabase
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
  supabase: SupabaseClient,
  registrationId: string,
  checkedIn: boolean
): Promise<void> {
  const { error } = await supabase
    .from("registrations")
    .update({ checked_in: checkedIn })
    .eq("id", registrationId);

  if (error) throw new Error(`อัปเดตสถานะเช็คอินไม่สำเร็จ: ${error.message}`);
}
