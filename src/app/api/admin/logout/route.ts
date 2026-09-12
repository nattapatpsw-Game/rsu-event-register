// POST /api/admin/logout — ออกจากระบบ
//
// ทำ 2 อย่าง ไม่ใช่อย่างเดียว:
//   1. บอก Supabase ให้เพิกถอน session นั้นเสีย  → token ที่หลุดออกไปแล้วใช้ต่อไม่ได้
//   2. ลบคุกกี้ในเบราว์เซอร์                        → เครื่องนี้ก็ไม่มี token เหลืออยู่
//
// ถ้าทำแค่ข้อ 2 (ที่ AI มักเขียนให้) คนที่ก๊อป token ไปก่อนหน้านี้ยังใช้ได้จนกว่าจะหมดอายุ

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, getSessionToken } from "@/lib/adminAuth";
import { getUserSupabase } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);

  if (token) {
    try {
      await getUserSupabase(token).auth.signOut();
    } catch (error: unknown) {
      // เพิกถอนไม่สำเร็จก็ไม่เป็นไร ยังต้องลบคุกกี้ให้ได้อยู่ดี
      console.error("[admin/logout]", error instanceof Error ? error.message : error);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
