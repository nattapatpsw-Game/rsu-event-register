"use client";

// หน้าแอดมิน — ไม่แตะฐานข้อมูลเอง ทุกอย่างผ่าน /api/admin/*
//
// R4 — สิ่งที่ "ไม่มี" ในไฟล์นี้ คือสิ่งที่สำคัญที่สุด:
//   · ไม่มีรหัสผ่าน            → อยู่ในระบบ Auth ของ Supabase
//   · ไม่มีคีย์ที่ข้าม RLS ได้  → โปรเจกต์นี้ไม่มีคีย์แบบนั้นเลย
//   · ไม่มี token              → เก็บอยู่ในคุกกี้ httpOnly ซึ่ง JavaScript อ่านไม่ได้
//
// เปิด View Source แล้วค้นหารหัสผ่านของตัวเอง ต้องหาไม่เจอ — นั่นคือ AC-4.3

import { useCallback, useEffect, useState } from "react";
import type { RegistrationRow } from "@/lib/types";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [listError, setListError] = useState("");

  const fetchRegistrations = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setListError("");
    try {
      const response = await fetch("/api/admin/registrations");
      const result = (await response.json()) as {
        ok: boolean;
        registrations?: RegistrationRow[];
        message?: string;
      };
      if (!response.ok || !result.ok) {
        // 401 = คุกกี้หาย หรือ token หมดอายุ (ค่าตั้งต้นของ Supabase คือ 1 ชั่วโมง)
        if (response.status === 401) {
          setIsAuthenticated(false);
          setRegistrations([]);
        } else {
          setListError(result.message ?? "อ่านรายชื่อไม่สำเร็จ");
        }
        return false;
      }
      setRegistrations(result.registrations ?? []);
      return true;
    } catch {
      setListError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // คุกกี้เป็น httpOnly หน้าเว็บจึงอ่านเองไม่ได้ว่าล็อกอินอยู่ไหม
  // วิธีเดียวที่ถูกต้องคือ "ลองถามเซิร์ฟเวอร์ดู" แล้วดูว่าได้ 401 กลับมาหรือเปล่า
  useEffect(() => {
    void (async () => {
      const ok = await fetchRegistrations();
      setIsAuthenticated(ok);
      setCheckingSession(false);
    })();
  }, [fetchRegistrations]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        setLoginError(result.message ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      setPassword("");
      setIsAuthenticated(true);
      await fetchRegistrations();
    } catch {
      setLoginError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setRegistrations([]);
    setIsAuthenticated(false);
  };

  const handleCheckIn = async (id: string, currentStatus: boolean) => {
    const response = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, checkedIn: !currentStatus }),
    });
    if (response.ok) {
      await fetchRegistrations();
    } else {
      setListError("อัปเดตสถานะเช็คอินไม่สำเร็จ");
    }
  };

  const filtered = registrations.filter((row) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return (
      row.full_name.toLowerCase().includes(keyword) ||
      row.email.toLowerCase().includes(keyword) ||
      row.ticket_code.toLowerCase().includes(keyword)
    );
  });

  const exportCSV = () => {
    if (filtered.length === 0) return;

    const headers = [
      "รหัสลงทะเบียน",
      "ชื่อ-นามสกุล",
      "อีเมล",
      "เบอร์โทร",
      "คณะ/หน่วยงาน",
      "ขนาดเสื้อ",
      "เช็คอินแล้ว",
      "เวลาที่สมัคร",
    ];
    const rows = filtered.map((row) => [
      csvCell(row.ticket_code),
      csvCell(row.full_name),
      csvCell(row.email),
      csvCell(row.phone, { keepLeadingZero: true }),
      csvCell(row.faculty ?? ""),
      csvCell(row.shirt_size ?? ""),
      csvCell(row.checked_in ? "ใช่" : "ไม่"),
      csvCell(new Date(row.created_at).toLocaleString("th-TH")),
    ]);

    const csv = [headers.map((h) => csvCell(h)).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    // ﻿ (BOM) ทำให้ Excel อ่านภาษาไทยไม่เป็นตัวต่างดาว
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ระหว่างถามเซิร์ฟเวอร์ว่ายังล็อกอินอยู่ไหม อย่าเพิ่งโชว์ฟอร์ม เดี๋ยวหน้าจะกระพริบ
  if (checkingSession) {
    return (
      <div className="container mx-auto p-8 max-w-md mt-20 text-center text-gray-500">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-md mt-20">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold mb-2 text-center">สำหรับเจ้าหน้าที่</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            ใช้บัญชีผู้ดูแลที่สร้างไว้ใน Supabase → Authentication → Users
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
                placeholder="admin@rsu.ac.th"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                รหัสผ่าน
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
                placeholder="ใส่รหัสผ่านเพื่อเข้าสู่ระบบ"
                autoComplete="current-password"
              />
              {loginError && <p className="text-red-500 text-sm mt-1">{loginError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-gray-800 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ระบบจัดการผู้ลงทะเบียน</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            ส่งออก CSV
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {listError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm" role="alert">
          {listError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <input
            type="text"
            placeholder="ค้นหาชื่อ อีเมล หรือรหัสลงทะเบียน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-sm p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
          />
          <div className="text-sm text-gray-500">
            แสดง {filtered.length} จากทั้งหมด {registrations.length} รายการ
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">รหัส</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ชื่อ-นามสกุล</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ข้อมูลติดต่อ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ขนาดเสื้อ</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">สถานะ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-rsu-primary">
                      {row.ticket_code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{row.full_name}</div>
                      <div className="text-sm text-gray-500">{row.faculty}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{row.email}</div>
                      <div className="text-sm text-gray-500">{row.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.shirt_size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {row.checked_in ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          เช็คอินแล้ว
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          รอเช็คอิน
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleCheckIn(row.id, row.checked_in)}
                        className={`px-3 py-1 rounded-md text-white transition-colors ${
                          row.checked_in
                            ? "bg-gray-500 hover:bg-gray-600"
                            : "bg-rsu-primary hover:bg-rsu-secondary"
                        }`}
                      >
                        {row.checked_in ? "ยกเลิก" : "เช็คอิน"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * เตรียมค่าหนึ่งช่องให้ปลอดภัยก่อนเขียนลง CSV
 * - ครอบด้วยเครื่องหมายคำพูดและ escape " เสมอ
 * - ค่าที่ขึ้นต้นด้วย = + - @ ถูกเติม ' นำหน้า กัน Excel ตีความเป็นสูตร (CSV injection)
 * - เบอร์โทรเติม tab นำหน้า เพื่อไม่ให้ Excel ตัดเลข 0 ตัวหน้าทิ้ง
 */
function csvCell(value: string, options?: { keepLeadingZero?: boolean }): string {
  let text = value ?? "";
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (options?.keepLeadingZero) text = `\t${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
