// POST /api/register — รับข้อมูลจากฟอร์มลงทะเบียน
//
// ทำไมต้องผ่านที่นี่แทนที่จะให้เบราว์เซอร์ยิงเข้า Supabase ตรง ๆ:
//   1. กติกา R3 ต้องบังคับที่เซิร์ฟเวอร์ ไม่ใช่ที่หน้าจอซึ่งใครก็ข้ามได้ (AC-3.5)
//   2. รวมการแปลง error code เป็นข้อความไทยไว้ที่เดียว
//   3. เบราว์เซอร์ไม่ต้องรู้ว่าฐานข้อมูลชื่อคอลัมน์อะไร
//
// ★ ถ้ามีคนข้ามหน้านี้ไปเรียกฟังก์ชัน create_registration() ตรง ๆ ก็ยังปลอดภัย
//   เพราะกติกาชุดเดียวกันถูกเขียนซ้ำไว้ในฟังก์ชันนั้นและใน constraint ของตารางด้วย

import { NextResponse, type NextRequest } from "next/server";
import { createRegistration } from "@/lib/db";
import { validateRegistration } from "@/lib/validate";
import { missingEnv, missingEnvMessage } from "@/lib/env";
import { messageFor, type RegistrationInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  // ตรวจการตั้งค่าก่อน จะได้ไม่ตอบ 500 เปล่า ๆ ที่ไม่มีใครรู้ว่าเกิดอะไรขึ้น
  const missing = missingEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: missingEnvMessage(missing) },
      { status: 503 }
    );
  }

  let body: Partial<RegistrationInput>;
  try {
    body = (await request.json()) as Partial<RegistrationInput>;
  } catch {
    return NextResponse.json(
      { ok: false, code: "MISSING_FIELD", message: messageFor("MISSING_FIELD") },
      { status: 400 }
    );
  }

  const input: RegistrationInput = {
    eventId: String(body.eventId ?? ""),
    fullName: String(body.fullName ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    faculty: String(body.faculty ?? ""),
    shirtSize: String(body.shirtSize ?? ""),
    consent: body.consent === true,
  };

  // R3 — ตรวจซ้ำที่เซิร์ฟเวอร์ ต่อให้มีคนปิด JavaScript หรือยิง API ตรง ๆ
  const invalid = validateRegistration(input);
  if (invalid) {
    return NextResponse.json(
      { ok: false, code: invalid, message: messageFor(invalid) },
      { status: 400 }
    );
  }

  try {
    const result = await createRegistration(input);

    if (!result.ok) {
      const status = result.code === "EVENT_NOT_FOUND" ? 404 : 409;
      return NextResponse.json(
        { ok: false, code: result.code, message: messageFor(result.code) },
        { status }
      );
    }

    return NextResponse.json({ ok: true, ticketCode: result.ticketCode }, { status: 201 });
  } catch (error: unknown) {
    // ห้าม log ข้อมูลส่วนบุคคล — log เฉพาะข้อความ error
    console.error("[register]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: messageFor("SERVER_ERROR") },
      { status: 500 }
    );
  }
}
