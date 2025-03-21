import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import Booking from '../../../../lib/models/Booking';
import { authenticateUser } from '../../../../lib/utils/auth';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get all approved and pending bookings (because pending could become approved)
    const bookings = await Booking.find({ 
      status: { $in: ['approved', 'pending'] }
    }).select('startDate endDate rentalType status');
    
    console.log(`Found ${bookings.length} bookings (approved or pending)`);
    
    // Group bookings by rental type
    // For pool, only pool bookings make the pool unavailable
    const poolBookings = bookings.filter(booking => 
      booking.rentalType === 'pool'
    );
    
    // For villa, only villa_pool bookings make the villa unavailable
    const villaBookings = bookings.filter(booking => 
      booking.rentalType === 'villa_pool'
    );
    
    console.log(`Pool bookings: ${poolBookings.length}, Villa bookings: ${villaBookings.length}`);
    
    // Extract start dates from villa bookings (to prevent pool bookings on these dates)
    const villaStartDates = villaBookings.map(booking => {
      const date = new Date(booking.startDate);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    });
    
    // NEW: Extract end dates from villa bookings (to allow new bookings to start on these dates)
    const villaEndDates = villaBookings.map(booking => {
      const date = new Date(booking.endDate);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    });
    
    // Convert bookings to unavailable dates (including villa dates for pool availability)
    // For pool bookings, we need to consider:
    // 1. All pool booking dates
    // 2. All villa booking dates except end dates (new bookings can start on end dates)
    const poolUnavailableDates = [
      ...getUnavailableDatesFromBookings(poolBookings),
      ...getUnavailableDatesFromBookings(villaBookings, false) // Don't include end dates for villa bookings
    ];
    
    // For villa bookings, we don't include end dates (new bookings can start on end dates)
    const villaUnavailableDates = getUnavailableDatesFromBookings(villaBookings, false);
    
    console.log(`Unavailable pool dates: ${poolUnavailableDates.length}`);
    console.log(`Unavailable villa dates: ${villaUnavailableDates.length}`);
    console.log(`Villa start dates: ${villaStartDates.length}`);
    console.log(`Villa end dates: ${villaEndDates.length}`);
    
    return NextResponse.json({
      success: true,
      data: {
        poolUnavailableDates,
        villaUnavailableDates,
        villaStartDates,
        villaEndDates // Add villa end dates to response
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Available dates error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
}

// Helper function to get unavailable dates from bookings
function getUnavailableDatesFromBookings(bookings, includeEndDate = false) {
  const unavailableDates = [];
  
  bookings.forEach(booking => {
    // Create new Date objects to avoid mutation issues
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    
    // For pool bookings, we need to handle start and end date the same
    // Since it's a single day booking
    if (booking.rentalType === 'pool') {
      // Normalize to start of day in UTC to avoid timezone issues
      const poolDate = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        0, 0, 0, 0
      ));
      unavailableDates.push(poolDate.toISOString());
      return; // Skip the rest of the logic for pool bookings
    }
    
    // Reset hours to ensure comparisons are date-only (in UTC)
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    
    // For villa bookings, add all dates between start and end (optionally excluding end date)
    const current = new Date(start);
    
    while (current < end || (includeEndDate && current.getTime() === end.getTime())) {
      // Add current date to unavailable dates (as ISO string for consistent comparison)
      unavailableDates.push(current.toISOString());
      
      // Increment date by one day by creating a new Date object (to avoid mutation)
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);
      current.setTime(nextDay.getTime());
    }
  });
  
  // Remove duplicate dates (can happen when multiple bookings include the same day)
  return [...new Set(unavailableDates)].map(dateString => new Date(dateString));
} 