'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for authentication to complete
    if (!loading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated()) {
        router.push('/auth/login');
        return;
      }

      // If roles are specified and user doesn't have any of the allowed roles
      if (allowedRoles.length > 0 && !allowedRoles.some(role => hasRole(role))) {
        // Redirect to appropriate dashboard based on role
        if (hasRole('admin')) {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/agent');
        }
      }
    }
  }, [isAuthenticated, hasRole, loading, router, allowedRoles]);

  // Show nothing while loading or if not authenticated
  if (loading || !isAuthenticated()) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If roles are specified and user doesn't have any of the allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.some(role => hasRole(role))) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  // If authenticated and authorized, render children
  return children;
};

export default ProtectedRoute; 