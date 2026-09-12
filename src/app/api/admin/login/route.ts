// POST /api/admin/login — R4 ล็อกอินที่เซิร์ฟเวอร์ แล้วออกคุกกี้ httpOnly
//
// ลำดับที่เกิดขึ้นใน 4 บรรทัดข้างล่าง (อ่านให้ครบก่อนแก้):
//   1. เบราว์เซอร์ส่งอีเมล + รหัสผ่านมาที่เซิร์ฟเวอร์ของเรา
//   2. เซิร์ฟเวอร์เอาไปถาม Supabase Auth ว่าถูกไหม   ← รหัสผ่านอยู่ที่นั่น ไม่ได้อยู่ในโค้ดเรา
//   3. ถูกแล้วยังไม่พอ ต้องถามต่อว่า "คนนี้อยู่ในตาราง admins ไหม"
//   4. ผ่านทั้งสองข้อ จึงเก็บ access token ลงคุกกี้ httpOnly
//
// ★ ทำไมต้องเก็บ token ในคุกกี้ httpOnly ไม่ใช่ localStorage
//   คุกกี้ httpOnly ถูกส่งไปกับ request อัตโนมัติ แต่ JavaScript ในหน้าเว็บอ่านไม่ได้
//   สคริปต์แปลกปลอมที่หลุดเข้ามาในหน้าเว็บจึงขโมย token ไปใช้ต่อไม่ได้

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getPublicSupabase } from "@/lib/supabase";
import { getUserSupabase } from "@/lib/supabaseServer";
import { missingEnv, missingEnvMessage } from "@/lib/env";

export async function POST(request: NextRequest) {
  const missing = missingEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, message: missingEnvMessage(missing) },
      { status: 503 }
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email = String(body.email ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    email = "";
    password = "";
  }

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "กรุณากรอกอีเมลและรหัสผ่าน" },
      { status: 400 }
    );
  }

  // ขั้นที่ 1 — "ล็อกอินได้ไหม"
  const { data, error } = await getPublicSupabase().auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    // หน่วงเล็กน้อย กันการยิงเดารหัสรัว ๆ
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  // ขั้นที่ 2 — "เป็นแอดมินไหม" (ล็อกอินได้ ไม่ได้แปลว่าเป็นแอดมิน)
  const accessToken = data.session.access_token;
  const { data: isAdmin } = await getUserSupabase(accessToken).rpc("is_admin");

  if (isAdmin !== true) {
    await getPublicSupabase().auth.signOut();
    return NextResponse.json(
      {
        ok: false,
        message:
          "บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแล — เพิ่ม user_id ลงตาราง admins ก่อน (ดูวิธีท้ายไฟล์ db/seed.sql)",
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ ok: true, email: data.user?.email ?? email });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: accessToken,
    httpOnly: true, // JavaScript ในหน้าเว็บอ่านไม่ได้
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // อย่าตั้งยาวกว่าอายุจริงของ token — เอาค่าที่ Supabase บอกมาถ้ามี
    maxAge: Math.min(data.session.expires_in ?? ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_MAX_AGE),
  });
  return response;
}
