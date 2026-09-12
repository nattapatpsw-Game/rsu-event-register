import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

// ★ ฟอนต์ต้องมี glyph ภาษาไทย ไม่งั้นทุกเครื่องจะเห็นฟอนต์ fallback คนละแบบ
//   (Inter subset "latin" ไม่มีตัวอักษรไทยเลย)
//
//   ที่นี่โหลดด้วย <link> แทน next/font/google โดยตั้งใจ:
//   next/font ดาวน์โหลดฟอนต์ "ตอน build" ถ้าเครือข่ายห้องอบรมหรือ CI เข้า
//   fonts.googleapis.com ไม่ได้ next build จะล้มทั้งงาน — วันอบรมเสี่ยงเกินไป
//   วิธีนี้ถ้าโหลดฟอนต์ไม่ได้ ก็แค่ตกไปใช้ฟอนต์ระบบ เว็บยังขึ้นปกติ

export const metadata: Metadata = {
  title: "RSU Event Register",
  description: "ระบบลงทะเบียนและเช็คอินกิจกรรม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap"
        />
      </head>
      <body className="bg-rsu-background text-rsu-text antialiased flex flex-col min-h-screen">
        <div className="bg-gray-800 text-white text-sm py-2 px-6 flex justify-end gap-6">
          <span>นักศึกษาใหม่</span>
          <span>บุคลากร/นักศึกษา</span>
        </div>

        <header className="flex items-center justify-between p-6 shadow-sm bg-white sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/images.png"
                alt="โลโก้มหาวิทยาลัยรังสิต"
                width={160}
                height={48}
                priority
                className="h-12 w-auto object-contain"
              />
            </Link>
            <span className="text-2xl sm:text-3xl font-bold text-rsu-primary hidden sm:block">
              RSU Event Register
            </span>
          </div>
          <nav>
            <ul className="flex gap-6 text-base font-medium text-gray-700">
              <li>
                <Link href="/" className="hover:text-rsu-primary transition-colors">
                  หน้าแรก
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        <main className="flex-grow">{children}</main>

        <footer className="bg-gray-100 text-center p-12 mt-12 border-t border-gray-200">
          <p className="text-gray-600 text-sm mb-2">
            ข้อมูลที่เก็บใช้เพื่อการจัดกิจกรรมนี้เท่านั้น
            ต้องการแก้ไขหรือขอลบข้อมูล ติดต่อผู้จัดงาน
          </p>
          <p className="text-gray-500 text-sm">&copy; 2026 RANGSIT UNIVERSITY</p>
        </footer>
      </body>
    </html>
  );
}
