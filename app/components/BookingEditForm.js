'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BookingEditForm = ({ booking, onClose, onSuccess }) => {
  const { getToken, api } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Initialize form data with booking data
  const [formData, setFormData] = useState({
    guestName: booking.guestName || '',
    phoneNumber: booking.phoneNumber || '',
    adults: booking.adults || '',
    children: booking.children || 0,
    startDate: booking.startDate ? new Date(booking.startDate) : new Date(),
    endDate: booking.endDate ? new Date(booking.endDate) : new Date(new Date().setDate(new Date().getDate() + 1)),
    duration: booking.duration || 1,
    amount: booking.amount || '',
    details: booking.details || ''
  });

  // Helper function to format date for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle date input changes
  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    const date = new Date(value);
    
    if (name === 'startDate') {
      let newEndDate = formData.endDate;
      
      // For pool rentals or if the end date is before the new start date
      if (booking.rentalType === 'pool' || date >= formData.endDate) {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        newEndDate = nextDay;
      }
      
      // Calculate new duration
      const timeDiff = newEndDate.getTime() - date.getTime();
      const newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      setFormData({
        ...formData,
        startDate: date,
        endDate: newEndDate,
        duration: newDuration
      });
    } else if (name === 'endDate') {
      // Calculate new duration
      const timeDiff = date.getTime() - formData.startDate.getTime();
      const newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      setFormData({
        ...formData,
        endDate: date,
        duration: newDuration
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = getToken();
      if (!token) {
        toast.error('Authentication required. Please login again.');
        setLoading(false);
        return;
      }
      
      // Prepare data for API
      const bookingData = {
        guestName: formData.guestName,
        phoneNumber: formData.phoneNumber,
        adults: parseInt(formData.adults, 10),
        children: parseInt(formData.children, 10) || 0,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        duration: parseInt(formData.duration, 10),
        amount: parseFloat(formData.amount),
        details: formData.details
      };
      
      // Update booking via API
      const response = await api.patch(`/api/bookings/${booking._id}/update`, bookingData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Booking updated successfully');
        
        // Notify parent component
        if (onSuccess) {
          onSuccess(response.data.data);
        }
        
        // Close the modal
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Failed to update booking');
      } else {
        toast.error('Failed to update booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Edit Booking</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Guest Name</label>
          <input
            type="text"
            name="guestName"
            value={formData.guestName}
            onChange={handleChange}
            required
            className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Check-in Date</label>
            <input
              type="date"
              name="startDate"
              value={formatDateForInput(formData.startDate)}
              onChange={handleDateInputChange}
              required
              min={formatDateForInput(new Date())}
              className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
            <input
              type="date"
              name="endDate"
              value={formatDateForInput(formData.endDate)}
              onChange={handleDateInputChange}
              required
              min={formatDateForInput(new Date(new Date(formData.startDate).setDate(new Date(formData.startDate).getDate() + 1)))}
              disabled={booking.rentalType === 'pool'}
              className={`px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${booking.rentalType === 'pool' ? 'bg-gray-100' : ''}`}
            />
            {booking.rentalType === 'pool' && (
              <p className="text-sm text-gray-500 mt-1">Pool bookings are for a single day only.</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Adults</label>
            <input
              type="number"
              name="adults"
              min="1"
              value={formData.adults}
              onChange={handleChange}
              required
              className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Children</label>
            <input
              type="number"
              name="children"
              min="0"
              value={formData.children}
              onChange={handleChange}
              className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (nights)</label>
            <input
              type="number"
              name="duration"
              min="1"
              value={formData.duration}
              onChange={handleChange}
              disabled={true}
              required
              className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Duration is automatically calculated from the selected dates.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (₪)</label>
            <input
              type="number"
              name="amount"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              required
              className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Additional Details/Notes</label>
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            className="px-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows="3"
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingEditForm; 