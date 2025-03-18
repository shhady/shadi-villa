import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import User from '../../../../lib/models/User';
import { generateToken } from '../../../../lib/utils/auth';

export async function POST(request) {
  try {
    await dbConnect();
    
    // Parse request body
    const body = await request.json();
    const { email, password } = body;
    
    console.log('Login attempt for email:', email);
    
    // Check if email and password are provided
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Please provide email and password' 
      }, { status: 400 });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      console.log('User not found:', email);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials' 
      }, { status: 401 });
    }
    
    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials' 
      }, { status: 401 });
    }
    
    console.log('Login successful for user:', email);
    
    // Generate JWT token
    const token = generateToken(user._id, user.role);
    
    // Create user object for response (without password)
    const userForResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    };
    
    console.log('Generated token length:', token.length);
    
    // Return user info and token
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: userForResponse
    }, { status: 200 });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during login' 
    }, { status: 500 });
  }
} 