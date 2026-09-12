// GET /api/admin/registrations — รายชื่อผู้ลงทะเบียน (ต้องเป็นแอดมินเท่านั้น)
//
// AC-4.4: ยิง URL นี้ตรง ๆ โดยไม่มีคุกกี้ ต้องได้ 401 และต้องไม่มีข้อมูลหลุดออกไปเลย

import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { listRegistrations } from "@/lib/db";
import { messageFor } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: messageFor("UNAUTHORIZED") },
      { status: 401 }
    );
  }

  try {
    const eventId = request.nextUrl.searchParams.get("eventId") ?? undefined;
    const registrations = await listRegistrations(eventId);
    return NextResponse.json({ ok: true, registrations });
  } catch (error: unknown) {
    console.error("[admin/registrations]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: messageFor("SERVER_ERROR") },
      { status: 500 }
    );
  }
}
