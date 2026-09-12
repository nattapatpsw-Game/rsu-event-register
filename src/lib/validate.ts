// ตรรกะตรวจข้อมูลทั้งหมดอยู่ในไฟล์นี้ที่เดียว (กติกา R3 และ R5)
// หน้าจอกับ route handler เรียกฟังก์ชันชุดเดียวกัน จะได้ไม่ตรวจคนละเกณฑ์

import type { AppErrorCode, RegistrationInput } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10}$/;

/**
 * ทำให้อีเมลอยู่ในรูปมาตรฐานก่อนนำไปเทียบซ้ำ (R1)
 * ตัดช่องว่างหัวท้าย + แปลงเป็นตัวพิมพ์เล็ก
 * ห้ามลบ .toLowerCase() ออก ไม่งั้น Somchai@rsu.ac.th จะลงซ้ำกับ somchai@rsu.ac.th ได้
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** เบอร์โทรต้องเป็นตัวเลข 10 หลักพอดี (เก็บเป็น text เสมอ) */
export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.trim());
}

/**
 * ตรวจข้อมูลจากฟอร์มลงทะเบียนตามกติกา R3 (+ ข้อยินยอม PDPA)
 * คืน error code ตัวแรกที่เจอ หรือ null ถ้าผ่านหมด
 */
export function validateRegistration(input: RegistrationInput): AppErrorCode | null {
  if (!input.eventId) return "EVENT_NOT_FOUND";

  if (!input.fullName.trim() || !input.email.trim() || !input.phone.trim()) {
    return "MISSING_FIELD";
  }
  if (!isValidEmail(input.email)) return "INVALID_EMAIL";
  if (!isValidPhone(input.phone)) return "INVALID_PHONE";
  if (!input.consent) return "CONSENT_REQUIRED";

  return null;
}

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ตัด I O 0 1 ออก กันอ่านผิดหน้างาน

/** ออกรหัสลงทะเบียน เช่น RSU-K7F2QX (R5 — ความไม่ซ้ำบังคับจริงที่ unique index) */
export function generateTicketCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += TICKET_ALPHABET[byte % TICKET_ALPHABET.length];
  }
  return `RSU-${code}`;
}
