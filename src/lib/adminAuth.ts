// R4 — การตรวจสิทธิ์หน้าแอดมิน อยู่ฝั่งเซิร์ฟเวอร์ทั้งหมด
//
// สิ่งที่เปลี่ยนไปจากวิธีที่ AI มักเขียนให้:
//   เดิม  : เทียบ password === "admin1234" ใน Client Component
//           → รหัสผ่านอยู่ใน bundle ที่ใครเปิด View Source ก็อ่านได้
//   ใหม่  : เทียบที่เซิร์ฟเวอร์ แล้วส่งคุกกี้ httpOnly กลับไป
//           → เบราว์เซอร์ไม่เคยเห็นรหัสผ่าน และ JavaScript อ่านคุกกี้ไม่ได้

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "rsu_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 ชั่วโมง พอดีงานหนึ่งวัน

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ยังไม่ได้ตั้งค่า ADMIN_PASSWORD — ดูตัวอย่างที่ไฟล์ .env.example");
  }
  return password;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ยังไม่ได้ตั้งค่า ADMIN_SESSION_SECRET — ดูตัวอย่างที่ไฟล์ .env.example");
  }
  return secret;
}

/** เทียบสตริงแบบใช้เวลาเท่ากันเสมอ กันการเดารหัสจากเวลาที่ตอบกลับ */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function isAdminPassword(candidate: string): boolean {
  return safeEqual(candidate, getAdminPassword());
}

/**
 * ค่าที่จะเก็บในคุกกี้ — เซ็นด้วย secret ฝั่งเซิร์ฟเวอร์
 * ใครปลอมคุกกี้เองไม่ได้ เพราะไม่รู้ ADMIN_SESSION_SECRET
 */
export function createSessionValue(): string {
  return createHmac("sha256", getSessionSecret()).update("rsu-admin").digest("hex");
}

/** ตรวจว่า request นี้เป็นแอดมินจริงหรือไม่ — เรียกที่ต้นทางของทุก API ฝั่งแอดมิน */
export function isAdminRequest(request: NextRequest): boolean {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return false;
  try {
    return safeEqual(cookie, createSessionValue());
  } catch {
    return false;
  }
}
