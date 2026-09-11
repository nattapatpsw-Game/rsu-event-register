"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin1234") { // Simple password logic
      setIsAuthenticated(true);
      fetchRegistrations();
    } else {
      setPasswordError("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("registrations")
      .select(`*, events(name)`)
      .order("created_at", { ascending: false });
      
    if (data) {
      setRegistrations(data);
    }
    setLoading(false);
  };

  const handleCheckIn = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("registrations")
      .update({ checked_in: !currentStatus })
      .eq("id", id);
      
    if (!error) {
      fetchRegistrations();
    } else {
      alert("Error updating check-in status: " + error.message);
    }
  };

  const exportCSV = () => {
    if (registrations.length === 0) return;
    
    const headers = ["Ticket Code", "Name", "Email", "Phone", "Faculty", "Shirt Size", "Event", "Checked In", "Date"];
    const rows = filteredRegistrations.map(r => [
      r.ticket_code,
      `"${r.full_name}"`,
      r.email,
      `="${r.phone}"`,
      `"${r.faculty || ''}"`,
      r.shirt_size,
      `"${r.events?.name || ''}"`,
      r.checked_in ? "Yes" : "No",
      new Date(r.created_at).toLocaleString('th-TH')
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "registrations_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRegistrations = registrations.filter(r => 
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.ticket_code.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-md mt-20">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">สำหรับเจ้าหน้าที่ (Admin)</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary" 
                placeholder="ใส่รหัสผ่านเพื่อเข้าสู่ระบบ"
              />
              {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
            </div>
            <button 
              type="submit" 
              className="w-full bg-gray-800 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
            <p className="text-xs text-gray-500 text-center mt-4">รหัสผ่านสำหรับทดสอบ: admin1234</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">ระบบจัดการผู้ลงทะเบียน</h1>
        <button 
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-4 md:space-y-0 md:space-x-4">
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, อีเมล, รหัสลงทะเบียน..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-sm p-2 border border-gray-300 rounded-md focus:ring-rsu-primary focus:border-rsu-primary"
          />
          <div className="text-sm text-gray-500">
            จำนวนทั้งหมด: {filteredRegistrations.length} รายการ
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัส</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ข้อมูลติดต่อ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ไซส์เสื้อ</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">กำลังโหลด...</td></tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-medium text-rsu-primary">{reg.ticket_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{reg.full_name}</div>
                      <div className="text-sm text-gray-500">{reg.faculty}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{reg.email}</div>
                      <div className="text-sm text-gray-500">{reg.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reg.shirt_size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {reg.checked_in ? (
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
                        onClick={() => handleCheckIn(reg.id, reg.checked_in)}
                        className={`px-3 py-1 rounded-md text-white transition-colors ${
                          reg.checked_in ? 'bg-gray-500 hover:bg-gray-600' : 'bg-rsu-primary hover:bg-rsu-secondary'
                        }`}
                      >
                        {reg.checked_in ? 'ยกเลิก' : 'เช็คอิน'}
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
