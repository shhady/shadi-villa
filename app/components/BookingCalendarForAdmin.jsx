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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    phoneNumber: '', // Added phone number field
    adults: 1, // Changed from guestCount to adults
    children: 0, // Added children field
    rentalType: 'villa_pool', // Changed default from 'pool' to 'villa_pool'
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Set end date to next day
    duration: 2, // Changed from 1 to 2 for villa_pool default
    amount: '', // Changed from 100 to 500 (250 * 2 days for villa_pool)
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
      const response = await api.get('/api/bookings?for_calendar=true', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setBookings(response.data.data);
        console.log(`Loaded ${response.data.data.length} bookings for calendar rendering`);
        
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
      // If changing to pool, set end date one day after start date
      if (value === 'pool') {
        const startDate = formData.startDate;
        
        // Check if selected date is a villa start date for both rental types
        if (isVillaStartDate(startDate)) {
          toast.error('This date is not available as it\'s the start date of another booking');
          return;
        }
        
        // Set end date to one day after start date for pool bookings
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        setFormData({
          ...formData,
          rentalType: value,
          endDate: nextDay,
          duration: 1  // Always 1 day for pool bookings
        });
        
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
        } else {
          setFormData({
            ...formData,
            rentalType: value
          });
        }
        
        return;
      }
    }
    
    // Regular field update
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle date input changes
  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    const selectedDate = new Date(value);
    
    if (name === 'startDate') {
      // First check if date is unavailable
      if (isDateUnavailable(selectedDate)) {
        toast.error(`This date is not available for booking`);
        return;
      }
      
      // Check for start date conflicts for both rental types
      if (isVillaStartDate(selectedDate)) {
        toast.error('This date is not available as it\'s the start date of another booking');
        return;
      }
      
      // For pool rentals, set end date to one day after start date
      if (formData.rentalType === 'pool') {
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        setFormData({
          ...formData,
          startDate: selectedDate,
          endDate: nextDay,
          duration: 1  // Always 1 day for pool bookings
        });
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
      }
    } else if (name === 'endDate') {
      // For pool rental, end date is automatically set and cannot be changed manually
      if (formData.rentalType === 'pool') {
        toast.error('For pool bookings, end date is automatically set to the day after the start date.');
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
      
      // Don't check if the end date is a start date of another booking
      // This allows selecting an end date even if it's a start date for another booking
      
      // For villa bookings, check if any of the days in between are unavailable
      // But don't check the end date itself (which is allowed to be available or a start date)
      const daysToCheck = [];
      const tempDate = new Date(formData.startDate);
      
      while (tempDate < selectedDate) {
        daysToCheck.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      // Check if any day in the range is unavailable (excluding the end date)
      const unavailableDay = daysToCheck.find(day => isDateUnavailable(day));
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
    }
  };

  // Check if a date is a villa start date
  // This is used to prevent pool bookings on villa start dates
  const isVillaStartDate = (date) => {
    // Normalize the date to UTC midnight for consistent comparison
    const dateToCheck = new Date(date);
    const normalizedDate = new Date(Date.UTC(
      dateToCheck.getFullYear(),
      dateToCheck.getMonth(),
      dateToCheck.getDate(),
      0, 0, 0, 0
    ));
    
    // First check bookings for any villa_pool start dates
    const isStartDateOfVillaBooking = bookings.some(booking => {
      // Skip rejected bookings
      if (booking.status === 'rejected') return false;
      
      // Only consider villa_pool bookings
      if (booking.rentalType !== 'villa_pool') return false;
      
      const startDate = new Date(booking.startDate);
      const normalizedStartDate = new Date(Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, 0, 0, 0
      ));
      
      return normalizedStartDate.getTime() === normalizedDate.getTime();
    });
    
    if (isStartDateOfVillaBooking) return true;
    
    // Also check the unavailableDates.villaStartDates from the API
    return unavailableDates.villaStartDates.some(villaStartDate => {
      const startDateObj = new Date(villaStartDate);
      const normalizedVillaStartDate = new Date(Date.UTC(
        startDateObj.getFullYear(),
        startDateObj.getMonth(),
        startDateObj.getDate(),
        0, 0, 0, 0
      ));
      return normalizedVillaStartDate.getTime() === normalizedDate.getTime();
    });
  };

  // Check if a date is unavailable for the selected rental type
  // Note: End dates CAN be the start dates of other bookings (back-to-back bookings)
  const isDateUnavailable = (date) => {
    // Normalize the date to start of day in UTC for consistent comparison
    const dateToCheck = new Date(date);
    // Use UTC methods to avoid timezone shifts
    const normalizedDate = new Date(Date.UTC(
      dateToCheck.getFullYear(),
      dateToCheck.getMonth(),
      dateToCheck.getDate(),
      0, 0, 0, 0
    ));
    
    // Check if date is rejected - rejected dates are considered available
    if (isDateRejected(date)) {
      return false;
    }
    
    // A date is unavailable if:
    // 1. It is the start date of any booking, OR
    // 2. It falls between start and end date of any booking (exclusive of end date)
    // But remember: When used for END dates, we allow the date even if it's a start date of another booking
    return bookings.some(booking => {
      // Skip rejected bookings
      if (booking.status === 'rejected') return false;
      
      // Normalize booking dates
      const startDate = new Date(booking.startDate);
      const startNormalized = new Date(Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, 0, 0, 0
      ));
      
      const endDate = new Date(booking.endDate);
      const endNormalized = new Date(Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0, 0, 0, 0
      ));
      
      // Check if this date is the start date of a booking
      if (normalizedDate.getTime() === startNormalized.getTime()) {
        return true;
      }
      
      // Check if this date falls between start and end (exclusive of end)
      return normalizedDate > startNormalized && normalizedDate < endNormalized;
    });
  };

  // Check if a date is a checkout day (end date of any booking)
  // This function is kept for reference but no longer used for availability
  const isCheckoutDay = (date) => {
    // Normalize the date to start of day in UTC for consistent comparison
    const dateToCheck = new Date(date);
    const normalizedDate = new Date(Date.UTC(
      dateToCheck.getFullYear(),
      dateToCheck.getMonth(),
      dateToCheck.getDate(),
      0, 0, 0, 0
    ));
    
    // Check if any booking has this date as its end date
    return bookings.some(booking => {
      // Skip rejected bookings
      if (booking.status === 'rejected') return false;
      
      const endDate = new Date(booking.endDate);
      // Normalize to UTC
      const normalizedEndDate = new Date(Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0, 0, 0, 0
      ));
      
      return normalizedEndDate.getTime() === normalizedDate.getTime();
    });
  };

  // Check if a date has a pool booking
  const hasPoolBooking = (date) => {
    const dateToCheck = new Date(date);
    // Normalize to UTC midnight
    const normalizedDate = new Date(Date.UTC(
      dateToCheck.getFullYear(),
      dateToCheck.getMonth(),
      dateToCheck.getDate(),
      0, 0, 0, 0
    ));
    
    return bookings.some(booking => {
      // Skip rejected bookings
      if (booking.status === 'rejected') return false;
      
      // Check if it's a pool booking
      if (booking.rentalType === 'pool') {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        
        // Normalize to UTC midnight
        const normalizedStartDate = new Date(Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0, 0, 0, 0
        ));
        
        const normalizedEndDate = new Date(Date.UTC(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          0, 0, 0, 0
        ));
        
        // Date has a pool booking if it's between start and end (exclusive of end)
        return normalizedDate >= normalizedStartDate && normalizedDate < normalizedEndDate;
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

  // Calculate rental amount based on type and duration - REMOVED automatic calculation
  const calculateAmount = (type, days) => {
    // This function is kept for backward compatibility but no longer calculates automatically
    // Amount will be manually entered by admin/agent
    return;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate that amount is provided
      if (!formData.amount) {
        toast.error('Please enter the booking amount before submitting');
        setLoading(false);
        return;
      }
      
      // For all rental types, check if the start date is unavailable
      if (isDateUnavailable(formData.startDate)) {
        toast.error('This date is not available for booking');
        setLoading(false);
        return;
      }
      
      // For all rental types, check if start date conflicts with another booking
      if (isVillaStartDate(formData.startDate)) {
        toast.error('This date is not available as it\'s the start date of another booking');
        setLoading(false);
        return;
      }
      
      // For villa bookings, check all dates between start and end (exclusive of end)
      if (formData.rentalType === 'villa_pool') {
        const daysToCheck = [];
        const tempDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        
        while (tempDate < endDate) {
          daysToCheck.push(new Date(tempDate));
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        // Don't include the end date in the check - end dates can be booked
        // even if they are the start date of another booking
        const unavailableDay = daysToCheck.find(day => isDateUnavailable(day));
        if (unavailableDay) {
          toast.error(`The date range includes unavailable dates. ${unavailableDay.toLocaleDateString()} is already booked.`);
          setLoading(false);
          return;
        }
        
        // We don't check if end date is a start date of another booking
        // This allows for back-to-back bookings where checkout and check-in can happen on the same day
      }
      
      const token = getToken();
      
      if (!token) {
        toast.error('You need to be logged in to create a booking');
        console.error('No authentication token available');
        setLoading(false);
        return;
      }
      
      // Create UTC dates to ensure consistent date handling across environments
      const toUtcDate = (date) => {
        // Create a new Date object with the date components at midnight UTC
        const utcDate = new Date(Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          0, 0, 0, 0  // Explicitly set to midnight UTC
        ));
        return utcDate;
      };
      
      // Create a copy of the form data with normalized dates to prevent time-related issues
      // Calculate total guest count from adults + children
      const normalizedFormData = {
        ...formData,
        guestCount: formData.adults + formData.children, // Calculate total guest count
        startDate: toUtcDate(new Date(formData.startDate)),
        endDate: formData.rentalType === 'pool' 
          ? toUtcDate(new Date(formData.startDate)) // For pool bookings, use same date for both
          : toUtcDate(new Date(formData.endDate))
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
          rentalType: 'villa_pool',
          startDate: new Date(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
          duration: 1,
          amount: '', // Empty amount - user must enter it manually
          details: ''
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
    // Normalize to UTC to avoid timezone issues
    const normalizedDate = new Date(Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0, 0, 0, 0
    ));
    
    // Extract date components from normalized date
    let month = '' + (normalizedDate.getUTCMonth() + 1);
    let day = '' + normalizedDate.getUTCDate();
    const year = normalizedDate.getUTCFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
  };

  // Add custom formatting for the calendar
  const formatShortWeekday = (locale, date) => {
    // Use UTC day to avoid timezone issues
    const utcDay = date.getUTCDay();
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][utcDay];
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
  
  // Get CSS class for calendar day status, with admin-specific handling
  const getDayStatusClass = (date) => {
    // First normalize the date to start of day in UTC for comparison
    const normalizedDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
    
    // Admin-specific clickable classes
    const adminClickableClass = hasRole('admin') ? 'cursor-pointer hover:opacity-75' : '';
    
    // Current and selected date styling
    const currentDateString = normalizedDate.toISOString().split('T')[0];
    const startDateString = new Date(formData.startDate).toISOString().split('T')[0];
    const endDateString = new Date(formData.endDate).toISOString().split('T')[0];
    
    // Only highlight the specific selected start date with a border
    // No special color treatment for any other dates related to the selection
    // if (currentDateString === startDateString) {
    //   return `border-2 border-blue-600 ${adminClickableClass}`; // Just a border for selected start date
    // }
    
    // Past dates are light gray and not clickable
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'; // Past dates
    }
    
    // Find a booking for this date 
    const booking = findBookingForDate(date);
    if (booking) {
      // For both pool and villa_pool bookings, show start date as unavailable
      const startDate = new Date(booking.startDate);
      const normalizedStartDate = new Date(Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, 0, 0, 0
      ));
      
      const endDate = new Date(booking.endDate);
      const normalizedEndDate = new Date(Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0, 0, 0, 0
      ));
      
      // If this is a start date, mark as unavailable
      if (normalizedDate.getTime() === normalizedStartDate.getTime()) {
        // For pending bookings, use orange
        if (booking.status === 'pending') {
          return `bg-orange-100 ${adminClickableClass}`;
        }
        // For approved bookings, use blue
        return `bg-blue-100 ${adminClickableClass}`;
      }
      
      // For dates between start and end (exclusive of end), also block them
      if (normalizedDate > normalizedStartDate && normalizedDate < normalizedEndDate) {
        // For pending bookings, use orange
        if (booking.status === 'pending') {
          return `bg-orange-100 ${adminClickableClass}`;
        }
        // For approved bookings, use blue
        return `bg-blue-100 ${adminClickableClass}`;
      }
    }
    
    // Check for unavailable dates (start dates of bookings or dates between start and end exclusive of end)
    if (isDateUnavailable(date)) {
      // If the date is a start date or within a booking (not an end date), it's unavailable
      // For pending dates (light orange/peach)
      if (isDatePending(date)) {
        return `bg-orange-100 ${adminClickableClass}`;
      }
      
      // For approved dates (light blue)
      if (isDateApproved(date)) {
        return `bg-blue-100 ${adminClickableClass}`;
      }
      
      return `bg-blue-100 ${adminClickableClass}`; // Generic unavailable
    }
    
    // If date is available, return green
    return 'bg-green-500 text-white';
  };

  // Add function to find booking for a specific date
  const findBookingForDate = (date) => {
    if (!bookings || bookings.length === 0) return null;
    
    // Normalize the input date to UTC midnight
    const normalizedDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
    
    // Look for bookings where this date:
    // 1. Is the booking's start date, OR
    // 2. Falls between the booking's start and end date (exclusive of end date)
    return bookings.find(booking => {
      if (booking.status === 'rejected') return false;
      
      const bookingStartDate = new Date(booking.startDate);
      // Normalize to UTC midnight
      const normalizedStartDate = new Date(Date.UTC(
        bookingStartDate.getFullYear(),
        bookingStartDate.getMonth(),
        bookingStartDate.getDate(),
        0, 0, 0, 0
      ));
      
      const bookingEndDate = new Date(booking.endDate);
      // Normalize to UTC midnight
      const normalizedEndDate = new Date(Date.UTC(
        bookingEndDate.getFullYear(),
        bookingEndDate.getMonth(),
        bookingEndDate.getDate(),
        0, 0, 0, 0
      ));
      
      // Check if this is the start date
      if (normalizedDate.getTime() === normalizedStartDate.getTime()) {
        return true;
      }
      
      // Check if date falls between start and end (exclusive of end)
      return normalizedDate > normalizedStartDate && normalizedDate < normalizedEndDate;
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
    // First for admin, check if there's a booking on this date and show details
    if (hasRole('admin')) {
      const bookingOnDate = findBookingForDate(date);
      if (bookingOnDate && (bookingOnDate.status === 'pending' || bookingOnDate.status === 'approved')) {
        handleViewBookingDetails(bookingOnDate);
        return;
      }
    }
    
    // Only check if date is unavailable (start date or middle dates, but not end dates)
    if (isDateUnavailable(date)) {
      toast.error(`This date is not available for booking`);
      return;
    }
    
    // For both pool and villa_pool, check if the date is a villa start date
    if (isVillaStartDate(date)) {
      toast.error('This date is not available as it\'s the start date of another booking');
      return;
    }
    
    // For pool rentals, set end date to one day after start date
    if (formData.rentalType === 'pool') {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      setFormData({
        ...formData,
        startDate: date,
        endDate: nextDay,
        duration: 1  // Always 1 day for pool bookings
      });
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
    }
  };

  return (
    <div className="bg-white">
            <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center px-4 mt-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
        {showForm ? 'Close Booking Form' : 'Create Booking'}</button>
      
      {/* Custom Calendar */}
      <div className="mb-6">
        <div className="mx-auto max-w-md">
          <div className="custom-calendar rounded-lg shadow-sm p-4">
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
            {/* <div className="flex items-center"><div className="w-5 h-5 bg-green-300 border-2 border-dashed border-blue-300 rounded-sm mr-1"></div> <span>Checkout/Check-in Day</span></div> */}
          </div>
          
      
        </div>
      </div>
     {showForm && 
      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
          <label className="block text-sm font-medium text-gray-700">Rental Type</label>
          <select
            name="rentalType"
            value={formData.rentalType}
            onChange={handleChange}
            required
            className="px-4 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              min={formatDateForInput(formData.rentalType === 'pool' ? formData.startDate : new Date(new Date(formData.startDate).setDate(new Date(formData.startDate).getDate() + 1)))}
              disabled={formData.rentalType === 'pool'}
              className={`px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${formData.rentalType === 'pool' ? 'bg-gray-100' : ''}`}
            />
            {formData.rentalType === 'pool' && (
              <p className="text-sm text-gray-500 mt-1">Pool bookings are for a single day only. Checkout is automatically set to the day after check-in.</p>
            )}
          </div>
        </div>
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
              className={`h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100`}
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.rentalType === 'pool' 
                ? "Duration is fixed at 1 day for pool bookings." 
                : "Duration is automatically calculated from the selected dates."}
            </p>
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
              className="px-2 h-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter the booking amount"
            />
            <p className="text-sm text-gray-500 mt-1">
              Please enter the booking amount manually based on your pricing guidelines.
            </p>
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
      </form>} 

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
              
              <div className="mt-4 grid grid-cols-1  gap-4">
               
                
                <div className='flex justify-start items-center gap-4'>
                  <h4 className=" font-medium text-gray-500">Status</h4>
                  <p className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${getStatusColor(detailsBooking.status)}`}>
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
                  <p className="font-bold">
                    {detailsBooking.rentalType === 'pool' 
                      ? "1 day" 
                      : `${detailsBooking.duration} ${detailsBooking.duration === 1 ? 'night' : 'nights'}`}
                  </p>
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
                    <p className="font-bold text-red-600">{detailsBooking.rejectionReason}</p>
                  </div>
                )}
                
                {detailsBooking.details && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Additional Details</h4>
                    <p className="font-bold">{detailsBooking.details}</p>
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