// หน้าแรก — Server Component
// อ่านข้อมูลบนเซิร์ฟเวอร์ เบราว์เซอร์จึงไม่ต้องแตะฐานข้อมูลเลย

import Link from "next/link";
import { getCurrentEvent, getSeatsLeft } from "@/lib/db";
import { missingEnv, missingEnvMessage } from "@/lib/env";
import type { EventRow } from "@/lib/types";

// ที่นั่งคงเหลือต้องสดเสมอ ห้ามให้ Next แคชหน้านี้ไว้
export const dynamic = "force-dynamic";

/** หน้าแจ้งว่าตั้งค่ายังไม่ครบ — ดีกว่าปล่อยให้ขึ้นหน้าดำ "A server error occurred" */
function SetupNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-gray-700 leading-relaxed mb-6 break-words">{detail}</p>
        <ol className="list-decimal list-inside text-gray-600 space-y-2 text-sm">
          <li>
            คัดลอก <code className="bg-gray-100 px-1 rounded">.env.example</code> เป็น{" "}
            <code className="bg-gray-100 px-1 rounded">.env.local</code> แล้วใส่ค่าให้ครบทั้ง 2 ตัว
          </li>
          <li>
            รัน <code className="bg-gray-100 px-1 rounded">db/schema.sql</code> →{" "}
            <code className="bg-gray-100 px-1 rounded">db/rls.sql</code> →{" "}
            <code className="bg-gray-100 px-1 rounded">db/seed.sql</code> ใน Supabase → SQL Editor
          </li>
          <li>
            ถ้าเป็นเว็บจริง ให้ใส่ตัวแปรที่ Vercel → Settings → Environment Variables
            แล้ว <strong>สั่ง Redeploy</strong> ด้วย มิฉะนั้นของเก่าจะยังไม่เห็นค่าที่เพิ่งใส่
          </li>
        </ol>
      </section>
    </div>
  );
}

export default async function Home() {
  // ด่านที่ 1 — ตรวจตัวแปรก่อน แล้วบอกชื่อตัวที่ขาดตรง ๆ
  const missing = missingEnv();
  if (missing.length > 0) {
    return (
      <SetupNotice
        title="ตั้งค่ายังไม่ครบ"
        detail={missingEnvMessage(missing)}
      />
    );
  }

  // ด่านที่ 2 — อ่านข้อมูล ถ้าพังให้แสดงข้อความจริงแทนหน้าดำ
  let event: EventRow | null = null;
  let seatsLeft = 0;
  try {
    event = await getCurrentEvent();
    if (event) seatsLeft = await getSeatsLeft(event);
  } catch (error: unknown) {
    return (
      <SetupNotice
        title="เชื่อมต่อฐานข้อมูลไม่สำเร็จ"
        detail={error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}
      />
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center py-12">
          <h1 className="text-2xl font-bold mb-4">
            ยังไม่มีกิจกรรมที่เปิดรับลงทะเบียนในขณะนี้
          </h1>
          <p className="text-gray-600">
            กรุณารัน <code className="bg-gray-100 px-1 rounded">db/schema.sql</code> →{" "}
            <code className="bg-gray-100 px-1 rounded">db/rls.sql</code> →{" "}
            <code className="bg-gray-100 px-1 rounded">db/seed.sql</code> ใน Supabase ก่อน
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-4xl font-bold text-rsu-primary mb-4">{event.name}</h1>
        {event.description && (
          <p className="text-gray-600 mb-6 text-lg">{event.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left bg-gray-50 p-6 rounded-lg">
          <div>
            <strong className="block text-gray-700">วันที่และเวลา:</strong>
            <span className="text-gray-600">
              {new Date(event.event_date).toLocaleString("th-TH", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div>
            <strong className="block text-gray-700">สถานที่:</strong>
            <span className="text-gray-600">{event.location ?? "-"}</span>
          </div>
          <div>
            <strong className="block text-gray-700">ที่นั่งทั้งหมด:</strong>
            <span className="text-gray-600">{event.capacity}</span>
          </div>
          <div>
            <strong className="block text-gray-700">ที่นั่งคงเหลือ:</strong>
            <span className="text-rsu-primary font-bold text-xl">{seatsLeft}</span>
          </div>
        </div>

        {/* R2 — เต็มแล้วต้องไม่มีปุ่มให้กด (ด่านจริงอยู่ที่ API และ trigger) */}
        {seatsLeft > 0 ? (
          <Link
            href={`/register?eventId=${event.id}`}
            className="inline-block bg-rsu-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-rsu-secondary transition-colors"
          >
            ลงทะเบียนเข้าร่วมกิจกรรม
          </Link>
        ) : (
          <div className="inline-block bg-gray-400 text-white font-bold py-3 px-8 rounded-lg">
            ที่นั่งเต็มแล้ว
          </div>
        )}
      </section>
    </div>
  );
}
