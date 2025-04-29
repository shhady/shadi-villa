'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import BookingsList from '../components/BookingsList';
import BookingForm from '../components/BookingForm';
import toast from 'react-hot-toast';

export default function Bookings() {
  const { getToken, hasRole, api } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [showForm, setShowForm] = useState(false);

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
        toast.error('Authentication required. Please login again.');
        setLoading(false);
        return;
      }
      
      // Add status filter if active tab is not empty
      const url = activeTab ? `/api/bookings?status=${activeTab}` : '/api/bookings';
      
      const response = await api.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setBookings(response.data.data);
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

  // Handle booking status change (for admins)
  const handleStatusChange = (bookingId, status) => {
    // Remove the booking from current list if filtering by status
    if (activeTab) {
      setBookings(bookings.filter(booking => booking._id !== bookingId));
    } else {
      // Update the booking status in the list
      setBookings(bookings.map(booking => 
        booking._id === bookingId ? { ...booking, status } : booking
      ));
    }
  };

  // Handle booking deletion (for admins)
  const handleDelete = (bookingId) => {
    // Remove the booking from the list
    setBookings(bookings.filter(booking => booking._id !== bookingId));
  };

  // Handle new booking created
  const handleBookingCreated = (newBooking) => {
    // Refresh the bookings list
    fetchBookings();
    // Hide the form after successful creation
    setShowForm(false);
    toast.success('Booking created successfully');
  };

  return (
    <ProtectedRoute>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-2 lg:px-8">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage all bookings
              </p>
            </div>
            {/* Only admins and agents can create bookings */}
            {(hasRole('admin') || hasRole('agent')) && (
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {showForm ? 'Hide Booking Form' : 'Create New Booking'}
                </button>
              </div>
            )}
          </div>

          {/* Booking Form (conditionally rendered) */}
          {showForm && (hasRole('admin') || hasRole('agent')) && (
            <div className="mt-6">
              <BookingForm onBookingCreated={handleBookingCreated} />
            </div>
          )}

          {/* Tabs for filtering bookings */}
          <div className="mt-6">
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
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('')}
                    className={`${
                      activeTab === ''
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    All
                  </button>
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
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <BookingsList
                bookings={bookings}
                onStatusChange={hasRole('admin') ? handleStatusChange : undefined}
                onDelete={hasRole('admin') ? handleDelete : undefined}
                onRefresh={fetchBookings}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 