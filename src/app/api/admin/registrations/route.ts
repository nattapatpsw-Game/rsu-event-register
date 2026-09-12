// GET /api/admin/registrations — รายชื่อผู้ลงทะเบียน (ต้องเป็นแอดมินเท่านั้น)
//
// AC-4.4: ยิง URL นี้ตรง ๆ โดยไม่มีคุกกี้ ต้องได้ 401 และต้องไม่มีข้อมูลหลุดออกไปเลย
// AC-4.5: ต่อให้มีคนแก้โค้ดบรรทัด requireAdmin ทิ้ง ฐานข้อมูลก็ยังไม่ยอมให้อ่านอยู่ดี
//         เพราะ policy registrations_admin_read ใน db/rls.sql เป็นด่านที่สอง

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listRegistrations } from "@/lib/db";
import { missingEnv, missingEnvMessage } from "@/lib/env";
import { messageFor } from "@/lib/types";

export async function GET(request: NextRequest) {
  const missing = missingEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: missingEnvMessage(missing) },
      { status: 503 }
    );
  }

  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: messageFor("UNAUTHORIZED") },
      { status: 401 }
    );
  }

  try {
    const eventId = request.nextUrl.searchParams.get("eventId") ?? undefined;
    const registrations = await listRegistrations(session.supabase, eventId);
    return NextResponse.json({ ok: true, registrations });
  } catch (error: unknown) {
    console.error("[admin/registrations]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: messageFor("SERVER_ERROR") },
      { status: 500 }
    );
  }
}
