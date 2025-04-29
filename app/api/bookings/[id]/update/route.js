import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/utils/dbConnect';
import Booking from '../../../../../lib/models/Booking';
import { authenticateUser } from '../../../../../lib/utils/auth';

export const dynamic = 'force-dynamic';

// Log request details for debugging
const logRequestDetails = (request, method, id) => {
  console.log(`${method} /api/bookings/${id}/update - Request received`);
  
  // Log headers for debugging
  console.log('Headers:', Array.from(request.headers.entries())
    .filter(([key]) => !key.toLowerCase().includes('authorization'))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {})
  );
};

// Update booking details
export async function PATCH(request, { params }) {
  const { id } = await params;
  
  // Log request details
  logRequestDetails(request, 'PATCH', id);
  
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
    

    // Get booking by ID
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json({ 
        success: false, 
        message: `Booking with ID ${id} not found` 
      }, { status: 404 });
    }
    
    // Check authorization: Admins can update any booking, agents can only update their own
    if (user.role !== 'admin' && booking.agentId.toString() !== user.userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'You are not authorized to update this booking' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      guestName,
      phoneNumber,
      adults,
      children,
      startDate,
      endDate,
      duration,
      amount,
      details
    } = body;
    
    // Update booking with new data
    const updatedBooking = {};
    
    // Only update fields that were provided
    if (guestName !== undefined) updatedBooking.guestName = guestName;
    if (phoneNumber !== undefined) updatedBooking.phoneNumber = phoneNumber;
    if (adults !== undefined) updatedBooking.adults = adults;
    if (children !== undefined) updatedBooking.children = children;
    if (startDate !== undefined) updatedBooking.startDate = new Date(startDate);
    if (endDate !== undefined) updatedBooking.endDate = new Date(endDate);
    if (duration !== undefined) updatedBooking.duration = duration;
    if (amount !== undefined) updatedBooking.amount = amount;
    if (details !== undefined) updatedBooking.details = details;
    
    // Update booking
    const result = await Booking.findByIdAndUpdate(
      id,
      updatedBooking,
      { new: true, runValidators: true }
    );
    
    
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: result
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
} 