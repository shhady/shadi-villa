import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import User from '../../../../lib/models/User';

export async function POST(request) {
  try {
    await dbConnect();
    
    // Parse request body
    const body = await request.json();
    const { name, email, password, role } = body;
    
    // Check if all required fields are provided
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
    
    // Create new user (Default role is 'agent')
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'agent'
    });
    
    // Return success response (without password)
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ 
        success: false, 
        message: validationErrors.join(', ')
      }, { status: 400 });
    }
    
    // Handle duplicate key errors (usually for email)
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email already in use'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during registration' 
    }, { status: 500 });
  }
} 