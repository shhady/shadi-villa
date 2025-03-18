import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import Booking from '../../../../lib/models/Booking';
import User from '../../../../lib/models/User';
import { authenticateUser } from '../../../../lib/utils/auth';

// Get user booking statistics
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
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Determine which user to fetch stats for
    // If admin and userId provided, fetch that user's stats
    // Otherwise, fetch the current user's stats
    const targetUserId = userId || user.userId;
    
    // Security check: Only allow admins or the user themselves to access the stats
    if (targetUserId !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'You do not have permission to access these statistics' 
      }, { status: 403 });
    }
    
    // Check if the user exists
    const userDoc = await User.findById(targetUserId).select('-password');
    
    if (!userDoc) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // Fetch all bookings for the user
    const bookings = await Booking.find({ agentId: targetUserId });
    
    // Calculate statistics
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const approvedBookings = bookings.filter(b => b.status === 'approved').length;
    const rejectedBookings = bookings.filter(b => b.status === 'rejected').length;
    
    // Calculate total amount for all bookings and approved bookings
    const totalAmount = bookings.reduce((sum, booking) => sum + booking.amount, 0);
    const approvedAmount = bookings
      .filter(b => b.status === 'approved')
      .reduce((sum, booking) => sum + booking.amount, 0);
    
    // Get booking type breakdown
    const poolBookings = bookings.filter(b => b.rentalType === 'pool').length;
    const villaBookings = bookings.filter(b => b.rentalType === 'villa_pool').length;
    
    // Get monthly data for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    
    // Format date to YYYY-MM
    const formatYearMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return `${year}-${month.toString().padStart(2, '0')}`;
    };
    
    // Initialize monthly data object
    const monthlyData = {};
    
    // Generate all months in range
    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo);
      date.setMonth(sixMonthsAgo.getMonth() + i);
      const yearMonth = formatYearMonth(date);
      monthlyData[yearMonth] = { count: 0, amount: 0 };
    }
    
    // Populate monthly data
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.createdAt);
      if (bookingDate >= sixMonthsAgo) {
        const yearMonth = formatYearMonth(bookingDate);
        if (monthlyData[yearMonth]) {
          monthlyData[yearMonth].count += 1;
          monthlyData[yearMonth].amount += booking.amount;
        }
      }
    });
    
    // Get recent bookings (limit to 5)
    const recentBookings = await Booking.find({ agentId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Format recent bookings for response
    const formattedRecentBookings = recentBookings.map(booking => ({
      _id: booking._id,
      guestName: booking.guestName,
      rentalType: booking.rentalType,
      startDate: booking.startDate,
      endDate: booking.endDate,
      amount: booking.amount,
      status: booking.status,
      createdAt: booking.createdAt
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: userDoc._id,
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role
        },
        stats: {
          totalBookings,
          pendingBookings,
          approvedBookings,
          rejectedBookings,
          totalAmount,
          approvedAmount,
          poolBookings,
          villaBookings
        },
        monthlyData,
        recentBookings: formattedRecentBookings
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
} 