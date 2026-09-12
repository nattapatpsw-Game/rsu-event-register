// ตรวจว่าตัวแปร environment ครบไหม
//
// ทำไมต้องมีไฟล์นี้:
//   ถ้าปล่อยให้โค้ดโยน error ตอนตัวแปรหาย เว็บจริงบน Vercel จะขึ้นหน้าดำ
//   "This page couldn't load — A server error occurred" โดยไม่บอกอะไรเลย
//   เพราะ Next.js ซ่อนข้อความ error ทั้งหมดบน production เพื่อความปลอดภัย
//   ผลคือ "ดังไว้ดีกว่าเงียบ" กลายเป็นเงียบสนิท
//
//   ไฟล์นี้ทำให้เราตรวจก่อนได้ แล้วแสดงหน้าที่บอกตรง ๆ ว่าขาดตัวแปรไหน

/**
 * โปรเจกต์นี้ใช้ตัวแปรแค่ 2 ตัว และทั้งสองตัวเปิดเผยได้
 * ถูกฝังลงไฟล์ JavaScript ที่ส่งให้เบราว์เซอร์ — ใครเปิด View Source ก็เห็น
 *
 * ★ ความปลอดภัยไม่ได้อยู่ที่การซ่อนคีย์ แต่อยู่ที่
 *   Row Level Security (db/rls.sql) + ฟังก์ชัน security definer (db/schema.sql)
 *   + บัญชีแอดมินที่เก็บอยู่ในระบบ Auth ของ Supabase
 */
export const PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/**
 * ไม่มีคีย์ลับในโปรเจกต์นี้ — ตั้งใจให้ว่าง
 * ถ้าวันไหนมีคนมาเติมชื่อตัวแปรลับตรงนี้ ให้ถามก่อนว่าทำไมถึงจำเป็น
 */
export const ALL_ENV: readonly string[] = [...PUBLIC_ENV];

/** คืนชื่อตัวแปรที่ยังไม่ได้ตั้งค่า (คืนแค่ "ชื่อ" ไม่เคยคืนค่าจริง) */
export function missingEnv(keys: readonly string[] = ALL_ENV): string[] {
  return keys.filter((key) => !process.env[key]);
}

/** ข้อความภาษาไทยสำหรับแจ้งผู้ใช้ว่าต้องไปตั้งค่าอะไร */
export function missingEnvMessage(missing: string[]): string {
  return (
    `ยังไม่ได้ตั้งค่าตัวแปร environment ${missing.length} ตัว: ${missing.join(", ")} ` +
    `— ใส่ใน .env.local สำหรับเครื่องตัวเอง หรือใน Vercel → Settings → ` +
    `Environment Variables สำหรับเว็บจริง (ใส่แล้วต้องสั่ง Redeploy ด้วย)`
  );
}
