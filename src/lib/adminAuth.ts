// R4 — การตรวจสิทธิ์หน้าแอดมิน อยู่ฝั่งเซิร์ฟเวอร์ทั้งหมด
//
// สิ่งที่เปลี่ยนไปจากวิธีที่ AI มักเขียนให้:
//   เดิม  : เทียบ password === "admin1234" ใน Client Component
//           → รหัสผ่านอยู่ใน bundle ที่ใครเปิด View Source ก็อ่านได้
//   ใหม่  : รหัสผ่านอยู่ในระบบ Auth ของ Supabase (ไม่ได้อยู่ในโค้ด ไม่ได้อยู่ใน .env ด้วยซ้ำ)
//           เซิร์ฟเวอร์ของเราเป็นคนล็อกอินให้ แล้วเก็บ access token ไว้ในคุกกี้ httpOnly
//           → เบราว์เซอร์ไม่เคยเห็นรหัสผ่าน และ JavaScript อ่านคุกกี้ไม่ได้
//
// สองคำถามที่ต้องแยกให้ขาด และนี่คือจุดที่คนพลาดกันบ่อยที่สุด:
//   1. "ล็อกอินแล้วหรือยัง"  → Supabase Auth ตอบ (token ถูกต้องและยังไม่หมดอายุไหม)
//   2. "เป็นแอดมินไหม"       → ตาราง admins ตอบ ผ่านฟังก์ชัน is_admin()
//   ผ่านข้อ 1 ไม่ได้แปลว่าผ่านข้อ 2

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserSupabase } from "@/lib/supabaseServer";

export const ADMIN_COOKIE_NAME = "rsu_admin_session";

/**
 * อายุคุกกี้ — ตั้งให้ไม่เกินอายุของ access token ที่ Supabase ออกให้ (ค่าตั้งต้น 1 ชั่วโมง)
 * อยากให้ยาวกว่านี้ ให้ไปแก้ที่ Supabase Dashboard → Authentication → Sessions → JWT expiry
 * แล้วค่อยแก้ตัวเลขนี้ตาม (ห้ามตั้งคุกกี้ให้ยาวกว่า token ไม่งั้นจะค้างอยู่ในสถานะที่ใช้ไม่ได้จริง)
 */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60; // 1 ชั่วโมง

/** อ่าน token จากคุกกี้ httpOnly — ไม่มีทางอ่านจาก JavaScript ในหน้าเว็บได้ */
export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;
}

export type AdminSession = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
};

/**
 * ตรวจว่า request นี้เป็นแอดมินจริงหรือไม่ — เรียกที่บรรทัดแรกของทุก API ฝั่งแอดมิน
 * คืน client ที่สวมสิทธิ์ผู้ใช้คนนั้นกลับมาด้วย จะได้ใช้ต่อได้เลยโดยไม่ต้องสร้างซ้ำ
 *
 * คืน null เมื่อ: ไม่มีคุกกี้ · token หมดอายุ/ปลอม · ล็อกอินแล้วแต่ไม่ได้อยู่ในตาราง admins
 */
export async function requireAdmin(request: NextRequest): Promise<AdminSession | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const supabase = getUserSupabase(token);

  // ข้อ 1 — token นี้เป็นของใคร และยังใช้ได้อยู่ไหม
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  // ข้อ 2 — คนนี้อยู่ในตาราง admins หรือเปล่า
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) return null;

  return { supabase, userId: data.user.id, email: data.user.email ?? null };
}
