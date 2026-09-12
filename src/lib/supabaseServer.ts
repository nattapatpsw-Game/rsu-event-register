// client ที่ "สวมสิทธิ์ของผู้ที่ล็อกอินแล้ว" — ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น
//
// ใช้คีย์สาธารณะตัวเดิม แต่แนบ access token ของผู้ใช้ไปกับทุก request
// ฐานข้อมูลจึงรู้ว่า auth.uid() คือใคร แล้ว RLS ใน db/rls.sql เป็นคนตัดสินว่าเห็นอะไรได้บ้าง
//
// ★ ต่างจากรุ่นก่อนตรงไหน
//   เดิม  : ใช้ SUPABASE_SECRET_KEY ซึ่งข้าม RLS ได้ "ทุกตาราง ทุกแถว"
//           ถ้าคีย์หลุด = ข้อมูลทั้งฐานหลุด และถ้าเผลอ import ในไฟล์ "use client" ก็หลุดทันที
//   ใหม่  : ไม่มีคีย์ที่ข้าม RLS อยู่ในโปรเจกต์เลย
//           token ของผู้ใช้หมดอายุเองได้ เพิกถอนได้ และให้สิทธิ์เท่าที่ policy เขียนไว้
//
// ★ ห้ามสร้าง client ตัวนี้ค้างไว้ใช้ซ้ำ (ห้าม cache) เพราะ token ผูกกับผู้ใช้แต่ละคน

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase";

export function getUserSupabase(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
