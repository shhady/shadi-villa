import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/utils/dbConnect';
import Booking from '../../../../../lib/models/Booking';
import User from '../../../../../lib/models/User';
import { authenticateUser, getTokenFromHeaders } from '../../../../../lib/utils/auth';
import { sendBookingStatusUpdateEmail } from '../../../../../lib/utils/mailer';
export const dynamic = 'force-dynamic';

// Helper function to log headers and extract token
const logRequestDetails = (request, method, id) => {
  console.log(`${method} /api/bookings/${id}/status - Request received`);
  try {
    const token = getTokenFromHeaders(request);
    return token;
  } catch (error) {
    console.error('Error extracting token:', error);
    return null;
  }
};

// Update booking status
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
    
    
    // Only admin can update booking status
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Only admin can update booking status' 
      }, { status: 403 });
    }
    
    // Get booking by ID
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json({ 
        success: false, 
        message: `Booking with ID ${id} not found` 
      }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    const { status, rejectionReason } = body;
    
    // Validate status
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid status. Must be pending, approved, or rejected' 
      }, { status: 400 });
    }
    
    // If rejecting, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json({ 
        success: false, 
        message: 'Rejection reason is required when rejecting a booking' 
      }, { status: 400 });
    }
    
    // Current status (for logging)
    const previousStatus = booking.status;
    
    // Check if the status is actually changing
    if (booking.status === status) {
      return NextResponse.json({ 
        success: true, 
        message: `Booking status already set to ${status}`,
        data: booking 
      }, { status: 200 });
    }
    
    // Add booking details for better logging
    const bookingDetails = {
      rentalType: booking.rentalType,
      startDate: booking.startDate.toISOString().split('T')[0],
      endDate: booking.endDate.toISOString().split('T')[0],
      duration: booking.duration
    };

    // Update the booking
    booking.status = status;
    
    // If rejecting, set rejection reason
    if (status === 'rejected') {
      booking.rejectionReason = rejectionReason;
    } else {
      // Clear rejection reason if approving or setting back to pending
      booking.rejectionReason = '';
    }
    
    // Save the updated booking
    await booking.save();
    
    
    // Send status update email to the booking's agent
    try {
      // Get the agent who created the booking
      const agent = await User.findById(booking.agentId).select('name email');
      
      if (agent && agent.email) {
        // Send status update email
        await sendBookingStatusUpdateEmail(booking, agent, previousStatus);
      } else {
        console.log('Could not find agent information for sending email');
      }
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
      // Continue with the status update process even if email fails
    }
    
    let responseMessage = `Booking status updated to ${status}`;
    
    // Add additional message for rejections
    if (status === 'rejected') {
      responseMessage += '. The dates are now available for other bookings.';
    } else if (previousStatus === 'rejected' && status === 'approved') {
      responseMessage += '. Note that this may create conflicts with other bookings if these dates were rebooked.';
    } else if (previousStatus === 'rejected' && status === 'pending') {
      responseMessage += '. Note that this may create conflicts with other bookings if these dates were rebooked.';
    }
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: booking
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
} 