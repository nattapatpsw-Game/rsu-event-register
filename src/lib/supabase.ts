// client ฝั่งสาธารณะ (anon key) — ใช้อ่านตาราง events เท่านั้น
// ตาราง registrations ไม่มี policy ให้ anon จึงอ่านผ่าน client ตัวนี้ไม่ได้ "โดยตั้งใจ"
//
// สร้างแบบ lazy (เรียกตอนใช้ ไม่ใช่ตอน import) เพื่อให้ next build ผ่าน
// แม้เครื่องที่ build ยังไม่มีตัวแปร environment

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getPublicSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ดังไว้ดีกว่าเงียบ: ถ้าลืมตั้ง env จะได้เห็น error ชัด ๆ
  // ไม่ใช่ไปงงตอน deploy แล้วหน้าเว็บว่างเปล่าโดยไม่มีอะไรบอก
  if (!url || !anonKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "— ดูตัวอย่างที่ไฟล์ .env.example"
    );
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
