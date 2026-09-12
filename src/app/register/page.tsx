"use client";

// หน้าลงทะเบียน — ส่งข้อมูลไปที่ /api/register ไม่แตะฐานข้อมูลเอง
// การตรวจในหน้านี้คือ "ความสะดวก" ตัวจริงที่ตัดสินคือเซิร์ฟเวอร์กับฐานข้อมูล

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isValidEmail, isValidPhone } from "@/lib/validate";

type Status = "idle" | "loading" | "success" | "error";

const SHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];

function RegisterForm() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    faculty: "",
    shirtSize: "M", // ★ ฟิลด์ส่วนตัว
  });
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketCode, setTicketCode] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fail = (message: string) => {
    setErrorMessage(message);
    setStatus("error");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return; // AC-5.3 กดรัว ๆ ต้องได้แถวเดียว

    if (!eventId) return fail("ไม่พบข้อมูลกิจกรรม");

    // R3 — ด่านแรกในเบราว์เซอร์ (เซิร์ฟเวอร์ตรวจซ้ำด้วยเกณฑ์เดียวกัน)
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      return fail("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
    }
    if (!isValidEmail(formData.email)) return fail("รูปแบบอีเมลไม่ถูกต้อง");
    if (!isValidPhone(formData.phone)) return fail("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
    if (!consent) return fail("กรุณายอมรับเงื่อนไขการเก็บข้อมูลส่วนบุคคลก่อนลงทะเบียน");

    setStatus("loading");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, eventId, consent }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        ticketCode?: string;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        return fail(result.message ?? "เกิดข้อผิดพลาดในการลงทะเบียน");
      }

      setTicketCode(result.ticketCode ?? "");
      setStatus("success");
    } catch {
      fail("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">ลงทะเบียนสำเร็จ</h2>
        <p className="text-gray-600 mb-6">
          กรุณาบันทึกรหัสลงทะเบียนด้านล่าง เพื่อใช้ยืนยันตอนเช็คอินหน้างาน
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 inline-block">
          <div className="text-sm text-gray-500 mb-1">รหัสลงทะเบียนของคุณ</div>
          <div className="text-3xl font-mono font-bold text-rsu-primary">{ticketCode}</div>
        </div>
        <div>
          <Link href="/" className="text-rsu-primary hover:underline">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-2xl font-bold mb-6 text-center">แบบฟอร์มลงทะเบียน</h2>

      {status === "error" && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ-นามสกุล <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              เบอร์โทรศัพท์ (10 หลัก) <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              inputMode="numeric"
              pattern="[0-9]{10}"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
            คณะ/หน่วยงาน (ถ้ามี)
          </label>
          <input
            id="faculty"
            type="text"
            name="faculty"
            value={formData.faculty}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
          />
        </div>

        {/* ★ ฟิลด์ส่วนตัวของคุณ — เปลี่ยนเป็นของตัวเองได้ */}
        <div>
          <label htmlFor="shirtSize" className="block text-sm font-medium text-gray-700 mb-1">
            ขนาดเสื้อ
          </label>
          <select
            id="shirtSize"
            name="shirtSize"
            value={formData.shirtSize}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
          >
            {SHIRT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* PDPA — ต้องไม่ติ๊กไว้ล่วงหน้า */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          <p className="mb-3">
            ข้อมูลที่กรอก (ชื่อ อีเมล เบอร์โทร คณะ) จะถูกใช้เพื่อจัดกิจกรรมนี้เท่านั้น
            เก็บไว้ไม่เกิน 1 ปีหลังจบกิจกรรม เข้าถึงได้เฉพาะผู้จัดงาน
            และคุณขอแก้ไขหรือลบข้อมูลได้ตลอดเวลาโดยติดต่อผู้จัดงาน
          </p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              ข้าพเจ้ายินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลตามวัตถุประสงค์ข้างต้น{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-rsu-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-rsu-secondary transition-colors disabled:bg-gray-400"
          >
            {status === "loading" ? "กำลังประมวลผล..." : "ยืนยันการลงทะเบียน"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Suspense fallback={<div className="text-center p-8">กำลังโหลด...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
