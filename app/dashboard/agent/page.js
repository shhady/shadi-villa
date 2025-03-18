'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import BookingForm from '../../components/BookingForm';
import BookingsList from '../../components/BookingsList';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const { getToken, api } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch bookings on component mount and when tab changes
  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  // Fetch bookings from API
  const fetchBookings = async () => {
    setLoading(true);
    
    try {
      const token = getToken();
      if (!token) {
        console.error('No token available for fetching bookings');
        toast.error('Authentication required. Please login again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching bookings with status:', activeTab);
      const response = await api.get(`/api/bookings?status=${activeTab}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setBookings(response.data.data);
        console.log(`Fetched ${response.data.data.length} bookings`);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Handle new booking creation
  const handleBookingCreated = (newBooking) => {
    if (activeTab === 'pending') {
      // If on pending tab, add the new booking to the list
      setBookings(prevBookings => [newBooking, ...prevBookings]);
    } else {
      // If on another tab, show notification to switch tab
      toast('Booking created! View it in the Pending tab', {
        icon: '👋',
      });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['agent']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Agent Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage your villa and pool bookings
          </p>

          <div className="mt-6">
            <BookingForm onBookingCreated={handleBookingCreated} />
          </div>

          <div className="mt-8">
            <div className="sm:hidden">
              <label htmlFor="tabs" className="sr-only">
                Select a tab
              </label>
              <select
                id="tabs"
                name="tabs"
                className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`${
                      activeTab === 'pending'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setActiveTab('approved')}
                    className={`${
                      activeTab === 'approved'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setActiveTab('rejected')}
                    className={`${
                      activeTab === 'rejected'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Rejected
                  </button>
                </nav>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <BookingsList
                bookings={bookings}
                onRefresh={fetchBookings}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 