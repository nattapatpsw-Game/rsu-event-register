// POST /api/admin/login — R4 ตรวจรหัสผ่านที่เซิร์ฟเวอร์ แล้วออกคุกกี้ httpOnly

import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  createSessionValue,
  isAdminPassword,
} from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = String(body.password ?? "");
  } catch {
    password = "";
  }

  if (!password || !isAdminPassword(password)) {
    // หน่วงเล็กน้อย กันการยิงเดารหัสรัว ๆ
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { ok: false, message: "รหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: createSessionValue(),
    httpOnly: true, // JavaScript ในหน้าเว็บอ่านไม่ได้
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
