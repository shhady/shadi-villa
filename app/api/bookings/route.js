import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/utils/dbConnect';
import Booking from '../../../lib/models/Booking';
import { authenticateUser, getTokenFromHeaders } from '../../../lib/utils/auth';

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
    
    // Convert string dates to Date objects and normalize time to start of day
    const bookingStartDate = new Date(startDate);
    bookingStartDate.setHours(0, 0, 0, 0);
    
    const bookingEndDate = new Date(endDate);
    bookingEndDate.setHours(0, 0, 0, 0);
    
    // Validate rental type specific rules
    if (rentalType === 'pool') {
      // Pool bookings must be for a single day only
      const startDay = bookingStartDate.getTime();
      const endDay = bookingEndDate.getTime();
      
      if (startDay !== endDay) {
        return NextResponse.json({ 
          success: false, 
          message: 'Pool bookings must be for a single day only' 
        }, { status: 400 });
      }
      
      // Now check if there's a villa booking that starts on this date
      // Pool bookings are not allowed on start dates of villa bookings
      const conflictingVillaStartDate = await Booking.findOne({
        rentalType: 'villa_pool',
        status: { $in: ['approved', 'pending'] },
        startDate: {
          $gte: new Date(bookingStartDate.setHours(0, 0, 0, 0)),
          $lt: new Date(bookingStartDate.setHours(23, 59, 59, 999))
        }
      });
      
      if (conflictingVillaStartDate) {
        return NextResponse.json({ 
          success: false, 
          message: 'Pool bookings are not allowed on start dates of villa bookings' 
        }, { status: 409 });
      }
      
      // NEW: Check if there's any villa+pool booking that includes this date
      const conflictingVilla = await Booking.findOne({
        rentalType: 'villa_pool',
        status: { $in: ['approved', 'pending'] },
        startDate: { $lte: bookingStartDate },
        endDate: { $gt: bookingStartDate }
      });
      
      if (conflictingVilla) {
        return NextResponse.json({ 
          success: false, 
          message: 'Pool bookings are not allowed on dates reserved for villa bookings' 
        }, { status: 409 });
      }
      
    } else if (rentalType === 'villa_pool') {
      // Villa bookings must have both start and end dates
      if (!startDate || !endDate) {
        return NextResponse.json({ 
          success: false, 
          message: 'Villa bookings must have both start and end dates' 
        }, { status: 400 });
      }
      
      // NEW: Check for any existing pool bookings on any of the dates
      // Get all dates between start and end date
      const allBookingDates = [];
      const currentDate = new Date(bookingStartDate);
      const endDateValue = new Date(bookingEndDate);
      
      while (currentDate < endDateValue) {
        allBookingDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (allBookingDates.length > 0) {
        const orConditions = allBookingDates.map(date => ({
          startDate: {
            $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
          }
        }));
        
        const poolConflictQuery = {
          rentalType: 'pool',
          status: { $in: ['approved', 'pending'] },
          $or: orConditions
        };
        
        const conflictingPoolBookings = await Booking.find(poolConflictQuery);
        
        if (conflictingPoolBookings.length > 0) {
          console.log(`Found ${conflictingPoolBookings.length} conflicting pool bookings`);
          return NextResponse.json({ 
            success: false, 
            message: `Villa booking conflicts with existing pool bookings. There are ${conflictingPoolBookings.length} pool booking(s) on your requested dates.` 
          }, { status: 409 });
        }
      }
    }
    
    // Check for duplicate/overlapping bookings based on rental type
    let overlapQuery;
    
    if (rentalType === 'pool') {
      // For pool bookings (single day), check for exact date matches
      overlapQuery = {
        // Only consider approved and pending bookings
        status: { $in: ['approved', 'pending'] },
        // Check if another pool booking exists for this exact day
        rentalType: 'pool',
        // Since pool bookings are for a single day, just check if any booking has this date
        $or: [
          {
            startDate: {
              $gte: new Date(bookingStartDate.setHours(0, 0, 0, 0)),
              $lt: new Date(bookingStartDate.setHours(23, 59, 59, 999))
            }
          }
        ]
      };
    } else {
      // For villa_pool bookings, check for any overlapping dates
      overlapQuery = {
        // Only consider approved and pending bookings
        status: { $in: ['approved', 'pending'] },
        // Only check for villa bookings overlap
        rentalType: 'villa_pool',
        // Check for date overlap with any existing booking
        $or: [
          // Another booking starts during our booking period (exclude the end date)
          { 
            startDate: { 
              $gte: bookingStartDate, 
              $lt: bookingEndDate 
            } 
          },
          // Another booking ends during our booking period (exclude the start date)
          { 
            endDate: { 
              $gt: bookingStartDate, 
              $lt: bookingEndDate 
            } 
          },
          // Another booking encompasses our booking (exclude cases where our start date = their end date)
          {
            $and: [
              { startDate: { $lt: bookingStartDate } },
              { endDate: { $gt: bookingEndDate } }
            ]
          }
        ]
      };
    }
    
    const overlappingBookings = await Booking.find(overlapQuery);
    
    if (overlappingBookings.length > 0) {
      console.log(`Found ${overlappingBookings.length} overlapping bookings of the same type`);
      return NextResponse.json({ 
        success: false, 
        message: `The selected dates are not available. There ${overlappingBookings.length === 1 ? 'is' : 'are'} already ${overlappingBookings.length} booking(s) that overlap with your requested dates.` 
      }, { status: 409 }); // Conflict status code
    }
    
    // For villa bookings, also check if there are pool bookings on any dates except the end date
    // This section is now redundant since we check for ALL dates above, but keeping for backward compatibility
    if (rentalType === 'villa_pool') {
      // Get all dates between start and end date except end date
      const datesInBetween = [];
      const currentDate = new Date(bookingStartDate);
      const endDateValue = new Date(bookingEndDate);
      
      // Only check dates from start date to the day before end date
      while (currentDate < endDateValue) {
        datesInBetween.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // If there's at least one date to check
      if (datesInBetween.length > 0) {
        const orConditions = datesInBetween.map(date => ({
          startDate: {
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59, 999))
          }
        }));
        
        const poolConflictQuery = {
          rentalType: 'pool',
          status: { $in: ['approved', 'pending'] },
          $or: orConditions
        };
        
        const conflictingPoolBookings = await Booking.find(poolConflictQuery);
        
        if (conflictingPoolBookings.length > 0) {
          console.log(`Found ${conflictingPoolBookings.length} conflicting pool bookings`);
          return NextResponse.json({ 
            success: false, 
            message: `Villa booking conflicts with existing pool bookings on intermediate dates. Pool bookings are only allowed on end dates.` 
          }, { status: 409 });
        }
      }
    }
    
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
      duration,
      amount,
      details: details || '',
      // If admin creates booking, automatically approve it
      status: user.role === 'admin' ? 'approved' : 'pending'
    });
    
    console.log('Booking created successfully:', booking._id);
    
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