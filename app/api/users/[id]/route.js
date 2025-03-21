import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/utils/dbConnect';
import User from '../../../../lib/models/User';
import { authenticateUser } from '../../../../lib/utils/auth';

// Get a user by ID
export async function GET(request, { params }) {
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
    
    // Only admins can view other users
    if (user.role !== 'admin' && user.userId !== id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Not authorized to view this user' 
      }, { status: 403 });
    }
    
    // Find user by id (excluding password)
    const userDoc = await User.findById(id).select('-password');
    
    if (!userDoc) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: userDoc
    }, { status: 200 });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

// Update a user
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
    
    // Only admins can update other users
    if (user.role !== 'admin' && user.userId !== id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Not authorized to update this user' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { name, email, role, password } = body;
    
    // Create update object
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    // Only admins can change roles
    if (role && user.role === 'admin') {
      updateData.role = role;
    }
    
    // If password is provided, it will be hashed by the pre-save hook
    if (password) updateData.password = password;
    
    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    }, { status: 200 });
    
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

// Delete a user
export async function DELETE(request, { params }) {
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
    
    // Only admins can delete users
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Not authorized to delete users' 
      }, { status: 403 });
    }
    
    // Find and delete user
    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
} 