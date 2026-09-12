// ชนิดข้อมูลของ 2 ตาราง — ใช้แทน any ทุกที่ในโปรเจกต์

export type EventRow = {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  location: string | null;
  capacity: number;
  created_at: string;
};

export type RegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string;
  faculty: string | null;
  /** ★ ฟิลด์ส่วนตัว — เปลี่ยนชื่อให้ตรงกับ db/schema.sql ของคุณ */
  shirt_size: string | null;
  ticket_code: string;
  checked_in: boolean;
  consent_at: string | null;
  created_at: string;
};

/** ข้อมูลที่รับจากฟอร์มลงทะเบียน (ก่อนผ่าน validate) */
export type RegistrationInput = {
  eventId: string;
  fullName: string;
  email: string;
  phone: string;
  faculty: string;
  shirtSize: string;
  consent: boolean;
};

/** รหัส error ที่ใช้ร่วมกันระหว่างเซิร์ฟเวอร์กับหน้าจอ — ข้อความไทยอยู่ที่ ERROR_MESSAGES */
export type AppErrorCode =
  | "MISSING_FIELD"
  | "INVALID_EMAIL"
  | "INVALID_PHONE"
  | "CONSENT_REQUIRED"
  | "EVENT_NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "EVENT_FULL"
  | "TICKET_CODE_COLLISION"
  | "UNAUTHORIZED"
  | "SERVER_ERROR";

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  MISSING_FIELD: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน",
  INVALID_EMAIL: "รูปแบบอีเมลไม่ถูกต้อง",
  INVALID_PHONE: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก",
  CONSENT_REQUIRED: "กรุณายอมรับเงื่อนไขการเก็บข้อมูลส่วนบุคคลก่อนลงทะเบียน",
  EVENT_NOT_FOUND: "ไม่พบข้อมูลกิจกรรม",
  DUPLICATE_EMAIL: "อีเมลนี้ลงทะเบียนกิจกรรมนี้ไปแล้ว",
  EVENT_FULL: "ขออภัย ที่นั่งเต็มแล้ว",
  TICKET_CODE_COLLISION: "ระบบออกรหัสลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบก่อน",
  SERVER_ERROR: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง",
};

export function messageFor(code: AppErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.SERVER_ERROR;
}
