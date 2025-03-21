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
      // For pool bookings, check if this date is specifically an end date of a villa booking
      const normalizedDate = new Date(new Date(bookingStartDate).setHours(0, 0, 0, 0));
      const isEndDateOfVillaBooking = await Booking.findOne({
        rentalType: 'villa_pool',
        status: { $in: ['approved', 'pending'] },
        endDate: normalizedDate
      });
      
      // If it's an end date of a villa booking, allow it (no conflict)
      if (isEndDateOfVillaBooking) {
        console.log('Allowing pool booking on villa checkout day');
        // Skip further conflict checks - this is explicitly allowed
      } else {
        // For pool bookings (single day), check for exact date matches
        overlapQuery = {
          // Only consider approved and pending bookings
          status: { $in: ['approved', 'pending'] },
          // Check if another pool booking exists for this exact day
          rentalType: 'pool',
          // Since pool bookings are for a single day, just check if any booking has this date
          startDate: {
            $gte: new Date(new Date(bookingStartDate).setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(bookingStartDate).setHours(23, 59, 59, 999))
          }
        };
        
        // Exclude the current booking itself when checking for overlaps (for updates)
        if (request.headers.get('x-booking-id')) {
          overlapQuery._id = { $ne: request.headers.get('x-booking-id') };
        }
        
        const overlappingBookings = await Booking.find(overlapQuery);
        
        if (overlappingBookings.length > 0) {
          console.log(`Found ${overlappingBookings.length} overlapping pool bookings`);
          return NextResponse.json({ 
            success: false, 
            message: `The selected date is not available. There ${overlappingBookings.length === 1 ? 'is' : 'are'} already ${overlappingBookings.length} pool booking(s) for this date.` 
          }, { status: 409 }); // Conflict status code
        }
        
        // Check if date is part of a villa booking (except end date)
        const normalizedDate = new Date(new Date(bookingStartDate).setHours(0, 0, 0, 0));
        const villaCheck = await Booking.findOne({
          rentalType: 'villa_pool',
          status: { $in: ['approved', 'pending'] },
          startDate: { $lte: normalizedDate },
          endDate: { $gt: normalizedDate } // Note: this excludes exact end date matches
        });
        
        if (villaCheck) {
          console.log(`Pool booking date conflicts with villa booking ${villaCheck._id}`);
          return NextResponse.json({ 
            success: false, 
            message: 'Pool bookings are not allowed on dates reserved for villa bookings, except checkout days.' 
          }, { status: 409 });
        }
      }
    } else {
      // For villa_pool bookings, also check for any existing pool bookings on any dates within our range
      if (rentalType === 'villa_pool') {
        // Check for any pool bookings that fall within our date range (excluding the end date)
        const poolConflictQuery = {
          rentalType: 'pool',
          status: { $in: ['approved', 'pending'] },
          // Find pool bookings where the date falls within our range
          startDate: {
            $gte: new Date(new Date(bookingStartDate).setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(bookingEndDate).setHours(0, 0, 0, 0)) // Exclude end date
          }
        };
        
        // Exclude the current booking itself (for updates)
        if (request.headers.get('x-booking-id')) {
          poolConflictQuery._id = { $ne: request.headers.get('x-booking-id') };
        }
        
        const conflictingPoolBookings = await Booking.find(poolConflictQuery);
        
        if (conflictingPoolBookings.length > 0) {
          console.log(`Found ${conflictingPoolBookings.length} conflicting pool bookings`);
          return NextResponse.json({ 
            success: false, 
            message: `Villa booking conflicts with existing pool bookings. There are ${conflictingPoolBookings.length} pool booking(s) on your requested dates.` 
          }, { status: 409 });
        }
        
        // For villa_pool bookings, check for any overlapping villa bookings
        const villaOverlapQuery = {
          // Only consider approved and pending bookings
          status: { $in: ['approved', 'pending'] },
          // Only check for villa bookings overlap
          rentalType: 'villa_pool',
          // Check for date overlap with any existing booking
          $and: [
            // Make sure the booking's start date is before our end date
            { startDate: { $lt: new Date(bookingEndDate) } },
            // Make sure the booking's end date is after our start date
            // But allow bookings to start on another booking's end date
            // by using $gt instead of $gte
            { endDate: { $gt: new Date(bookingStartDate) } }
          ]
        };
        
        // Exclude the current booking itself when checking for overlaps (important for updates)
        if (request.headers.get('x-booking-id')) {
          villaOverlapQuery._id = { $ne: request.headers.get('x-booking-id') };
        }
        
        // Log the query to help with debugging
        console.log('Villa overlap query:', JSON.stringify(villaOverlapQuery));
        
        const overlappingVillaBookings = await Booking.find(villaOverlapQuery);
        
        if (overlappingVillaBookings.length > 0) {
          console.log(`Found ${overlappingVillaBookings.length} overlapping villa bookings:`, 
            overlappingVillaBookings.map(b => ({
              id: b._id,
              start: b.startDate,
              end: b.endDate
            }))
          );
          return NextResponse.json({ 
            success: false, 
            message: `The selected dates are not available. There ${overlappingVillaBookings.length === 1 ? 'is' : 'are'} already ${overlappingVillaBookings.length} booking(s) that overlap with your requested dates.` 
          }, { status: 409 }); // Conflict status code
        }
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
    
    console.log('Booking created successfully:', {
      id: booking._id,
      guestName: booking.guestName,
      rentalType: booking.rentalType,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
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