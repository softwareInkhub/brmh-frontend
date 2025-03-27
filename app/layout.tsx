'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar onCollapse={(collapsed) => setIsCollapsed(collapsed)} />
          <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} p-4 md:p-8`}>
            <div className=" mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
