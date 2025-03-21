import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import Booking from '../../../../lib/models/Booking';
import { authenticateUser, getTokenFromHeaders } from '../../../../lib/utils/auth';
export const dynamic = 'force-dynamic';

// Helper function to log headers and extract token
const logRequestDetails = (request, method, id) => {
  console.log(`${method} /api/bookings/${id} - Request received`);
  try {
    const token = getTokenFromHeaders(request);
    console.log('API Route - Token extracted:', token ? 'Yes, length: ' + token.length : 'No');
    return token;
  } catch (error) {
    console.error('Error extracting token:', error);
    return null;
  }
};

// Get booking by ID
export async function GET(request, { params }) {
  const { id } = await params;
  
  // Log request details
  logRequestDetails(request, 'GET', id);
  
  try {
    await dbConnect();
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      console.log(`GET /api/bookings/${id} - Authentication failed`);
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get booking
    const booking = await Booking.findById(id);
    
    if (!booking) {
      console.log(`GET /api/bookings/${id} - Booking not found`);
      return NextResponse.json({ 
        success: false, 
        message: `Booking with ID ${id} not found` 
      }, { status: 404 });
    }
    
    // Check authorization: Admins can see all bookings, agents can only see their own
    if (user.role !== 'admin' && booking.agentId.toString() !== user.userId) {
      console.log(`GET /api/bookings/${id} - Authorization failed: User is not admin and not the owner`);
      return NextResponse.json({ 
        success: false, 
        message: 'You are not authorized to view this booking' 
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: true,
      data: booking
    }, { status: 200 });
    
  } catch (error) {
    console.error(`GET /api/bookings/${id} - Error:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
}

// Update booking status (approve/reject)
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Only admins can update booking status
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Only admins can update booking status' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { status, rejectionReason } = body;
    
    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Please provide a valid status (approved/rejected)' 
      }, { status: 400 });
    }
    
    // If rejecting, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json({ 
        success: false, 
        message: 'Rejection reason is required' 
      }, { status: 400 });
    }
    
    // Find and update booking
    const booking = await Booking.findByIdAndUpdate(
      id,
      { 
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : ''
      },
      { new: true, runValidators: true }
    );
    
    if (!booking) {
      return NextResponse.json({ 
        success: false, 
        message: 'Booking not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Booking ${status} successfully`,
      data: booking
    }, { status: 200 });
    
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

// Delete booking
export async function DELETE(request, { params }) {
  const { id } = await params;
  
  // Log request details
  logRequestDetails(request, 'DELETE', id);
  
  try {
    await dbConnect();
    
    // Authenticate user
    const user = authenticateUser(request);
    
    if (!user) {
      console.log(`DELETE /api/bookings/${id} - Authentication failed`);
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get booking
    const booking = await Booking.findById(id);
    
    if (!booking) {
      console.log(`DELETE /api/bookings/${id} - Booking not found`);
      return NextResponse.json({ 
        success: false, 
        message: `Booking with ID ${id} not found` 
      }, { status: 404 });
    }
    
    // Check authorization: Admins can delete any booking, agents can only delete their own
    if (user.role !== 'admin' && booking.agentId.toString() !== user.userId) {
      console.log(`DELETE /api/bookings/${id} - Authorization failed: User is not admin and not the owner`);
      return NextResponse.json({ 
        success: false, 
        message: 'You are not authorized to delete this booking' 
      }, { status: 403 });
    }
    
    // For non-rejected bookings, additional authorization checks
    if (booking.status !== 'rejected' && user.role !== 'admin') {
      console.log(`DELETE /api/bookings/${id} - Authorization failed: Non-admin can only delete rejected bookings`);
      return NextResponse.json({ 
        success: false, 
        message: 'Agents can only delete rejected bookings. Please contact admin for other cases.' 
      }, { status: 403 });
    }
    
    // Delete booking
    await Booking.findByIdAndDelete(id);
    
    console.log(`DELETE /api/bookings/${id} - Booking deleted successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error(`DELETE /api/bookings/${id} - Error:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
} 