// หน้าแรก — Server Component
// อ่านข้อมูลบนเซิร์ฟเวอร์ เบราว์เซอร์จึงไม่ต้องแตะฐานข้อมูลเลย

import Link from "next/link";
import { getCurrentEvent, getSeatsLeft } from "@/lib/db";

// ที่นั่งคงเหลือต้องสดเสมอ ห้ามให้ Next แคชหน้านี้ไว้
export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getCurrentEvent();

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

  const seatsLeft = await getSeatsLeft(event);

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
