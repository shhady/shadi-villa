'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Profile() {
  const { user, getToken, hasRole, api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  // Check access permissions
  useEffect(() => {
    // If a userId is provided and the current user is not an admin and not the same user
    if (userId && user && !hasRole('admin') && userId !== user._id) {
      setAccessDenied(true);
      toast.error("You don't have permission to view this profile");
    } else {
      setAccessDenied(false);
    }
  }, [userId, user, hasRole]);

  // Fetch user profile and statistics
  useEffect(() => {
    const fetchUserStats = async () => {
      if (accessDenied) return;
      
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          toast.error('You must be logged in to view this page');
          return;
        }

        // Construct the API URL (include userId param if provided and user is admin)
        let url = '/api/users/stats';
        if (hasRole('admin') && userId) {
          url += `?userId=${userId}`;
        }

        const response = await api.get(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setProfileUser(response.data.data.user);
          setStats(response.data.data.stats);
          setRecentBookings(response.data.data.recentBookings);
          setMonthlyData(response.data.data.monthlyData);
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user && !accessDenied) {
      fetchUserStats();
    }
  }, [user, getToken, hasRole, api, userId, accessDenied]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // If access is denied, show access denied message
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view this profile.</p>
          <button
            onClick={() => router.back()}
            className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div>
              {/* Profile Header */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {profileUser?.name}&apos;s Profile
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {profileUser?.email} • {profileUser?.role.charAt(0).toUpperCase() + profileUser?.role.slice(1)}
                      </p>
                    </div>
                    
                    {/* Back button for admins viewing other profiles */}
                    {hasRole('admin') && userId && (
                      <button 
                        onClick={() => router.back()}
                        className="mt-2 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Back to User List
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {/* Total Bookings */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Bookings
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {stats?.totalBookings || 0}
                    </dd>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Amount
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      ${stats?.totalAmount || 0}
                    </dd>
                  </div>
                </div>

                {/* Approved Amount */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Approved Revenue
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-600">
                      ${stats?.approvedAmount || 0}
                    </dd>
                  </div>
                </div>

                {/* Pending Bookings */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Bookings
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-yellow-600">
                      {stats?.pendingBookings || 0}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Booking Status & Type Breakdown */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
                {/* Status Breakdown */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Booking Status
                    </h3>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="h-4 w-4 bg-yellow-400 rounded-full mr-2"></span>
                          <span className="text-sm text-gray-500">Pending</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats?.pendingBookings || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="h-4 w-4 bg-green-400 rounded-full mr-2"></span>
                          <span className="text-sm text-gray-500">Approved</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats?.approvedBookings || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="h-4 w-4 bg-red-400 rounded-full mr-2"></span>
                          <span className="text-sm text-gray-500">Rejected</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats?.rejectedBookings || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rental Type Breakdown */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Booking Types
                    </h3>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="h-4 w-4 bg-blue-400 rounded-full mr-2"></span>
                          <span className="text-sm text-gray-500">Pool Only</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats?.poolBookings || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="h-4 w-4 bg-purple-400 rounded-full mr-2"></span>
                          <span className="text-sm text-gray-500">Villa + Pool</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats?.villaBookings || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Activity */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Monthly Activity
                  </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    {Object.entries(monthlyData).map(([month, data]) => (
                      <div key={month} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900">{month}</h4>
                        <p className="mt-2 text-xs text-gray-500">Bookings: {data.count}</p>
                        <p className="text-xs text-gray-500">Amount: ${data.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Recent Bookings
                  </h3>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {recentBookings.length > 0 ? (
                      recentBookings.map((booking) => (
                        <li key={booking._id} className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-600 truncate">
                                {booking.guestName}
                              </p>
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span>
                                  {booking.rentalType === 'pool' ? 'Pool Only' : 'Villa + Pool'}
                                </span>
                                <span className="mx-1">•</span>
                                <span>
                                  {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
                                </span>
                                <span className="mx-1">•</span>
                                <span>${booking.amount}</span>
                              </div>
                            </div>
                            <div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-5 sm:px-6 text-center text-gray-500">
                        No recent bookings found
                      </li>
                    )}
                  </ul>
                </div>
                <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
                  <Link
                    href="/bookings"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all bookings <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 