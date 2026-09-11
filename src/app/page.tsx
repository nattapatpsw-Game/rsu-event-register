import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function Home() {
  // Try to fetch the event from Supabase
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Also fetch registration count to show seats left
  let registeredCount = 0;
  if (event) {
    const { count } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    registeredCount = count || 0;
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        {event ? (
          <>
            <h1 className="text-4xl font-bold text-rsu-primary mb-4">{event.name}</h1>
            <p className="text-gray-600 mb-6 text-lg">{event.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left bg-gray-50 p-6 rounded-lg">
              <div>
                <strong className="block text-gray-700">วันที่และเวลา:</strong>
                <span className="text-gray-600">{new Date(event.event_date).toLocaleString('th-TH')}</span>
              </div>
              <div>
                <strong className="block text-gray-700">สถานที่:</strong>
                <span className="text-gray-600">{event.location}</span>
              </div>
              <div>
                <strong className="block text-gray-700">ที่นั่งทั้งหมด:</strong>
                <span className="text-gray-600">{event.capacity}</span>
              </div>
              <div>
                <strong className="block text-gray-700">ที่นั่งคงเหลือ:</strong>
                <span className="text-rsu-primary font-bold text-xl">{Math.max(0, event.capacity - registeredCount)}</span>
              </div>
            </div>

            {event.capacity - registeredCount > 0 ? (
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
          </>
        ) : (
          <div className="py-12">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">ยังไม่มีกิจกรรมที่เปิดรับลงทะเบียนในขณะนี้</h1>
            <p className="text-gray-600">กรุณาตั้งค่าฐานข้อมูล Supabase และเพิ่มกิจกรรมในตาราง events</p>
          </div>
        )}
      </section>
    </div>
  );
}
