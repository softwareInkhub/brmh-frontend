'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Settings, ChevronRight, Database, Code, Package, Server, ChevronLeft, X, Globe, Cloud, FileText, Activity } from 'react-feather';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  activeNamespace?: string;
  onCollapse?: (collapsed: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeNamespace, onCollapse, isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(false); // Show full sidebar on mobile
        onCollapse?.(false);
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

  const handleCollapseToggle = () => {
    setIsCollapsed((prev) => !prev);
    onCollapse?.(!isCollapsed);
  };

  const handleOptionClick = () => {
    if (window.innerWidth < 768) {
      onClose?.();
    }
  };

  const NavLinks = () => (
    <>
      <Link 
        href="/namespace"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/namespace' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Namespaces"
        onClick={handleOptionClick}
      >
        <Layers size={18} className="min-w-[18px]" />
        {!isCollapsed && <span className="whitespace-nowrap">Namespaces</span>}
      </Link>

      <Link 
        href="/api-service"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/api-service' ? 'bg-gray-800 text-white' : ''
        }`}
        title="API Services"
        onClick={handleOptionClick}
      >
        <Globe size={18} className="min-w-[18px]" />
        {!isCollapsed && <span className="whitespace-nowrap">API Services</span>}
      </Link>
      <Link 
        href="/aws-services"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/aws-services' ? 'bg-gray-800 text-white' : ''
        }`}
        title="AWS Services"
        onClick={handleOptionClick}
      >
        <Cloud size={18} className="min-w-[18px]" />
        {!isCollapsed && <span className="whitespace-nowrap">AWS Services</span>}
      </Link>
      <Link 
        href="/database"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/database-services' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Database Services"
        onClick={handleOptionClick}
      >
        <Database size={18} className="min-w-[18px]" />
        {!isCollapsed && <span className="whitespace-nowrap">Database</span>}
      </Link>
      <Link 
        href="/yaml"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/yaml' ? 'bg-gray-800 text-white' : ''
        }`}
        title="YAML"
        onClick={handleOptionClick}
      >
        <FileText size={18} className="min-w-[18px]" />
        {!isCollapsed && <span className="whitespace-nowrap">YAML</span>}
      </Link>
      
      <Link 
        href="/executions"
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${
          pathname === '/executions' ? 'bg-gray-800 text-white' : ''
        }`}
        title="Executions"
        onClick={handleOptionClick}
      >
        <Activity size={18} className="min-w-[18px]" />
        {!isCollapsed && <span className="whitespace-nowrap">Executions</span>}
      </Link>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${isCollapsed ? 'w-16' : 'w-56'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          h-screen bg-gray-900 text-white fixed left-0 top-0 z-40 flex flex-col
          transition-all duration-300 ease-in-out overflow-hidden
        `}
      >
        {/* Logo/Brand Section */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3 overflow-hidden">
            <Package size={22} className="text-blue-400 min-w-[22px]" />
            {!isCollapsed && (
              <span className="text-lg font-semibold whitespace-nowrap">BRMH</span>
            )}
          </div>
          <button
            onClick={handleCollapseToggle}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 md:block hidden"
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="text-gray-400" />
            ) : (
              <ChevronLeft size={18} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 transition-colors duration-200 md:hidden"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
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
            onClick={handleOptionClick}
          >
            <Settings size={18} className="min-w-[18px]" />
            {!isCollapsed && (
              <span className="whitespace-nowrap">Settings</span>
            )}
          </Link>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
