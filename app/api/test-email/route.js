import { NextResponse } from 'next/server';
import { sendTestEmail } from '../../../lib/utils/mailer';
export const dynamic = 'force-dynamic';

/**
 * Test email endpoint to verify email functionality
 * Accessible at /api/test-email
 * 
 * For security, this should be disabled in production or protected with authentication
 */
export async function GET(request) {
  try {
    // Get the test recipient from query parameters
    const { searchParams } = new URL(request.url);
    const recipient = searchParams.get('email');
    
    // Log environment variables (without exposing passwords)
    console.log('Email environment variables check:', {
      SMTP_HOST: process.env.SMTP_HOST ? 'Set' : 'Missing',
      SMTP_PORT: process.env.SMTP_PORT ? 'Set' : 'Missing',
      SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Missing',
      SMTP_PASS: process.env.SMTP_PASS ? (process.env.SMTP_PASS.length > 0 ? 'Set' : 'Empty') : 'Missing',
      SMTP_FROM: process.env.SMTP_FROM ? 'Set' : 'Missing',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'Set' : 'Missing',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    });
    
    // Send a test email
    const result = await sendTestEmail(recipient);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully${recipient ? ' to ' + recipient : ''}. Check your inbox and spam folder.`
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test email. Check server logs for details.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test email error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error'),
      error: error.toString(),
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
} 