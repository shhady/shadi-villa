import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/utils/dbConnect';
import Booking from '../../../lib/models/Booking';
import { authenticateUser, getTokenFromHeaders } from '../../../lib/utils/auth';
export const dynamic = 'force-dynamic';

// Debug helper to log headers
const logHeadersAndToken = (request) => {
  try {
    const token = getTokenFromHeaders(request);
    console.log('API Route - Token extracted:', token ? 'Yes, length: ' + token.length : 'No');
    return token;
  } catch (error) {
    console.error('Error extracting token:', error);
    return null;
  }
};

// Get all bookings (filtered by user role)
export async function GET(request) {
  try {
    await dbConnect();
    
    // Log headers
    console.log('GET /api/bookings - Request received');
    logHeadersAndToken(request);
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      console.log('GET /api/bookings - Authentication failed');
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    console.log('User authenticated successfully:', user);
    
    let query = {};
    
    // If user is agent, only show their bookings
    if (user.role === 'agent') {
      query.agentId = user.userId;
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    if (status) {
      query.status = status;
    }
    
    // Get bookings based on query
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    
    console.log(`Found ${bookings.length} bookings matching query`);
    
    return NextResponse.json({
      success: true,
      count: bookings.length,
      data: bookings
    }, { status: 200 });
    
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

// Create a new booking
export async function POST(request) {
  try {
    await dbConnect();
    
    // Log headers
    console.log('POST /api/bookings - Request received');
    logHeadersAndToken(request);
    
    // Log body for debugging
    try {
      const requestBody = await request.clone().json();
      console.log('POST /api/bookings - Request body:', JSON.stringify({
        ...requestBody,
        startDate: new Date(requestBody.startDate).toISOString(),
        endDate: new Date(requestBody.endDate).toISOString()
      }));
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      console.log('POST /api/bookings - Authentication failed');
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    console.log('Authenticated user:', user);
    
    // Only agents and admins can create bookings
    if (user.role !== 'agent' && user.role !== 'admin') {
      console.log('User role is not authorized:', user.role);
      return NextResponse.json({ 
        success: false, 
        message: 'Only agents and admins can create bookings' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      guestName,
      phoneNumber,
      adults,
      children, 
      guestCount, 
      rentalType, 
      startDate, 
      endDate, 
      duration, 
      amount,
      details
    } = body;
    
    // Validate required fields
    if (!guestName || !phoneNumber || !adults || !rentalType || !startDate || !endDate || !duration || !amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Please provide all required fields' 
      }, { status: 400 });
    }
    
    // Convert string dates to Date objects and normalize time to start of day for UTC
    // Use a more reliable approach to ensure we get the exact date the user selected
    const inputStartDate = new Date(startDate);
    console.log('Original input start date:', inputStartDate.toISOString());
    
    // Always set hours to 0 (start of day) in UTC for consistent date handling
    const bookingStartDate = new Date(Date.UTC(
      inputStartDate.getFullYear(),
      inputStartDate.getMonth(),
      inputStartDate.getDate(),
      0, 0, 0, 0  // Set to midnight UTC
    ));
    
    // Log the actual date to be stored
    console.log('UTC start date to be stored:', bookingStartDate.toISOString());
    
    // For pool bookings, ensure the end date is one day after start date
    // This prevents issues with date display showing end date as day before start date
    let bookingEndDate;
    let bookingDuration;
    
    if (rentalType === 'pool') {
      // For pool bookings, set end date to be one day after start date and duration to 1
      // Create a new Date object with the proper end date
      const nextDay = new Date(bookingStartDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      bookingEndDate = nextDay;
      bookingDuration = 1;
      console.log('Pool booking - setting end date to one day after start date:', bookingEndDate.toISOString());
      
      // Ensure both startDate and endDate have consistent UTC time
      bookingStartDate.setUTCHours(0, 0, 0, 0);
      bookingEndDate.setUTCHours(0, 0, 0, 0);
    } else {
      // For villa bookings, use the provided end date - also normalized to midnight UTC
      const inputEndDate = new Date(endDate);
      console.log('Original input end date:', inputEndDate.toISOString());
      
      bookingEndDate = new Date(Date.UTC(
        inputEndDate.getFullYear(),
        inputEndDate.getMonth(),
        inputEndDate.getDate(),
        0, 0, 0, 0  // Set to midnight UTC
      ));
      console.log('UTC end date to be stored:', bookingEndDate.toISOString());
      bookingDuration = duration;
    }
    
    // For both booking types, we check if the start date conflicts with another booking's start date
    // But end dates are allowed to be another booking's start date
    
    // First, check if the proposed start date is already someone else's start date
    // This applies to both pool and villa bookings
    const conflictingStartDate = await Booking.findOne({
      status: { $in: ['approved', 'pending'] },
      startDate: {
        $gte: new Date(new Date(bookingStartDate).setUTCHours(0, 0, 0, 0)),
        $lt: new Date(new Date(bookingStartDate).setUTCHours(23, 59, 59, 999))
      }
    });
    
    if (conflictingStartDate) {
      return NextResponse.json({ 
        success: false, 
        message: `The selected start date (${new Date(bookingStartDate).toISOString().split('T')[0]}) is already booked as another booking's start date.`
      }, { status: 409 });
    }
    
    // For both booking types, check if any date between start and end (excluding end) is already booked
    // This is now the same logic for both pool and villa bookings
    const allBookingDates = [];
    const currentDate = new Date(bookingStartDate);
    const endDateValue = new Date(bookingEndDate);
    
    // Add all dates excluding the end date (endDateValue)
    while (currentDate < endDateValue) {
      allBookingDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (allBookingDates.length > 0) {
      // Create a query to check if any booking (both pool and villa) 
      // has start dates on any of our dates (excluding our end date)
      const orConditions = allBookingDates.map(date => ({
        $and: [
          // Check if this date falls between another booking's start and end (exclusive of end)
          { startDate: { $lte: new Date(date) } },
          { endDate: { $gt: new Date(date) } }
        ]
      }));
      
      // Since we want to block any date that falls within another booking's range (except end dates)
      const conflictQuery = {
        status: { $in: ['approved', 'pending'] },
        $or: orConditions
      };
      
      // Exclude the current booking itself when checking for overlaps (for updates)
      if (request.headers.get('x-booking-id')) {
        conflictQuery._id = { $ne: request.headers.get('x-booking-id') };
      }
      
      const conflictingBookings = await Booking.find(conflictQuery);
      
      if (conflictingBookings.length > 0) {
        console.log(`Found ${conflictingBookings.length} conflicting bookings`);
        return NextResponse.json({ 
          success: false, 
          message: `The selected dates overlap with existing bookings. There are ${conflictingBookings.length} booking(s) that conflict with your requested dates.`
        }, { status: 409 });
      }
    }
    
    // Special case: Allow booking pool on end date of villa_pool booking
    if (rentalType === 'pool') {
      // Check if this date is specifically the end date of a villa booking
      const normalizedDate = new Date(new Date(bookingStartDate).setHours(0, 0, 0, 0));
      const isEndDateOfVillaBooking = await Booking.findOne({
        rentalType: 'villa_pool',
        status: { $in: ['approved', 'pending'] },
        endDate: normalizedDate
      });
      
      // If it's an end date of a villa booking, explicitly allow it
      if (isEndDateOfVillaBooking) {
        console.log('Allowing pool booking on villa checkout day');
        // Continue with booking creation - no conflict
      }
    }
    
    // Log the actual dates that will be stored to help with debugging
    console.log('Dates to be stored in booking:', {
      startDate: bookingStartDate.toISOString(),
      endDate: bookingEndDate.toISOString(),
      duration: bookingDuration
    });
    
    // Create new booking
    const booking = await Booking.create({
      agentId: user.userId, // The creator's ID (could be admin or agent)
      guestName,
      phoneNumber,
      adults,
      children: children || 0,
      guestCount,
      rentalType,
      startDate: bookingStartDate,
      endDate: bookingEndDate,
      duration: bookingDuration,
      amount,
      details: details || '',
      // If admin creates booking, automatically approve it
      status: user.role === 'admin' ? 'approved' : 'pending'
    });
    
    console.log('Booking created successfully:', {
      id: booking._id,
      guestName: booking.guestName,
      rentalType: booking.rentalType,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      duration: booking.duration,
      status: booking.status
    });
    
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create booking error:', error);
    
    // Provide more detailed error for validation errors
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Validation error',
        details: Object.values(error.errors || {}).map(err => err.message)
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
} 