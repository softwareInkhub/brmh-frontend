'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { useState, useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Close sidebar when screen size changes to prevent issues
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <html lang="en">
      <body className={`${inter.className} ${isSidebarOpen ? 'overflow-hidden md:overflow-auto' : ''}`}>
        <div className="flex min-h-screen bg-gray-50">
          <Navbar 
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            isSidebarCollapsed={isCollapsed} 
          />
          <Sidebar 
            onCollapse={(collapsed) => setIsCollapsed(collapsed)} 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
          <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-56'} p-2 pt-3 md:p-4 mt-12`}>
            <div className="mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
