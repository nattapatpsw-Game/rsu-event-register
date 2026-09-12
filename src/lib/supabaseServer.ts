// client ฝั่งเซิร์ฟเวอร์ (service role) — ข้าม RLS ได้
//
// ★ ห้าม import ไฟล์นี้จากไฟล์ที่มี "use client" เด็ดขาด
//   ถ้าเผลอ import จะมีคีย์ service role หลุดไปอยู่ใน bundle ที่ผู้ใช้ทุกคนอ่านได้
//   วิธีตรวจ: หลัง build ให้ค้นคำว่า "service_role" ใน .next/static ต้องไม่เจอ

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY — ดูตัวอย่างที่ไฟล์ .env.example " +
        "(ถ้า deploy แล้วเพิ่งใส่ใน dashboard อย่าลืมสั่ง redeploy)"
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
