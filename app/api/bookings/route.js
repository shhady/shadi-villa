import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/utils/dbConnect';
import Booking from '../../../lib/models/Booking';
import User from '../../../lib/models/User';
import { authenticateUser, getTokenFromHeaders } from '../../../lib/utils/auth';
import { sendBookingConfirmationEmail } from '../../../lib/utils/mailer';
export const dynamic = 'force-dynamic';

// Debug helper to log headers
const logHeadersAndToken = (request) => {
  try {
    const token = getTokenFromHeaders(request);
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
    logHeadersAndToken(request);
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    
    let query = {};
    
    // If user is agent, only show their bookings
    if (user.role === 'agent') {
      query.agentId = user.userId;
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const forCalendar = searchParams.get('for_calendar');
    
    if (status) {
      query.status = status;
    }
    
    // For calendar rendering, return all bookings regardless of user role
    // This ensures agents see the same calendar availability as admins
    if (forCalendar === 'true') {
      // Just keep status filter if provided, but don't restrict by agent
      delete query.agentId;
    }
    
    // Get bookings based on query
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    
    
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
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    
    // Only agents and admins can create bookings
    if (user.role !== 'agent' && user.role !== 'admin') {
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
    
    // Always set hours to 0 (start of day) in UTC for consistent date handling
    const bookingStartDate = new Date(Date.UTC(
      inputStartDate.getFullYear(),
      inputStartDate.getMonth(),
      inputStartDate.getDate(),
      0, 0, 0, 0  // Set to midnight UTC
    ));
    
    // Log the actual date to be stored
    
    // For pool bookings, ensure the end date is one day after start date
    // Pool bookings occupy only a single day, but we set the end date to the next day
    // to maintain consistent checkout-day booking logic with villa bookings
    let bookingEndDate;
    let bookingDuration;
    
    if (rentalType === 'pool') {
      // For pool bookings, set end date to be one day after start date and duration to 1
      // Create a new Date object with the proper end date
      const nextDay = new Date(bookingStartDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      bookingEndDate = nextDay;
      bookingDuration = 1; // Pool bookings are always for 1 day
      
      // Ensure both startDate and endDate have consistent UTC time
      bookingStartDate.setUTCHours(0, 0, 0, 0);
      bookingEndDate.setUTCHours(0, 0, 0, 0);
    } else {
      // For villa bookings, use the provided end date - also normalized to midnight UTC
      const inputEndDate = new Date(endDate);
      
      bookingEndDate = new Date(Date.UTC(
        inputEndDate.getFullYear(),
        inputEndDate.getMonth(),
        inputEndDate.getDate(),
        0, 0, 0, 0  // Set to midnight UTC
      ));
      bookingDuration = duration;
    }
    
    // For both booking types, we check if the start date conflicts with another booking's start date
    // End dates are allowed to be available unless they are another booking's start date
    
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
        message: `Selected start date (${new Date(bookingStartDate).toISOString().split('T')[0]}) is not available for booking.`
      }, { status: 409 });
    }
    
    // For both booking types, check if any date between start and end (excluding end) 
    // is already the start date of another booking, or falls within another booking's range (excluding end date)
    const allBookingDates = [];
    const currentDate = new Date(bookingStartDate);
    const endDateValue = new Date(bookingEndDate);
    
    // Add all dates EXCLUDING the end date (endDateValue)
    while (currentDate < endDateValue) {
      allBookingDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (allBookingDates.length > 0) {
      // Create a query to check for conflicts
      // A conflict is when our date (not including end date):
      // 1. Is the start date of another booking, OR
      // 2. Is between another booking's start and end date (exclusive of end)
      const orConditions = allBookingDates.map(date => ({
        $or: [
          // If date is another booking's start date
          {
            startDate: {
              $gte: new Date(new Date(date).setUTCHours(0, 0, 0, 0)),
              $lt: new Date(new Date(date).setUTCHours(23, 59, 59, 999))
            }
          },
          // If date falls between another booking's start and end (exclusive of end)
          {
            startDate: { $lt: new Date(date) },
            endDate: { $gt: new Date(date) }
          }
        ]
      }));
      
      // Since we want to block any date that is another booking's start date or falls within another booking's range
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
        
        return NextResponse.json({ 
          success: false, 
          message: `Selected dates are not available. There are ${conflictingBookings.length} booking(s) that conflict with your requested dates.`
        }, { status: 409 });
      }
    }
    
    // Now, check if our end date is another booking's start date (not allowed)
    // REMOVED: This check was preventing back-to-back bookings where checkout and check-in can happen on the same day
    // We now allow end dates to overlap with start dates of other bookings
    
    // Special case: Allow booking pool on end date of villa_pool booking
    // This check is no longer needed since end dates are always available unless they are
    // the start date of another booking, which is checked above
    
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
    
    // Get the agent information to send email
    try {
      const agent = await User.findById(user.userId).select('name email');
      
      if (agent && agent.email) {
        // Send booking confirmation email to the agent
        await sendBookingConfirmationEmail(booking, agent);
      }
    } catch (emailError) {
      console.error('Error sending booking confirmation email:', emailError);
      // Continue with the booking process even if email fails
    }
    
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