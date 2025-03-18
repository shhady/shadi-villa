import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import User from '../../../../lib/models/User';
import { authenticateUser } from '../../../../lib/utils/auth';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Authenticate user from token
    const user = authenticateUser(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Find user in database
    const userDoc = await User.findById(user.userId).select('-password');
    
    if (!userDoc) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // Return user data
    return NextResponse.json({
      success: true,
      data: userDoc
    }, { status: 200 });
    
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
} 