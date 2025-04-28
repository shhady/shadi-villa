import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/utils/dbConnect';
import User from '../../../lib/models/User';
import { authenticateUser } from '../../../lib/utils/auth';
import { sendWelcomeEmail } from '../../../lib/utils/mailer';

// Get all users (admin only)
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
    
    // Only admins can view all users
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 });
    }
    
    // Get all users (excluding password)
    const users = await User.find().select('-password').sort('name');
    
    return NextResponse.json({
      success: true,
      count: users.length,
      data: users
    }, { status: 200 });
    
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

// Create a new user (admin only)
export async function POST(request) {
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
    
    // Only admins can create users
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { name, email, password, role } = body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Please provide all required fields' 
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email already in use' 
      }, { status: 400 });
    }
    
    // Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'agent'
    });
    
    // Send welcome email
    try {
      await sendWelcomeEmail(newUser);
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with the registration process even if email fails
    }
    
    // Return user info (excluding password)
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
} 