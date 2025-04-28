import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/utils/dbConnect';
import Booking from '../../../lib/models/Booking';
import User from '../../../lib/models/User';
import { authenticateUser } from '../../../lib/utils/auth';
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
    
    // Only admins can access statistics
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'all';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const month = parseInt(searchParams.get('month') || new Date().getMonth());
    const agentId = searchParams.get('agentId');
    const rentalType = searchParams.get('rentalType');
    const daysAgo = parseInt(searchParams.get('daysAgo') || 0);
    const daysAgoEnd = parseInt(searchParams.get('daysAgoEnd') || 0);
    
    // Build date filter for query
    const dateFilter = {};
    const now = new Date();
    
    if (timeFilter === 'year') {
      const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      
      dateFilter.createdAt = {
        $gte: startOfYear,
        $lte: endOfYear
      };
    } else if (timeFilter === 'month') {
      const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      
      dateFilter.createdAt = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    } else if (timeFilter === 'week') {
      const today = now;
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));
      endOfWeek.setHours(23, 59, 59, 999);
      
      dateFilter.createdAt = {
        $gte: startOfWeek,
        $lte: endOfWeek
      };
    } else if (timeFilter === 'custom' && daysAgo > 0) {
      // Custom time range based on days ago
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - daysAgo);
      startDate.setHours(0, 0, 0, 0);
      
      let endDate;
      if (daysAgoEnd > 0 && daysAgoEnd < daysAgo) {
        endDate = new Date(now);
        endDate.setDate(now.getDate() - daysAgoEnd);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = now;
      }
      
      dateFilter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // Add additional filters if provided
    const queryFilter = { ...dateFilter };
    
    if (agentId) {
      queryFilter.agentId = agentId;
    }
    
    if (rentalType) {
      queryFilter.rentalType = rentalType;
    }
    
    console.log('Query filter:', JSON.stringify(queryFilter));
    
    // Get all bookings based on filter
    const allBookings = await Booking.find(queryFilter).sort({ createdAt: -1 });
    
    // Calculate total statistics
    const totalBookings = allBookings.length;
    const approvedBookings = allBookings.filter(booking => booking.status === 'approved').length;
    const pendingBookings = allBookings.filter(booking => booking.status === 'pending').length;
    const rejectedBookings = allBookings.filter(booking => booking.status === 'rejected').length;
    
    // Calculate booking types
    const poolBookings = allBookings.filter(booking => booking.rentalType === 'pool').length;
    const villaBookings = allBookings.filter(booking => booking.rentalType === 'villa_pool').length;
    
    // Calculate revenue by type (only from approved bookings)
    const approvedPoolBookings = allBookings.filter(
      booking => booking.status === 'approved' && booking.rentalType === 'pool'
    );
    const approvedVillaBookings = allBookings.filter(
      booking => booking.status === 'approved' && booking.rentalType === 'villa_pool'
    );
    
    const poolRevenue = approvedPoolBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    const villaRevenue = approvedVillaBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    
    // Calculate total revenue (only from approved bookings)
    const totalRevenue = poolRevenue + villaRevenue;
    
    // Calculate monthly revenue data
    const monthlyRevenue = {};
    
    // If using year filter, group by month, otherwise group by specific periods
    if (timeFilter === 'year') {
      // Initialize all months to 0
      for (let i = 0; i < 12; i++) {
        const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'short' });
        monthlyRevenue[monthName] = 0;
      }
      
      // Sum up revenue by month for the selected year
      allBookings
        .filter(booking => booking.status === 'approved')
        .forEach(booking => {
          const bookingDate = new Date(booking.createdAt);
          if (bookingDate.getFullYear() === year) {
            const monthName = bookingDate.toLocaleString('default', { month: 'short' });
            monthlyRevenue[monthName] += booking.amount || 0;
          }
        });
    } else if (timeFilter === 'month') {
      // Group by days of the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        monthlyRevenue[`${i}`] = 0;
      }
      
      allBookings
        .filter(booking => booking.status === 'approved')
        .forEach(booking => {
          const bookingDate = new Date(booking.createdAt);
          if (bookingDate.getFullYear() === year && bookingDate.getMonth() === month) {
            const dayOfMonth = bookingDate.getDate();
            monthlyRevenue[`${dayOfMonth}`] += booking.amount || 0;
          }
        });
    } else if (timeFilter === 'week') {
      // Group by days of the week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dayNames.forEach(day => {
        monthlyRevenue[day] = 0;
      });
      
      allBookings
        .filter(booking => booking.status === 'approved')
        .forEach(booking => {
          const bookingDate = new Date(booking.createdAt);
          const dayName = dayNames[bookingDate.getDay()];
          monthlyRevenue[dayName] += booking.amount || 0;
        });
    } else {
      // All time or custom - group by last 6 months
      const lastMonths = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        lastMonths.push({
          name: monthName,
          year: d.getFullYear(),
          month: d.getMonth()
        });
        monthlyRevenue[monthName] = 0;
      }
      
      allBookings
        .filter(booking => booking.status === 'approved')
        .forEach(booking => {
          const bookingDate = new Date(booking.createdAt);
          
          // Check if booking is within the last 6 months
          const monthMatch = lastMonths.find(m => 
            m.year === bookingDate.getFullYear() && 
            m.month === bookingDate.getMonth()
          );
          
          if (monthMatch) {
            monthlyRevenue[monthMatch.name] += booking.amount || 0;
          }
        });
    }
    
    // Calculate agent statistics
    const agentBookings = {};
    
    allBookings.forEach(booking => {
      const agentId = booking.agentId?.toString();
      
      if (!agentId) return;
      
      if (!agentBookings[agentId]) {
        agentBookings[agentId] = {
          agentId,
          totalBookings: 0,
          approvedBookings: 0,
          pendingBookings: 0,
          rejectedBookings: 0,
          totalRevenue: 0,
          avgResponseTime: 0,
          // Add rental type breakdown
          poolBookings: 0,
          villaBookings: 0
        };
      }
      
      agentBookings[agentId].totalBookings++;
      
      // Count by rental type
      if (booking.rentalType === 'pool') {
        agentBookings[agentId].poolBookings++;
      } else {
        agentBookings[agentId].villaBookings++;
      }
      
      if (booking.status === 'approved') {
        agentBookings[agentId].approvedBookings++;
        agentBookings[agentId].totalRevenue += booking.amount || 0;
      } else if (booking.status === 'pending') {
        agentBookings[agentId].pendingBookings++;
      } else if (booking.status === 'rejected') {
        agentBookings[agentId].rejectedBookings++;
      }
    });
    
    // Get agent names and emails
    const agentIds = Object.keys(agentBookings);
    const agents = await User.find({ _id: { $in: agentIds } }).select('name email');
    
    // Add agent names and emails to statistics
    const agentStats = Object.values(agentBookings).map(agentStat => {
      const agent = agents.find(a => a._id.toString() === agentStat.agentId);
      
      return {
        ...agentStat,
        agentName: agent ? agent.name : 'Unknown',
        agentEmail: agent ? agent.email : ''
      };
    });
    
    // Sort agents by total revenue (highest first)
    agentStats.sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    // Check for slowest responding agents (pending bookings > 24 hours)
    const slowResponders = agentStats
      .filter(agent => agent.pendingBookings > 0)
      .map(agent => {
        // Find pending bookings for this agent
        const pendingBookings = allBookings.filter(
          booking => booking.agentId?.toString() === agent.agentId && booking.status === 'pending'
        );
        
        // Calculate average time since creation for pending bookings
        const totalHoursPending = pendingBookings.reduce((sum, booking) => {
          const createdAt = new Date(booking.createdAt);
          const hoursPending = Math.round((now - createdAt) / (1000 * 60 * 60));
          return sum + hoursPending;
        }, 0);
        
        const avgResponseTime = Math.round(totalHoursPending / pendingBookings.length);
        
        return {
          ...agent,
          avgResponseTime
        };
      })
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5); // Get top 5 slowest responders
    
    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        approvedBookings,
        pendingBookings,
        rejectedBookings,
        totalRevenue,
        monthlyRevenue,
        agentStats,
        // Add new data
        poolBookings,
        villaBookings,
        poolRevenue,
        villaRevenue,
        slowResponders
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
} 