'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BookingForm = ({ onBookingCreated }) => {
  const { getToken, api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState({
    pool: [],
    villa: [],
    villaStartDates: [], // Store start dates of villa bookings separately
    villaEndDates: [] // Added villaEndDates to the unavailableDates object
  });

  const [formData, setFormData] = useState({
    guestName: '',
    guestCount: 1,
    rentalType: 'pool', // 'pool' or 'villa_pool'
    startDate: new Date(),
    endDate: new Date(),
    duration: 1,
    amount: 100
  });

  // Fetch unavailable dates when component mounts
  useEffect(() => {
    const fetchUnavailableDates = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          console.log('No token available for fetching unavailable dates');
          return;
        }

        const response = await api.get('/api/bookings/available', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          // Convert date strings to Date objects
          setUnavailableDates({
            pool: response.data.data.poolUnavailableDates.map(date => new Date(date)),
            villa: response.data.data.villaUnavailableDates.map(date => new Date(date)),
            villaStartDates: response.data.data.villaStartDates.map(date => new Date(date)),
            villaEndDates: response.data.data.villaEndDates.map(date => new Date(date))
          });
          
          console.log(`Loaded unavailable dates - Pool: ${response.data.data.poolUnavailableDates.length}, Villa: ${response.data.data.villaUnavailableDates.length}, Villa start dates: ${response.data.data.villaStartDates.length}, Villa end dates: ${response.data.data.villaEndDates.length}`);
        }
      } catch (error) {
        console.error('Error fetching unavailable dates:', error);
        toast.error('Failed to load availability data');
      } finally {
        setLoading(false);
      }
    };

    fetchUnavailableDates();
  }, [getToken, api]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for rental type change
    if (name === 'rentalType') {
      // If changing to pool, set end date same as start date
      if (value === 'pool') {
        const startDate = formData.startDate;
        
        // Check if selected date is a villa start date
        if (isVillaStartDate(startDate)) {
          toast.error('Pool bookings are not allowed on start dates of villa bookings');
          return;
        }
        
        setFormData({
          ...formData,
          rentalType: value,
          endDate: new Date(startDate),
          duration: 1
        });
        
        // Update amount based on type and duration
        calculateAmount(value, 1);
        return;
      }
      // If changing to villa_pool, set end date to next day if currently same as start date
      else if (value === 'villa_pool') {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        
        if (startDate.toDateString() === endDate.toDateString()) {
          const nextDay = new Date(startDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          setFormData({
            ...formData,
            rentalType: value,
            endDate: nextDay,
            duration: 2
          });
          
          // Update amount based on type and duration
          calculateAmount(value, 2);
          return;
        }
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });

    // If rental type changes, recalculate amount
    if (name === 'rentalType' || name === 'duration') {
      calculateAmount(name === 'rentalType' ? value : formData.rentalType, name === 'duration' ? parseInt(value) : formData.duration);
    }
  };

  // Check if a date is a villa start date
  const isVillaStartDate = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return unavailableDates.villaStartDates.some(villaStartDate => 
      villaStartDate.getTime() === dateToCheck.getTime()
    );
  };

  // Check if a date is unavailable for the selected rental type
  const isDateUnavailable = (date, rentalType) => {
    // Normalize the date to start of day for comparison
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    // For villa_pool bookings, special handling for end dates
    if (rentalType === 'villa_pool') {
      // Check if this date is actually an end date of any villa booking
      // End dates of villa bookings should be available for new bookings to start
      const isEndDateOfExistingVillaBooking = villaBookings => {
        return villaBookings.some(booking => {
          const endDate = new Date(booking.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate.getTime() === dateToCheck.getTime();
        });
      };
      
      // If the date is an end date of a villa booking, it's not unavailable
      if (isEndDateOfExistingVillaBooking(unavailableDates.villaEndDates || [])) {
        return false;
      }
    }
    
    if (rentalType === 'pool') {
      return unavailableDates.pool.some(unavailableDate => {
        // Normalize the unavailable date
        const unavailableDateNormalized = new Date(unavailableDate);
        unavailableDateNormalized.setHours(0, 0, 0, 0);
        return unavailableDateNormalized.getTime() === dateToCheck.getTime();
      });
    } else { // villa_pool
      return unavailableDates.villa.some(unavailableDate => {
        // Normalize the unavailable date
        const unavailableDateNormalized = new Date(unavailableDate);
        unavailableDateNormalized.setHours(0, 0, 0, 0);
        return unavailableDateNormalized.getTime() === dateToCheck.getTime();
      });
    }
  };

  // Handle date selection
  const handleDateChange = (date, type) => {
    let newStartDate = formData.startDate;
    let newEndDate = formData.endDate;
    let newDuration = formData.duration;
    
    if (type === 'start') {
      // First check if date is unavailable for the selected rental type
      if (isDateUnavailable(date, formData.rentalType)) {
        toast.error(`This date is not available for ${formData.rentalType === 'pool' ? 'pool' : 'villa'} booking`);
        return;
      }
      
      // For pool bookings, check if this is a villa start date
      if (formData.rentalType === 'pool' && isVillaStartDate(date)) {
        toast.error('Pool bookings are not allowed on start dates of villa bookings');
        return;
      }
      
      newStartDate = date;
      
      // If pool rental, set end date same as start date
      if (formData.rentalType === 'pool') {
        newEndDate = new Date(date);
        newDuration = 1;
      } 
      // For villa_pool rental
      else {
        // If start date is after end date, adjust end date to next day
        if (date >= formData.endDate) {
          newEndDate = new Date(date);
          newEndDate.setDate(date.getDate() + 1);
          
          // Calculate new duration
          const timeDiff = newEndDate.getTime() - newStartDate.getTime();
          newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
        } else {
          // Calculate duration in days
          const timeDiff = formData.endDate.getTime() - date.getTime();
          newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }
      }
    } else { // type === 'end'
      // For pool rental, cannot change end date (it must be same as start date)
      if (formData.rentalType === 'pool') {
        toast.error('Pool bookings must be for a single day. You cannot change the end date.');
        return;
      }
      
      newEndDate = date;
      
      // If end date is before start date, show error
      if (date < formData.startDate) {
        toast.error('End date cannot be earlier than start date');
        return;
      }
      
      // If end date is the same as start date, show error for villa_pool
      if (date.toDateString() === formData.startDate.toDateString() && formData.rentalType === 'villa_pool') {
        toast.error('Villa bookings must be for at least one night');
        return;
      }
      
      // Calculate duration in days
      const timeDiff = date.getTime() - formData.startDate.getTime();
      newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    // For villa bookings, check if any of the days in between are unavailable
    if (formData.rentalType === 'villa_pool') {
      const daysToCheck = [];
      const tempDate = new Date(newStartDate);
      // Only check up to but not including the end date since bookings can start on the same day as another booking ends
      while (tempDate < newEndDate) {
        daysToCheck.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      // Check if any day in the range is unavailable
      const unavailableDay = daysToCheck.find(day => isDateUnavailable(day, 'villa_pool'));
      if (unavailableDay) {
        toast.error(`The date range includes unavailable dates. ${unavailableDay.toLocaleDateString()} is already booked.`);
        return;
      }
    }
    
    setFormData({
      ...formData,
      startDate: newStartDate,
      endDate: newEndDate,
      duration: newDuration
    });
    
    // Update amount based on duration and rental type
    calculateAmount(formData.rentalType, newDuration);
  };

  // Calculate rental amount based on type and duration
  const calculateAmount = (type, days) => {
    // Example pricing:
    // Pool: $100 per day
    // Villa + Pool: $250 per day
    const baseRate = type === 'pool' ? 100 : 250;
    const amount = baseRate * days;
    
    setFormData(prev => ({
      ...prev,
      amount
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate rental type specific rules
      if (formData.rentalType === 'pool') {
        // Pool bookings must be for a single day
        const startDay = new Date(formData.startDate).setHours(0, 0, 0, 0);
        const endDay = new Date(formData.endDate).setHours(0, 0, 0, 0);
        
        if (startDay !== endDay) {
          toast.error('Pool bookings must be for a single day only');
          setLoading(false);
          return;
        }
        
        // Check if this is a villa start date
        if (isVillaStartDate(formData.startDate)) {
          toast.error('Pool bookings are not allowed on start dates of villa bookings');
          setLoading(false);
          return;
        }
      }
      
      const token = getToken();
      
      if (!token) {
        toast.error('You need to be logged in to create a booking');
        console.error('No authentication token available');
        setLoading(false);
        return;
      }
      
      // Create a copy of the form data with normalized dates to prevent time-related issues
      const normalizedFormData = {
        ...formData,
        startDate: new Date(new Date(formData.startDate).setHours(0, 0, 0, 0)),
        endDate: new Date(new Date(formData.endDate).setHours(0, 0, 0, 0))
      };
      
      console.log('Submitting booking with token:', token.substring(0, 10) + '...');
      console.log('Booking data:', normalizedFormData);
      
      const response = await api.post('/api/bookings', normalizedFormData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('Booking created successfully');
        // Reset form
        setFormData({
          guestName: '',
          guestCount: 1,
          rentalType: 'pool',
          startDate: new Date(),
          endDate: new Date(),
          duration: 1,
          amount: 100
        });
        
        // Notify parent component
        if (onBookingCreated) {
          onBookingCreated(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // Show more detailed error messages if available
        if (error.response.data && error.response.data.details && error.response.data.details.length > 0) {
          error.response.data.details.forEach(detail => toast.error(detail));
        } else {
          toast.error(error.response.data.message || 'Failed to create booking');
        }
      } else {
        toast.error('Failed to create booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if a date is disabled (already booked)
  const isDateDisabled = (date) => {
    // Normalize the date to start of day for comparison
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    // For pool rentals, don't allow booking on villa start dates
    if (formData.rentalType === 'pool' && isVillaStartDate(date)) {
      return true;
    }
    
    // Special handling for villa bookings
    if (formData.rentalType === 'villa_pool') {
      // For villa bookings, check if it's an end date for another booking
      // If it's an end date, we should allow it (for the start date calendar)
      const isVillaEndDate = unavailableDates.villaEndDates && unavailableDates.villaEndDates.some(endDate => {
        const normalizedEndDate = new Date(endDate);
        normalizedEndDate.setHours(0, 0, 0, 0);
        return normalizedEndDate.getTime() === dateToCheck.getTime();
      });
      
      // If it's an end date, don't disable it
      if (isVillaEndDate) {
        return false;
      }
    }
    
    // Check if date is in unavailable dates based on rental type
    return isDateUnavailable(dateToCheck, formData.rentalType);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Create New Booking</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rental Type</label>
          <select
            name="rentalType"
            value={formData.rentalType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="pool">Pool Only</option>
            <option value="villa_pool">Villa + Pool</option>
          </select>
          {formData.rentalType === 'pool' && (
            <p className="text-sm text-gray-500 mt-1">
              Pool bookings are for a single day only. Not allowed on start dates of villa bookings.
            </p>
          )}
          {formData.rentalType === 'villa_pool' && (
            <p className="text-sm text-gray-500 mt-1">
              You can book starting on the same day another booking ends (checkout is at 12 PM).
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Guest Name</label>
            <input
              type="text"
              name="guestName"
              value={formData.guestName}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Guests</label>
            <input
              type="number"
              name="guestCount"
              min="1"
              value={formData.guestCount}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <Calendar
              value={formData.startDate}
              onChange={(date) => handleDateChange(date, 'start')}
              minDate={new Date()}
              tileDisabled={({ date }) => isDateDisabled(date)}
              className="border rounded-md"
            />
            {formData.rentalType === 'pool' && (
              <p className="text-sm text-gray-500 mt-1">
                Pool bookings are not allowed on start dates of villa bookings.
              </p>
            )}
            {formData.rentalType === 'villa_pool' && (
              <p className="text-sm text-gray-500 mt-1">
                You can book starting on the same day another booking ends (checkout is at 12 PM).
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.rentalType === 'pool' ? 'Date (End date same as start date)' : 'End Date'}
            </label>
            <Calendar
              value={formData.endDate}
              onChange={(date) => handleDateChange(date, 'end')}
              minDate={formData.startDate}
              tileDisabled={({ date }) => 
                // For pool bookings, disable end date selection entirely as it must be same as start date
                formData.rentalType === 'pool' 
                  ? date.toDateString() !== formData.startDate.toDateString() 
                  : isDateDisabled(date)
              }
              className={`border rounded-md ${formData.rentalType === 'pool' ? 'opacity-50' : ''}`}
            />
            {formData.rentalType === 'pool' && (
              <p className="text-sm text-red-500 mt-1">
                Pool bookings are for a single day only. End date is locked to start date.
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (days)</label>
            <input
              type="number"
              name="duration"
              min="1"
              value={formData.duration}
              onChange={handleChange}
              disabled={formData.rentalType === 'pool'}
              required
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${formData.rentalType === 'pool' ? 'bg-gray-100' : ''}`}
            />
            {formData.rentalType === 'pool' && (
              <p className="text-sm text-gray-500 mt-1">Duration is fixed at 1 day for pool bookings.</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
            <input
              type="number"
              name="amount"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm; 