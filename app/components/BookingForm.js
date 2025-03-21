'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BookingForm = ({ onBookingCreated }) => {
  const { getToken, api, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState({
    pool: [],
    villa: [],
    villaStartDates: [], // Store start dates of villa bookings separately
    villaEndDates: [] // Added villaEndDates to the unavailableDates object
  });
  
  // Add states for different booking statuses
  const [pendingDates, setPendingDates] = useState([]);
  const [approvedDates, setApprovedDates] = useState([]);
  const [rejectedDates, setRejectedDates] = useState([]);

  // Add state for booking details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsBooking, setDetailsBooking] = useState(null);
  const [agentNames, setAgentNames] = useState({});

  const [formData, setFormData] = useState({
    guestName: '',
    phoneNumber: '', // Added phone number field
    adults: 1, // Changed from guestCount to adults
    children: 0, // Added children field
    rentalType: 'villa_pool', // Changed default from 'pool' to 'villa_pool'
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Set end date to next day
    duration: 2, // Changed from 1 to 2 for villa_pool default
    amount: 500, // Changed from 100 to 500 (250 * 2 days for villa_pool)
    details: '' // Added details field for notes
  });

  // Add state to store bookings
  const [bookings, setBookings] = useState([]);

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
          
          // Set dates by status if available in the API response
          if (response.data.data.pendingDates) {
            setPendingDates(response.data.data.pendingDates.map(date => new Date(date)));
          }
          
          if (response.data.data.approvedDates) {
            setApprovedDates(response.data.data.approvedDates.map(date => new Date(date)));
          }
          
          if (response.data.data.rejectedDates) {
            setRejectedDates(response.data.data.rejectedDates.map(date => new Date(date)));
          }
          
          console.log(`Loaded unavailable dates - Pool: ${response.data.data.poolUnavailableDates.length}, Villa: ${response.data.data.villaUnavailableDates.length}, Villa start dates: ${response.data.data.villaStartDates.length}, Villa end dates: ${response.data.data.villaEndDates.length}`);
          
          // Also fetch all bookings to get their status
          fetchAllBookings(token);
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

  console.log(bookings)
  // Fetch all bookings to get their status
  const fetchAllBookings = async (token) => {
    try {
      const response = await api.get('/api/bookings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setBookings(response.data.data);
        console.log(`Loaded ${response.data.data.length} bookings`);
        
        // Now update status-specific date arrays
        const pendingBookingDates = [];
        const approvedBookingDates = [];
        const rejectedBookingDates = []; // We still track these but won't use them for unavailability
        
        response.data.data.forEach(booking => {
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          
          // Create array of dates between start and end
          const dates = [];
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Add dates to appropriate array based on status
          if (booking.status === 'pending') {
            pendingBookingDates.push(...dates);
          } else if (booking.status === 'approved') {
            approvedBookingDates.push(...dates);
          } else if (booking.status === 'rejected') {
            rejectedBookingDates.push(...dates);
          }
        });
        
        // Update state with these dates 
        // We still track rejected dates internally, but they won't affect availability
        setPendingDates(pendingBookingDates);
        setApprovedDates(approvedBookingDates);
        setRejectedDates(rejectedBookingDates);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

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

  // Handle date input changes
  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    const selectedDate = new Date(value);
    
    if (name === 'startDate') {
      // First check if date is unavailable for the selected rental type
      if (isDateUnavailable(selectedDate, formData.rentalType)) {
        toast.error(`This date is not available for ${formData.rentalType === 'pool' ? 'pool' : 'villa'} booking`);
        return;
      }
      
      // For pool bookings, check if this is a villa start date
      if (formData.rentalType === 'pool' && isVillaStartDate(selectedDate)) {
        toast.error('Pool bookings are not allowed on start dates of villa bookings');
        return;
      }
      
      // For pool rentals, set end date same as start date
      if (formData.rentalType === 'pool') {
        setFormData({
          ...formData,
          startDate: selectedDate,
          endDate: selectedDate,
          duration: 1
        });
        
        // Update amount
        calculateAmount('pool', 1);
      } else {
        // For villa rentals
        let newEndDate = formData.endDate;
        
        // If start date is after current end date, adjust end date
        if (selectedDate >= formData.endDate) {
          const nextDay = new Date(selectedDate);
          nextDay.setDate(selectedDate.getDate() + 1);
          newEndDate = nextDay;
        }
        
        // Calculate new duration
        const timeDiff = newEndDate.getTime() - selectedDate.getTime();
        const newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        setFormData({
          ...formData,
          startDate: selectedDate,
          endDate: newEndDate,
          duration: newDuration
        });
        
        // Update amount
        calculateAmount('villa_pool', newDuration);
      }
    } else if (name === 'endDate') {
      // For pool rental, cannot change end date (it must be same as start date)
      if (formData.rentalType === 'pool') {
        toast.error('Pool bookings must be for a single day. You cannot change the end date.');
        return;
      }
      
      // If end date is before start date, show error
      if (selectedDate < formData.startDate) {
        toast.error('End date cannot be earlier than start date');
        return;
      }
      
      // If end date is the same as start date, show error for villa_pool
      if (selectedDate.toDateString() === formData.startDate.toDateString() && formData.rentalType === 'villa_pool') {
        toast.error('Villa bookings must be for at least one night');
        return;
      }
      
      // For villa bookings, check if any of the days in between are unavailable
      const daysToCheck = [];
      const tempDate = new Date(formData.startDate);
      
      while (tempDate < selectedDate) {
        daysToCheck.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      // Check if any day in the range is unavailable
      const unavailableDay = daysToCheck.find(day => isDateUnavailable(day, 'villa_pool'));
      if (unavailableDay) {
        toast.error(`The date range includes unavailable dates. ${unavailableDay.toLocaleDateString()} is already booked.`);
        return;
      }
      
      // Calculate duration in days
      const timeDiff = selectedDate.getTime() - formData.startDate.getTime();
      const newDuration = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      setFormData({
        ...formData,
        endDate: selectedDate,
        duration: newDuration
      });
      
      // Update amount
      calculateAmount('villa_pool', newDuration);
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
    
    // Check if date is rejected - rejected dates are considered available
    if (isDateRejected(date)) {
      return false;
    }
    
    // Check if this date is the end date of a villa+pool booking
    // End dates of villa+pool bookings should be available for new bookings to start
    if (isCheckoutDay(date)) {
      return false; // Always allow booking on checkout days
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

  // Check if a date is a checkout day (any villa+pool booking end date, not pool bookings)
  const isCheckoutDay = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    // First check if there's a pool booking on this date - if so, it's NOT a checkout day
    // regardless of whether it's also a villa_pool end date
    const hasPoolBooking = bookings.some(booking => {
      // If it's a rejected booking, skip it
      if (booking.status === 'rejected') return false;
      
      // Check if it's a pool booking
      if (booking.rentalType === 'pool') {
        const bookingDate = new Date(booking.startDate); // For pool bookings, start = end
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === dateToCheck.getTime();
      }
      
      return false;
    });
    
    // If there's a pool booking on this date, it can't be a checkout day
    if (hasPoolBooking) return false;
    
    // Check if this day is a start date of any non-rejected booking
    // If it's a start date of another booking, it shouldn't be a checkout day
    const isStartDate = bookings.some(booking => {
      // Skip rejected bookings entirely
      if (booking.status === 'rejected') return false;
      
      const startDate = new Date(booking.startDate);
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime() === dateToCheck.getTime();
    });
    
    // If it's a start date of any booking, it can't be a checkout day
    if (isStartDate) return false;
    
    // First check through all bookings - only pending and approved villa+pool bookings should be considered
    const isBookingEndDate = bookings.some(booking => {
      // Skip rejected bookings entirely - their end dates should appear as normal available dates
      if (booking.status === 'rejected') return false;
      
      // Only check villa bookings, not pool bookings
      if (booking.rentalType !== 'villa_pool') return false;
      
      const endDate = new Date(booking.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === dateToCheck.getTime();
    });
    
    if (isBookingEndDate) return true;
    
    // Also check villa end dates from API, but verify they're not from rejected bookings or pool bookings
    if (unavailableDates.villaEndDates && unavailableDates.villaEndDates.length > 0) {
      // We need to cross-reference with the bookings to exclude end dates of rejected bookings and pool bookings
      const isEndDateOfNonRejectedVillaBooking = unavailableDates.villaEndDates.some(endDate => {
        const normalizedEndDate = new Date(endDate);
        normalizedEndDate.setHours(0, 0, 0, 0);
        
        if (normalizedEndDate.getTime() !== dateToCheck.getTime()) return false;
        
        // End date matches, now check if it belongs to a rejected booking
        const isRejectedBookingEndDate = bookings.some(booking => 
          booking.status === 'rejected' && 
          new Date(booking.endDate).setHours(0, 0, 0, 0) === dateToCheck.getTime()
        );
        
        // Also check if it belongs to a pool booking (which occupy the full day)
        const isPoolBookingEndDate = bookings.some(booking => 
          booking.rentalType === 'pool' && 
          new Date(booking.endDate).setHours(0, 0, 0, 0) === dateToCheck.getTime()
        );
        
        // Return true only for non-rejected, non-pool booking end dates
        return !isRejectedBookingEndDate && !isPoolBookingEndDate;
      });
      
      return isEndDateOfNonRejectedVillaBooking;
    }
    
    return false;
  };

  // Check if a date has a pool booking
  const hasPoolBooking = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return bookings.some(booking => {
      // Skip rejected bookings
      if (booking.status === 'rejected') return false;
      
      // Check if it's a pool booking
      if (booking.rentalType === 'pool') {
        const bookingDate = new Date(booking.startDate); // For pool bookings, start = end
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === dateToCheck.getTime();
      }
      
      return false;
    });
  };

  // Check if a date is a villa end date (checkout day)
  const isVillaEndDate = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return unavailableDates.villaEndDates.some(villaEndDate => {
      const normalizedEndDate = new Date(villaEndDate);
      normalizedEndDate.setHours(0, 0, 0, 0);
      return normalizedEndDate.getTime() === dateToCheck.getTime();
    });
  };

  // Check if a date is pending
  const isDatePending = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return pendingDates.some(pendingDate => {
      const normalizedPendingDate = new Date(pendingDate);
      normalizedPendingDate.setHours(0, 0, 0, 0);
      return normalizedPendingDate.getTime() === dateToCheck.getTime();
    });
  };

  // Check if a date is approved
  const isDateApproved = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return approvedDates.some(approvedDate => {
      const normalizedApprovedDate = new Date(approvedDate);
      normalizedApprovedDate.setHours(0, 0, 0, 0);
      return normalizedApprovedDate.getTime() === dateToCheck.getTime();
    });
  };

  // Check if a date is rejected
  const isDateRejected = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return rejectedDates.some(rejectedDate => {
      const normalizedRejectedDate = new Date(rejectedDate);
      normalizedRejectedDate.setHours(0, 0, 0, 0);
      return normalizedRejectedDate.getTime() === dateToCheck.getTime();
    });
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
      // Calculate total guest count from adults + children
      const normalizedFormData = {
        ...formData,
        guestCount: formData.adults + formData.children, // Calculate total guest count
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
          phoneNumber: '',
          adults: 1,
          children: 0,
          rentalType: 'villa_pool', // Changed from 'pool' to 'villa_pool'
          startDate: new Date(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Set end date to next day
          duration: 2, // Changed from 1 to 2 for villa_pool default
          amount: 500, // Changed from 100 to 500 (250 * 2 days for villa_pool)
          details: '' // Added details field for notes
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

  // Format date as yyyy-MM-dd for date inputs
  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
  };

  // Add custom formatting for the calendar
  const formatShortWeekday = (locale, date) => {
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
  };

  // Function to generate calendar data for a specific month and year
  const generateCalendarDays = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push(date);
    }
    
    return days;
  };
  
  // State for current month and year view
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Go to previous month
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  // Go to next month
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Get status class for a day
  const getDayStatusClass = (date) => {
    if (!date) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If date is before today, return gray
    if (date < today) {
      return 'bg-gray-200';
    }
    
    // Check if there's an existing booking for this date (for admin view)
    const bookingExists = hasRole('admin') && findBookingForDate(date);
    let adminClickableClass = '';
    
    // If admin and there's a booking, add a subtle border to indicate it's clickable
    if (bookingExists) {
      adminClickableClass = 'border border-gray-500 cursor-pointer';
    }
    
    // First check for pool bookings - they take priority over checkout day status
    const poolBooking = bookings.find(booking => {
      if (booking.status !== 'rejected' && booking.rentalType === 'pool') {
        const bookingDate = new Date(booking.startDate);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === date.getTime();
      }
      return false;
    });
    
    if (poolBooking) {
      // Check status of the pool booking
      if (poolBooking.status === 'pending') {
        return `bg-orange-100 ${adminClickableClass}`; // Pending pools should be orange/yellow
      }
      // Must be an approved pool booking
      return `bg-blue-100 ${adminClickableClass}`;
    }
    
    // Check if day is a checkout day - this takes precedence over other statuses
    if (isCheckoutDay(date)) {
      return `bg-green-300 border-2 border-dashed border-blue-300 ${adminClickableClass}`; // Available but with special indicator
    }
    
    // Note: We no longer check for rejected dates as they're treated as available
    
    // Check for pending dates (light orange/peach)
    if (isDatePending(date)) {
      return `bg-orange-100 ${adminClickableClass}`;
    }
    
    // Check for approved dates (light blue)
    if (isDateApproved(date)) {
      return `bg-blue-100 ${adminClickableClass}`;
    }
    
    // If date is unavailable for other reasons
    if (isDateUnavailable(date, formData.rentalType)) {
      return `bg-blue-100 ${adminClickableClass}`; // Same as approved
    }
    
    // If date is available, return green
    return 'bg-green-500 text-white';
  };

  // Add function to find booking for a specific date
  const findBookingForDate = (date) => {
    if (!bookings || bookings.length === 0) return null;
    
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    // Look for bookings where this date falls within their range
    // Only consider pending and approved bookings
    return bookings.find(booking => {
      if (booking.status === 'rejected') return false;
      
      const bookingStartDate = new Date(booking.startDate);
      bookingStartDate.setHours(0, 0, 0, 0);
      
      const bookingEndDate = new Date(booking.endDate);
      bookingEndDate.setHours(0, 0, 0, 0);
      
      return dateToCheck >= bookingStartDate && dateToCheck <= bookingEndDate;
    });
  };

  // Add function to handle viewing booking details
  const handleViewBookingDetails = (booking) => {
    setDetailsBooking(booking);
    setShowDetailsModal(true);
  };

  // Fetch agent names for admin view
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
              console.log('Agent was removed');
              // No need to show error
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

  // Format date for display in modal
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge color for modal
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

  // Modify handleDayClick to handle admin booking view
  const handleDayClick = (date) => {
    if (!date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't allow selecting dates in the past
    if (date < today) {
      return;
    }
    
    // For admin, check if this date has a booking and show details
    if (hasRole('admin')) {
      const bookingOnDate = findBookingForDate(date);
      if (bookingOnDate && (bookingOnDate.status === 'pending' || bookingOnDate.status === 'approved')) {
        handleViewBookingDetails(bookingOnDate);
        return;
      }
    }
    
    // If date is a checkout day, it's always available for booking
    if (isCheckoutDay(date)) {
      // Allow booking on checkout days
      if (formData.rentalType === 'pool') {
        setFormData({
          ...formData,
          startDate: date,
          endDate: date,
          duration: 1
        });
        
        // Update amount
        calculateAmount('pool', 1);
      } else {
        let newEndDate = formData.endDate;
        
        // If selected date is after current end date, adjust end date to be one day later
        if (date >= formData.endDate) {
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
        
        // Update amount
        calculateAmount('villa_pool', newDuration);
      }
      return;
    }
    
    // Check if date is unavailable for the selected rental type
    if (isDateUnavailable(date, formData.rentalType)) {
      toast.error(`This date is not available for ${formData.rentalType === 'pool' ? 'pool' : 'villa'} booking`);
      return;
    }
    
    // For pool bookings, check if this is a villa start date
    if (formData.rentalType === 'pool' && isVillaStartDate(date)) {
      toast.error('Pool bookings are not allowed on start dates of villa bookings');
      return;
    }
    
    // For pool rentals, set start and end date to the same day
    if (formData.rentalType === 'pool') {
      setFormData({
        ...formData,
        startDate: date,
        endDate: date,
        duration: 1
      });
      
      // Update amount
      calculateAmount('pool', 1);
    } else {
      // For villa bookings, set start date and adjust end date if needed
      let newEndDate = formData.endDate;
      
      // If selected date is after current end date, adjust end date to be one day later
      if (date >= formData.endDate) {
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
      
      // Update amount
      calculateAmount('villa_pool', newDuration);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Booking</h2>
      
      {/* Custom Calendar */}
      <div className="mb-6">
        <div className="mx-auto max-w-md">
          <div className="custom-calendar border rounded-lg shadow-sm p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                type="button" 
                onClick={prevMonth}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <span className="text-xl">‹</span>
              </button>
              <h3 className="text-lg font-semibold">
                {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                type="button" 
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <span className="text-xl">›</span>
              </button>
            </div>
            
            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
                <div 
                  key={index} 
                  className="text-center py-1 text-xs font-bold text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays(currentMonth, currentYear).map((day, index) => {
                // Check if this date has a booking (for admin tooltip)
                const dayBooking = day && hasRole('admin') ? findBookingForDate(day) : null;
                const bookingTooltip = dayBooking ? 
                  `${dayBooking.guestName} - ${getRentalTypeDisplay(dayBooking.rentalType)} - Click to view details` : '';
                
                return (
                  <div 
                    key={index} 
                    className={`
                      h-10 p-1 text-center relative flex items-center justify-center
                      ${!day ? 'text-gray-300' : 'cursor-pointer hover:border hover:border-gray-400'}
                      ${day && day.getDate() === new Date().getDate() && 
                        day.getMonth() === new Date().getMonth() && 
                        day.getFullYear() === new Date().getFullYear() ? 'font-bold' : ''}
                      ${day ? getDayStatusClass(day) : ''}
                      ${day && formData.startDate.toDateString() === day.toDateString() ? 'ring-2 ring-blue-600' : ''}
                    `}
                    onClick={() => day && handleDayClick(day)}
                    title={bookingTooltip}
                  >
                    {day ? day.getDate() : ''}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-around gap-2 mt-3 text-sm">
            <div className="flex items-center"><div className="w-5 h-5 bg-green-500 rounded-sm mr-1"></div> <span>Available</span></div>
            <div className="flex items-center"><div className="w-5 h-5 bg-blue-100 rounded-sm mr-1"></div> <span>Approved</span></div>
            <div className="flex items-center"><div className="w-5 h-5 bg-orange-100 rounded-sm mr-1"></div> <span>Pending</span></div>
            <div className="flex items-center"><div className="w-5 h-5 bg-green-300 border-2 border-dashed border-blue-300 rounded-sm mr-1"></div> <span>Checkout/Check-in Day</span></div>
          </div>
          
          {/* Information about checkout/check-in days */}
          <div className="mt-3 text-sm text-gray-600 p-2 bg-blue-50 rounded">
            <p>
              <span className="font-semibold">Note:</span> Checkout/Check-in days (highlighted with dashed borders) are dates when pending or approved Villa+Pool bookings end and new ones can begin. 
              Villa checkout is at 12 PM, allowing new guests to check in on the same day.
              Dates won&apos;t be marked as checkout/check-in days if they&apos;re already the start date of another booking or have a Pool booking.
              Rejected bookings are treated as fully available dates with no special indicators.
            </p>
            
            {/* Admin-only instructions */}
            {hasRole('admin') && (
              <p className="mt-2 text-blue-800 font-medium">
                Admin: Click on any pending or approved booking date in the calendar to view its full details.
              </p>
            )}
          </div>
        </div>
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g. +1 234 567 8900"
          />
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Rental Type</label>
          <select
            name="rentalType"
            value={formData.rentalType}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="villa_pool">Villa + Pool</option>
            <option value="pool">Pool Only</option>
          </select>
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              min={formatDateForInput(formData.rentalType === 'pool' ? formData.startDate : new Date(new Date(formData.startDate).setDate(new Date(formData.startDate).getDate() + 1)))}
              disabled={formData.rentalType === 'pool'}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${formData.rentalType === 'pool' ? 'bg-gray-100' : ''}`}
            />
            {formData.rentalType === 'pool' && (
              <p className="text-sm text-gray-500 mt-1">Pool bookings are for 1 day only.</p>
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
            <label className="block text-sm font-medium text-gray-700">Amount (₪)</label>
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Additional Details/Notes</label>
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows="3"
            placeholder="Add any additional information or special requirements here"
          ></textarea>
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

      {/* Booking Details Modal for Admin */}
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
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Booking ID</h4>
                  <p className="mt-1">{detailsBooking._id}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className={`mt-1 inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${getStatusColor(detailsBooking.status)}`}>
                    {detailsBooking.status.charAt(0).toUpperCase() + detailsBooking.status.slice(1)}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Guest Name</h4>
                  <p className="mt-1">{detailsBooking.guestName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Phone Number</h4>
                  <p className="mt-1">{detailsBooking.phoneNumber || "Not provided"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Rental Type</h4>
                  <p className="mt-1">{getRentalTypeDisplay(detailsBooking.rentalType)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                  <p className="mt-1">{detailsBooking.duration} days</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Check-in Date</h4>
                  <p className="mt-1">{formatDate(detailsBooking.startDate)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Check-out Date</h4>
                  <p className="mt-1">{formatDate(detailsBooking.endDate)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Number of Guests</h4>
                  <p className="mt-1"> {detailsBooking.adults || 0} adults, {detailsBooking.children || 0} children</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                  <p className="mt-1">₪ {detailsBooking.amount}</p>
                </div>
                
                {hasRole('admin') && detailsBooking.agentId && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Created By</h4>
                    <p className="mt-1">{agentNames[detailsBooking.agentId] || "Unknown Agent"}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created At</h4>
                  <p className="mt-1">{new Date(detailsBooking.createdAt).toLocaleString()}</p>
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
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm; 