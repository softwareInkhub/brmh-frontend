'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Settings, ChevronRight, Database, Code, Package, Server, ChevronLeft, Menu, X } from 'react-feather';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  activeNamespace?: string;
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeNamespace, onCollapse }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
        onCollapse?.(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onCollapse]);

  // Notify parent when collapse state changes
  useEffect(() => {
    onCollapse?.(isCollapsed);
  }, [isCollapsed, onCollapse]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const NavLinks = () => (
    <>
      {/* <div className={`px-4 mb-4 transition-opacity duration-300 ${
        isCollapsed && !isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
      }`}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</span>
      </div> */}

      <Link 
        href="/namespace"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/namespace' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Namespaces"
      >
        <Layers size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>Namespaces</span>
      </Link>
{/* 
      <div className={`px-4 mt-6 mb-4 transition-opacity duration-300 ${
        isCollapsed && !isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
      }`}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">API</span>
      </div> */}

      <Link 
        href="/api-service"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/api-service' ? 'bg-gray-800 text-white' : ''
        }`}
        title="API Services"
      >
        <Server size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>API Services</span>
      </Link>
      <Link 
        href="/aws-services"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/aws-services' ? 'bg-gray-800 text-white' : ''
        }`}
        title="AWS Services"
      >
        <Server size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>AWS Services</span>
      </Link>
      <Link 
        href="/database"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/database-services' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Database Services"
      >
        <Server size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>Database</span>
      </Link>
      <Link 
        href="/yaml"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/yaml' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Database Services"
      >
        <Server size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>YAML</span>
      </Link>
      
      <Link 
        href="/executions"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/executions' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Database Services"
      >
        <Server size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>Executions</span>
      </Link>
      

      {/* <div className={`px-4 mt-6 mb-4 transition-opacity duration-300 ${
        isCollapsed && !isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
      }`}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tools</span>
      </div> */}

      {/* <Link 
        href="/api-tester"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/api-tester' ? 'bg-gray-800 text-white' : ''
        }`}
        title="API Tester"
      >
        <Code size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>API Tester</span>
      </Link>

      <Link 
        href="/database"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/database' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Database"
      >
        <Database size={18} className="min-w-[18px]" />
        <span className={`whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
        }`}>Database</span>
      </Link> */}
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors duration-200"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${isCollapsed && !isMobileMenuOpen ? 'w-20' : 'w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          h-screen bg-gray-900 text-white fixed left-0 top-0 z-40 flex flex-col
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Logo/Brand Section */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3 overflow-hidden">
            <Package size={24} className="text-blue-400 min-w-[24px]" />
            <span className={`text-xl font-semibold whitespace-nowrap transition-opacity duration-300 ${
              isCollapsed && !isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}>API Client</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block p-1 rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            {isCollapsed ? (
              <ChevronRight size={20} className="text-gray-400" />
            ) : (
              <ChevronLeft size={20} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-4 no-scrollbar">
          <NavLinks />
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-800">
          <Link 
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors duration-200 ${
              pathname === '/settings' ? 'bg-gray-800 text-white' : ''
            }`}
            title="Settings"
          >
            <Settings size={18} className="min-w-[18px]" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${
              isCollapsed && !isMobileMenuOpen ? 'opacity-0 w-0' : 'opacity-100'
            }`}>Settings</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
