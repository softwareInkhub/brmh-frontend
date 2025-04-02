'use client';

import React from 'react';
import { Menu, Package } from 'react-feather';
import Link from 'next/link';

interface NavbarProps {
  onMenuClick: () => void;
  isSidebarCollapsed?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isSidebarCollapsed }) => {
  return (
    <nav className="fixed top-0 right-0 left-0 h-12 bg-white border-b border-gray-200 z-30">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side with menu button and logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden flex items-center justify-center"
            title="Toggle Menu"
          >
            <Menu size={20} />
          </button>
          
          {/* Logo - always visible on mobile, only visible when sidebar is collapsed on desktop */}
          <div className="flex items-center pl-18">
            {/* For desktop: only show when sidebar is collapsed */}
            <Link href="/" className="hidden md:flex items-center gap-2">
              {isSidebarCollapsed && (
                <>
                  <Package size={24} className="text-blue-600" />
                  <span className="text-lg font-bold text-blue-600">BRMH</span>
                </>
              )}
            </Link>
            
            {/* For mobile: always show */}
            <Link href="/" className="md:hidden flex items-center gap-2">
              <Package size={24} className="text-blue-600" />
              <span className="text-lg font-bold text-blue-600">BRMH</span>
            </Link>
          </div>
        </div>

        {/* Right side - can be used for additional navbar items */}
        <div className="flex items-center gap-4">
          {/* Add any additional navbar items here */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 