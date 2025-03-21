'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { usePathname } from 'next/navigation';

const NavBar = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Set mounted after component loads (to prevent hydration issues)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!isMounted) {
    return null; // Wait for client-side hydration to complete
  }

  return (
    <nav className="bg-blue-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-white text-xl font-bold">
              Villa C21
              </Link>
            </div>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center">
            {isAuthenticated() ? (
              <>
                {/* Show dashboard link based on role */}
                <Link 
                  href={hasRole('admin') ? "/dashboard/admin" : "/dashboard/agent"} 
                  className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium mr-2"
                >
                  Dashboard
                </Link>
                
                {/* Show bookings link */}
                <Link 
                  href="/bookings" 
                  className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium mr-2"
                >
                  Bookings
                </Link>
                
                {/* Profile link for all authenticated users */}
                <Link 
                  href="/profile" 
                  className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium mr-2"
                >
                  My Profile
                </Link>
                
                {/* Admin-only link */}
                {hasRole('admin') && (
                  <Link 
                    href="/dashboard/admin/users" 
                    className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium mr-2"
                  >
                    Manage Users
                  </Link>
                )}
                
                {/* User info and logout */}
                <div className="relative ml-3">
                  <div className="flex items-center">
                    <span className="text-white mr-2">{user?.name}</span>
                    <span className="bg-blue-800 text-xs px-2 py-1 rounded-full text-white">
                      {user?.role}
                    </span>
                    <button
                      onClick={logout}
                      className="ml-3 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium mr-2"
                >
                  Login
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-white text-blue-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={toggleMenu}
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated() ? (
              <>
                {/* User info for mobile */}
                <div className="px-3 py-2 rounded-md text-white font-medium border-b border-blue-500 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">{user?.name}</div>
                      <div className="text-xs">{user?.role}</div>
                    </div>
                    <Link 
                      href="/profile" 
                      className="text-white hover:text-blue-200 text-sm"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
                
                {/* Dashboard link */}
                <Link
                  href={hasRole('admin') ? "/dashboard/admin" : "/dashboard/agent"}
                  className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  Dashboard
                </Link>
                
                {/* Bookings link */}
                <Link
                  href="/bookings"
                  className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  Bookings
                </Link>
                
                {/* Admin-only link */}
                {hasRole('admin') && (
                  <Link
                    href="/dashboard/admin/users"
                    className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
                  >
                    Manage Users
                  </Link>
                )}
                
                {/* Logout button */}
                <button
                  onClick={logout}
                  className="text-white hover:bg-blue-700 w-full text-left px-3 py-2 rounded-md text-base font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar; 