'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BookingsList = ({ bookings, onStatusChange, onDelete, onRefresh }) => {
  const { hasRole, getToken, api } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [agentNames, setAgentNames] = useState({});

  // Fetch agent names when component mounts
  useEffect(() => {
    const fetchAgentNames = async () => {
      if (!bookings || bookings.length === 0 || !hasRole('admin')) return;
      
      try {
        const token = getToken();
        if (!token) return;
        
        // Create a Set of unique agent IDs
        const agentIds = [...new Set(bookings.map(booking => booking.agentId))];
        
        // For each agent ID, fetch the agent's information
        const agentData = {};
        for (const agentId of agentIds) {
          if (agentId) {
            try {
              const response = await api.get(`/api/users/${agentId}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              
              if (response.data.success) {
                agentData[agentId] = response.data.data.name;
              }
            } catch (error) {
              console.error(`Error fetching agent data for ID ${agentId}:`, error);
            }
          }
        }
        
        setAgentNames(agentData);
      } catch (error) {
        console.error('Error fetching agent names:', error);
      }
    };
    
    fetchAgentNames();
  }, [bookings, hasRole, getToken, api]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle status change (approve/reject)
  const handleStatusChange = async (bookingId, newStatus) => {
    // For rejection, show modal to get rejection reason
    if (newStatus === 'rejected') {
      setSelectedBooking(bookingId);
      setShowModal(true);
      return;
    }
    
    // For approval, proceed directly
    updateBookingStatus(bookingId, newStatus);
  };

  // Update booking status (admin only)
  const updateBookingStatus = async (bookingId, newStatus, rejectionReason = '') => {
    try {
      setActionLoading(prevState => ({ ...prevState, [bookingId]: true }));
      
      const token = getToken();
      if (!token) {
        toast.error('You must be logged in to perform this action');
        setActionLoading(prevState => ({ ...prevState, [bookingId]: false }));
        return;
      }
      
      // Set rejection reason if status is 'rejected'
      const body = {
        status: newStatus,
        ...(newStatus === 'rejected' && { rejectionReason })
      };
      
      // Call API to update status
      const response = await api.patch(`/api/bookings/${bookingId}/status`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        // Clear modal state if it was open
        if (showModal) {
          setShowModal(false);
          setRejectionReason('');
          setSelectedBooking(null);
        }
        
        // Show appropriate success message based on the action
        if (newStatus === 'approved') {
          toast.success('Booking approved successfully');
        } else if (newStatus === 'rejected') {
          toast.success('Booking rejected successfully. These dates are now available for new bookings.');
        } else {
          toast.success(`Booking status updated to ${newStatus}`);
        }
        
        // Update the booking in the local state
        if (onStatusChange) {
          onStatusChange(bookingId, newStatus);
        }
        
        // Refresh the list if needed
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to update booking status');
      } else {
        toast.error('Failed to update booking status. Please try again.');
      }
    } finally {
      setActionLoading(prevState => ({ ...prevState, [bookingId]: false }));
    }
  };

  // Delete a booking (admin can delete any booking, agents can only delete their own)
  const handleDelete = async (bookingId) => {
    // Ask for confirmation
    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(prevState => ({ ...prevState, [bookingId]: true }));
      
      const token = getToken();
      if (!token) {
        toast.error('You must be logged in to perform this action');
        setActionLoading(prevState => ({ ...prevState, [bookingId]: false }));
        return;
      }
      
      // Call API to delete booking
      const response = await api.delete(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Booking deleted successfully. These dates are now available for new bookings.');
        
        // Update the parent component
        if (onDelete) {
          onDelete(bookingId);
        }
        
        // Refresh the list if needed
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to delete booking');
      } else {
        toast.error('Failed to delete booking. Please try again.');
      }
    } finally {
      setActionLoading(prevState => ({ ...prevState, [bookingId]: false }));
    }
  };

  // Submit rejection reason
  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    updateBookingStatus(selectedBooking, 'rejected', rejectionReason);
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

  // Get rental type display
  const getRentalTypeDisplay = (type) => {
    return type === 'pool' ? 'Pool Only' : 'Villa + Pool';
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-500">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {bookings.map((booking) => (
          <li key={booking._id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {booking.guestName}
                    </p>
                    <div className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>{getRentalTypeDisplay(booking.rentalType)}</span>
                    <span className="mx-1">•</span>
                    <span>{booking.guestCount} guests</span>
                    <span className="mx-1">•</span>
                    <span>${booking.amount}</span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <p>
                      {formatDate(booking.startDate)} — {formatDate(booking.endDate)} ({booking.duration} days)
                    </p>
                  </div>
                  {/* Display agent name (admin can see this or on their own bookings) */}
                  {hasRole('admin') && agentNames[booking.agentId] && (
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Created by: <span className="font-medium">{agentNames[booking.agentId]}</span></p>
                    </div>
                  )}
                  {booking.status === 'rejected' && booking.rejectionReason && (
                    <div className="mt-2 text-sm text-red-500">
                      <p>Reason: {booking.rejectionReason}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                  {/* Admin actions */}
                  {hasRole('admin') && booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(booking._id, 'approved')}
                        disabled={actionLoading[booking._id]}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(booking._id, 'rejected')}
                        disabled={actionLoading[booking._id]}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {/* Admin delete button */}
                  {hasRole('admin') && (
                    <button
                      onClick={() => handleDelete(booking._id)}
                      disabled={actionLoading[booking._id]}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Rejection reason modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reason for Rejection</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Please provide a reason for rejecting this booking..."
              />
              <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setRejectionReason('');
                    setSelectedBooking(null);
                  }}
                  className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={actionLoading[selectedBooking]}
                  className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {actionLoading[selectedBooking] ? 'Submitting...' : 'Reject Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList; 