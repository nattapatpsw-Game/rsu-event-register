// client คีย์สาธารณะ (anon key) — ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์
//
// ทำอะไรได้บ้าง (ถูกจำกัดด้วย db/rls.sql ไม่ใช่ด้วยความลับของคีย์):
//   · อ่านตาราง events                       ได้
//   · เรียกฟังก์ชัน seats_taken()             ได้  → รู้แค่ "ตัวเลข" ไม่รู้ว่าใครลง
//   · เรียกฟังก์ชัน create_registration()     ได้  → เพิ่มแถวได้ทางนี้ทางเดียว
//   · อ่าน/แก้ตาราง registrations ตรง ๆ       ไม่ได้
//
// สร้างแบบ lazy (เรียกตอนใช้ ไม่ใช่ตอน import) เพื่อให้ next build ผ่าน
// แม้เครื่องที่ build ยังไม่มีตัวแปร environment

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** อ่านค่าตั้งต้นของ Supabase — ใช้ร่วมกันทุก client ในโปรเจกต์ */
export function getSupabaseConfig(): { url: string; anonKey: string } {
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
  return { url, anonKey };
}

export function getPublicSupabase(): SupabaseClient {
  if (cached) return cached;

  const { url, anonKey } = getSupabaseConfig();
  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
