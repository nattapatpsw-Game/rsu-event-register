"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function RegisterForm() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    faculty: "",
    shirtSize: "M", // Custom field
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketCode, setTicketCode] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateTicketCode = () => {
    return 'RSU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      setErrorMessage("ไม่พบข้อมูลกิจกรรม");
      setStatus("error");
      return;
    }

    // Validation
    if (!formData.fullName || !formData.email || !formData.phone) {
      setErrorMessage("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      setStatus("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage("รูปแบบอีเมลไม่ถูกต้อง");
      setStatus("error");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setErrorMessage("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
      setStatus("error");
      return;
    }

    setStatus("loading");
    const code = generateTicketCode();

    try {
      // Check capacity first
      const { data: event } = await supabase
        .from("events")
        .select("capacity")
        .eq("id", eventId)
        .single();
        
      if (event) {
        const { count } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId);
          
        if (count !== null && count >= event.capacity) {
          setErrorMessage("ขออภัย ที่นั่งเต็มแล้ว");
          setStatus("error");
          return;
        }
      }

      // Insert registration
      const { error } = await supabase.from("registrations").insert({
        event_id: eventId,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        faculty: formData.faculty,
        shirt_size: formData.shirtSize, // Custom field
        ticket_code: code,
      });

      if (error) {
        if (error.code === '23505') { // Unique violation
          setErrorMessage("อีเมลนี้ได้ลงทะเบียนไปแล้ว");
        } else {
          setErrorMessage("เกิดข้อผิดพลาดในการลงทะเบียน: " + error.message);
        }
        setStatus("error");
      } else {
        setTicketCode(code);
        setStatus("success");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาด");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ลงทะเบียนสำเร็จ!</h2>
        <p className="text-gray-600 mb-6">กรุณาบันทึกรหัสลงทะเบียนด้านล่างเพื่อใช้ในการเช็คอินหน้างาน</p>
        
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">แบบฟอร์มลงทะเบียน</h2>
      
      {status === "error" && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
          <input 
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
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ (10 หลัก) <span className="text-red-500">*</span></label>
            <input 
              type="tel" 
              name="phone"
              pattern="[0-9]{10}"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary" 
              required 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">คณะ/หน่วยงาน (ถ้ามี)</label>
          <input 
            type="text" 
            name="faculty"
            value={formData.faculty}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ขนาดเสื้อ (ฟิลด์พิเศษ)</label>
          <select 
            name="shirtSize"
            value={formData.shirtSize}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
          >
            <option value="S">S (รอบอก 36")</option>
            <option value="M">M (รอบอก 38")</option>
            <option value="L">L (รอบอก 40")</option>
            <option value="XL">XL (รอบอก 42")</option>
            <option value="XXL">XXL (รอบอก 44")</option>
          </select>
        </div>

        <div className="pt-4">
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
      <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
