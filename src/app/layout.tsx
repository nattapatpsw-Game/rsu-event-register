import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-gray-50 text-gray-800 antialiased font-sans flex flex-col min-h-screen`}>
        {/* Top Bar */}
        <div className="bg-gray-800 text-white text-sm py-2 px-6 flex justify-end space-x-6">
          <a href="#" className="hover:text-rsu-primary">นักศึกษาใหม่</a>
          <a href="#" className="hover:text-rsu-primary">บุคลากร/นักศึกษา</a>
        </div>

        {/* Header */}
        <header className="flex items-center justify-between p-6 shadow-sm bg-white sticky top-0 z-50">
          <div className="flex items-center space-x-4">
            <a href="/">
              <img src="/images.png" alt="RSU Logo" className="h-12 w-auto object-contain" />
            </a>
            <div className="text-3xl font-bold text-rsu-primary font-secondary hidden sm:block">
              RSU Event Register
            </div>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-6 text-md font-medium text-gray-700">
              <li><a href="/" className="hover:text-rsu-primary transition-colors">หน้าแรก</a></li>
              <li><a href="/admin" className="hover:text-rsu-primary transition-colors">แอดมิน</a></li>
            </ul>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-100 text-center p-12 mt-12 border-t border-gray-200">
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm text-gray-700 font-medium">
            <a href="#" className="hover:text-rsu-primary">สื่อประชาสัมพันธ์</a>
            <a href="#" className="hover:text-rsu-primary">คำถามที่พบบ่อย</a>
            <a href="#" className="hover:text-rsu-primary">Privacy Policy</a>
          </div>
          <p className="text-gray-500 text-sm">&copy; 2026 RANGSIT UNIVERSITY</p>
        </footer>
      </body>
    </html>
  );
}
