'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import ShareButton from './ShareButton';

const BookingsList = ({ bookings, onStatusChange, onDelete, onRefresh }) => {
  const { hasRole, getToken, api } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [agentNames, setAgentNames] = useState({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsBooking, setDetailsBooking] = useState(null);
  const [lastStatusChange, setLastStatusChange] = useState(null);

  // Add a utility function to safely access booking properties with improved type handling
  const safe = (booking, property, defaultValue = '') => {
    if (!booking) return defaultValue;
    
    const value = booking[property];
    if (value === undefined || value === null) return defaultValue;
    
    // If we're expecting a number (for calculations) and defaultValue is a number
    if (typeof defaultValue === 'number' && !isNaN(Number(value))) {
      return Number(value);
    }
    
    return value;
  };

  // Add an effect to trigger refresh when status changes
  useEffect(() => {
    if (lastStatusChange && onRefresh) {
      // Reset last status change
      setLastStatusChange(null);
      // Call refresh from parent component
      onRefresh();
    }
  }, [lastStatusChange, onRefresh]);

  // Add effect to close details modal if bookings change
  useEffect(() => {
    // If details modal is open and bookings list refreshes, close the modal to prevent stale data errors
    if (showDetailsModal && detailsBooking) {
      const bookingStillExists = bookings.some(booking => booking._id === detailsBooking._id);
      if (!bookingStillExists) {
        setShowDetailsModal(false);
        setDetailsBooking(null);
      } else {
        // Update details booking with the latest data
        const updatedBooking = bookings.find(booking => booking._id === detailsBooking._id);
        if (updatedBooking && updatedBooking.status !== detailsBooking.status) {
          setDetailsBooking(updatedBooking);
        }
      }
    }
  }, [bookings, showDetailsModal, detailsBooking]);

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
              console.log('agent was removed')
              // console.error(`Error fetching agent data for ID ${agentId}:`, error);
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
    const date = new Date(dateString);
    // Create a normalized date that removes time component influence on display
    const normalizedDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return normalizedDate.toLocaleDateString(undefined, options);
  };

  // Helper function to get date and duration display based on rental type
  function getBookingDisplay(booking) {
    if (booking.rentalType === 'pool') {
      // For pool bookings, display start date with end date one day later
      return {
        dateDisplay: `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`,
        durationDisplay: '1 day'
      };
    } else {
      // For villa bookings, show date range and nights
      return {
        dateDisplay: `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`,
        durationDisplay: `${booking.duration} ${booking.duration === 1 ? 'night' : 'nights'}`
      };
    }
  }

  // Handle status change (approve/reject)
  const handleStatusChange = async (bookingId, newStatus) => {
    // For rejection, show modal to get rejection reason
    if (newStatus === 'rejected') {
      setSelectedBooking(bookingId);
      setShowModal(true);
      return;
    }
    
    // For approval or setting to pending, proceed directly
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
        
        // If the details modal is open and showing this booking, update its status
        if (detailsBooking && detailsBooking._id === bookingId) {
          setDetailsBooking({
            ...detailsBooking, 
            status: newStatus,
            ...(newStatus === 'rejected' && { rejectionReason }),
            ...(newStatus !== 'rejected' && { rejectionReason: '' })
          });
        }
        
        // Set the last status change to trigger refresh
        setLastStatusChange({ bookingId, newStatus, timestamp: Date.now() });
        
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
        
        // Close details modal if it's showing the deleted booking
        if (detailsBooking && detailsBooking._id === bookingId) {
          setShowDetailsModal(false);
          setDetailsBooking(null);
        }
        
        // Set the last status change to trigger refresh
        setLastStatusChange({ bookingId, action: 'delete', timestamp: Date.now() });
        
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

  // Handle view booking details
  const handleViewDetails = (booking) => {
    setDetailsBooking(booking);
    setShowDetailsModal(true);
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
          <li key={booking._id} className="relative">
            {/* Share button as icon in top right */}
            <div className="absolute top-4 right-4">
              <ShareButton 
                title={`Booking for ${booking.guestName}`} 
                description={`${getRentalTypeDisplay(booking.rentalType)} booking from ${getBookingDisplay(booking).dateDisplay}`}
                iconOnly={true}
              />
            </div>
            
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
                    <span>
                      {safe(booking, 'adults') || safe(booking, 'children') ? 
                        `${(safe(booking, 'adults', 0) + safe(booking, 'children', 0))} guests (${safe(booking, 'adults', 0)} adults${safe(booking, 'children', 0) > 0 ? `, ${safe(booking, 'children', 0)} children` : ''})` 
                        : 
                        `${safe(booking, 'guestCount', 0)} guests`
                      }
                    </span>
                    <span className="mx-1">•</span>
                    <span>₪ {booking.amount}</span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span className="text-sm font-bold">
                      {getBookingDisplay(booking).dateDisplay}
                    </span>
                    <span className="text-sm ml-1 text-gray-500">
                      ({getBookingDisplay(booking).durationDisplay})
                    </span>
                  </div>
                  {/* Display agent name (admin can see this or on their own bookings) */}
                  {hasRole('admin') && booking.agentId && (
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Created by: <span className="font-medium">{agentNames[booking.agentId] || "Unknown Agent"}</span></p>
                    </div>
                  )}
                  {booking.status === 'rejected' && booking.rejectionReason && (
                    <div className="mt-2 text-sm text-red-500">
                      <p>Reason: {booking.rejectionReason}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-3">
                  {/* View Details Button */}
                  
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
                  <button
                    onClick={() => handleViewDetails(booking)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Details
                  </button>

                  {/* Allow admin to change approved bookings to rejected */}
                  {hasRole('admin') && booking.status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(booking._id, 'rejected')}
                      disabled={actionLoading[booking._id]}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  
                  {/* Allow admin to approve rejected bookings */}
                  {hasRole('admin') && booking.status === 'rejected' && (
                    <button
                      onClick={() => handleStatusChange(booking._id, 'approved')}
                      disabled={actionLoading[booking._id]}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      Approve
                    </button>
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
              
              {/* Add context for admin changing an approved booking to rejected */}
              <p className="mb-4 text-gray-600">
                {bookings.find(b => b._id === selectedBooking)?.status === 'approved' 
                  ? 'You are changing an approved booking to rejected status. Please provide a reason for this change.' 
                  : 'Please provide a reason for rejecting this booking.'}
              </p>
              
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

      {/* Booking Details Modal */}
      {showDetailsModal && detailsBooking && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4 grid grid-cols-1  gap-4">
              
                
                
              <div className='flex justify-start items-center gap-4'>
                  <h4 className=" font-medium text-gray-500">Status</h4>
                  <p className={` inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${getStatusColor(detailsBooking.status)}`}>
                    {detailsBooking.status.charAt(0).toUpperCase() + detailsBooking.status.slice(1)}
                  </p>
                </div>
                <div className='flex justify-start items-center gap-2'>
                  <h4 className=" font-medium text-gray-500">Rental Type:</h4>
                  <p className="font-bold">{getRentalTypeDisplay(detailsBooking.rentalType)}</p>
                </div>
            
               
                <div className='flex justify-start items-center gap-2'>
                  <h4 className=" font-medium text-gray-500">Check-in: </h4>
                  <p className="font-bold">{formatDate(detailsBooking.startDate)}</p>
                </div>
                
                <div className='flex justify-start items-center gap-2'>
                  <h4 className=" font-medium text-gray-500">Check-out:</h4>
                  <p className="font-bold">{formatDate(detailsBooking.endDate)}</p>
                </div>
                     
                <div className='flex justify-start items-center gap-2'>
                  <h4 className="text-sm font-medium text-gray-500">Duration:</h4>
                  <p className="font-bold">{detailsBooking.rentalType === 'pool' ? '1 day' : `${detailsBooking.duration} ${detailsBooking.duration === 1 ? 'night' : 'nights'}`}</p>
                </div>
                

                <div className='flex justify-start items-center gap-2 border-t-1 border-gray-200 pt-4'>
                  <h4 className="text-sm font-medium text-gray-500">Guest Name:</h4>
                  <p className="font-bold">{detailsBooking.guestName}</p>
                </div>
                
                <div className='flex justify-start items-center gap-2'>
                  <h4 className="text-sm font-medium text-gray-500">Phone:</h4>
                  <p className="font-bold">{detailsBooking.phoneNumber || "Not provided"}</p>
                </div>
                
               
                
                <div className='flex justify-start items-center gap-2'>
                  <h4 className="text-sm font-medium text-gray-500">Guests:</h4>
                  <p className="font-bold"> {detailsBooking.adults || 0} adults, {detailsBooking.children || 0} children</p>
                </div>
                
                <div className='flex justify-start items-center gap-2'>
                  <h4 className="text-sm font-medium text-gray-500">Amount:</h4>
                  <p className="font-bold">₪ {detailsBooking.amount}</p>
                </div>
                
                {hasRole('admin') && detailsBooking.agentId && (
                  <div className='flex justify-start items-center gap-2 border-t-1 border-gray-200 pt-6'>
                    <h4 className="text-sm font-medium text-gray-500">Created By:</h4>
                    <p className="">{agentNames[detailsBooking.agentId] || "Unknown Agent"}</p>
                  </div>
                )}
                
                <div className='flex justify-start items-center gap-2'>
                  <h4 className="text-sm font-medium text-gray-500">Created At:</h4>
                  <p className="">{new Date(detailsBooking.createdAt).toLocaleString()}</p>
                </div>
                
                {detailsBooking.status === 'rejected' && detailsBooking.rejectionReason && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Rejection Reason</h4>
                    <p className="mt-1 text-red-600">{detailsBooking.rejectionReason}</p>
                  </div>
                )}
                
                {detailsBooking.details && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Additional Details</h4>
                    <p className="mt-1">{detailsBooking.details}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                {/* Admin action buttons in details modal */}
                {hasRole('admin') && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mr-auto">
                    {detailsBooking.status !== 'approved' && (
                      <button
                        onClick={() => {
                          updateBookingStatus(detailsBooking._id, 'approved');
                        }}
                        disabled={actionLoading[detailsBooking._id]}
                        className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    
                    {detailsBooking.status !== 'rejected' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(detailsBooking._id);
                          setShowModal(true);
                          setShowDetailsModal(false);
                        }}
                        disabled={actionLoading[detailsBooking._id]}
                        className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                    
                    {detailsBooking.status !== 'pending' && (
                      <button
                        onClick={() => {
                          updateBookingStatus(detailsBooking._id, 'pending');
                        }}
                        disabled={actionLoading[detailsBooking._id]}
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Set Pending
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(detailsBooking._id)}
                      disabled={actionLoading[detailsBooking._id]}
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
                  </div>
                )}
                
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList; 