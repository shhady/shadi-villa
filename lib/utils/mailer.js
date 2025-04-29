import nodemailer from 'nodemailer';

// Create reusable transporter using SMTP transport
let transporter = null;

// Initialize the transporter with more detailed logging for Vercel
const initTransporter = () => {
  try {
    // If transporter already exists, return it
    if (transporter) {
     
      return transporter;
    }

    // Log SMTP configuration (without password)
   

    // Create the transporter with more detailed debug options
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add connection timeout settings for Vercel
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000, // 10 seconds
      debug: process.env.NODE_ENV !== 'production', // Enable debug in non-production
      logger: process.env.NODE_ENV !== 'production', // Enable logging in non-production
    });
    
    // Verify transporter connection
    
    
    return transporter;
  } catch (error) {
    console.error('Error initializing email transporter:', error);
    console.error('SMTP Configuration: ', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
    });
    return null;
  }
};

/**
 * Sends an email using the configured SMTP settings
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} [options.html] - Optional HTML email body
 * @param {boolean} [options.bccAdmin] - Whether to BCC the admin email
 * @returns {Promise<boolean>} - Success status
 */
export const sendMail = async (options) => {
  try {
   
    
    // Validate required options
    if (!options.to || !options.subject || !options.text) {
      console.error('Missing required email options (to, subject, text)');
      return false;
    }

    // Check for environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Missing required SMTP configuration environment variables:', {
        SMTP_HOST: process.env.SMTP_HOST ? 'Set' : 'Missing',
        SMTP_PORT: process.env.SMTP_PORT ? 'Set' : 'Missing',
        SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Missing',
        SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Missing',
        SMTP_FROM: process.env.SMTP_FROM ? 'Set' : 'Missing',
      });
      return false;
    }

    // Initialize transporter if not already done
    const emailTransporter = initTransporter();
    
    if (!emailTransporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    // Set up email data
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Villa App" <noreply@villaapp.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || undefined,
    };

    // Add BCC to admin only if explicitly requested
    if (options.bccAdmin) {
      const adminEmail = process.env.ADMIN_EMAIL || 'sleem.shadi@gmail.com';
      mailOptions.bcc = adminEmail;
    }

   

    // Send the email with a timeout
    const sendWithTimeout = async () => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Email sending timed out after 25 seconds'));
        }, 25000); // 25 second timeout for Vercel functions
        
        emailTransporter.sendMail(mailOptions)
          .then(info => {
            clearTimeout(timeoutId);
            resolve(info);
          })
          .catch(err => {
            clearTimeout(timeoutId);
            reject(err);
          });
      });
    };
    
    const info = await sendWithTimeout();
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    
    // More detailed error logging
    if (error.code) {
      console.error(`SMTP Error Code: ${error.code}`);
    }
    if (error.command) {
      console.error(`Failed SMTP Command: ${error.command}`);
    }
    if (error.response) {
      console.error(`SMTP Server Response: ${error.response}`);
    }
    
    return false;
  }
};

/**
 * Sends a welcome email to a new user
 * @param {Object} user - User object containing name and email
 * @returns {Promise<boolean>} - Success status
 */
export const sendWelcomeEmail = async (user) => {
  if (!user || !user.email) {
    console.error('Invalid user object for welcome email');
    return false;
  }

  return sendMail({
    to: user.email,
    subject: 'Welcome to Villa App',
    text: `Hello ${user.name || 'there'},

Your account has been created successfully. You can now log in and start using our platform.

You can access our platform at: https://villac21.vercel.app


Thank you,
The Villa App Team`,
    bccAdmin: true // BCC admin on welcome emails
  });
};

/**
 * Sends a booking confirmation email
 * @param {Object} booking - Booking object with details
 * @param {Object} user - User object containing email
 * @returns {Promise<boolean>} - Success status
 */
export const sendBookingConfirmationEmail = async (booking, user) => {
  if (!booking || !user || !user.email) {
    console.error('Invalid booking or user object for confirmation email');
    return false;
  }

  // Format dates for email
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const startDate = formatDate(booking.startDate);
  const endDate = formatDate(booking.endDate);
  const rentalType = booking.rentalType === 'pool' ? 'Pool Only' : 'Villa + Pool';

  // For the agent who created the booking
  const agentEmailText = `Hi ${user.name || 'there'},

Your booking #${booking._id} has been submitted.

Booking Details:
- Guest Name: ${booking.guestName}
- Rental Type: ${rentalType}
- Check-in: ${startDate}
- Check-out: ${endDate}
- Duration: ${booking.duration} ${booking.duration === 1 ? 'day' : 'days'}
- Amount: ₪${booking.amount}

If you have any questions, please don't hesitate to contact us.

Thank you,
The Villa App Team`;

  // Email for admin (as BCC)
  const adminEmail = process.env.ADMIN_EMAIL || 'sleem.shadi@gmail.com';
  
  // Send email to the agent
  const sent = await sendMail({
    to: user.email,
    subject: 'Booking Submitted',
    text: agentEmailText,
    bccAdmin: false // We'll send a separate email to admin
  });

  // Send a different email to the admin
  if (adminEmail) {
    const adminEmailText = `Hello Admin,

A new booking has been created.

Booking Details:
- Booking ID: ${booking._id}
- Agent: ${user.name || 'Unknown'}
- Guest Name: ${booking.guestName}
- Rental Type: ${rentalType}
- Check-in: ${startDate}
- Check-out: ${endDate}
- Duration: ${booking.duration} ${booking.duration === 1 ? 'day' : 'days'}
- Amount: ₪${booking.amount}
- Status: ${booking.status}

Please review this booking in the admin dashboard.

Thank you,
The Villa App Team`;

    await sendMail({
      to: adminEmail,
      subject: 'New Booking Created',
      text: adminEmailText,
      bccAdmin: false
    });
  }

  return sent;
};

/**
 * Sends a booking status update email
 * @param {Object} booking - Booking object with details
 * @param {Object} user - User object containing email
 * @param {string} previousStatus - Previous booking status
 * @returns {Promise<boolean>} - Success status
 */
export const sendBookingStatusUpdateEmail = async (booking, user, previousStatus) => {
  if (!booking || !user || !user.email) {
    console.error('Invalid booking or user object for status update email');
    return false;
  }

  // Format status for display
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format dates for email
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const startDate = formatDate(booking.startDate);
  const endDate = formatDate(booking.endDate);
  const newStatus = formatStatus(booking.status);
  const oldStatus = formatStatus(previousStatus);

  let additionalInfo = '';
  if (booking.status === 'rejected' && booking.rejectionReason) {
    additionalInfo = `\nReason for rejection: ${booking.rejectionReason}`;
  }

  return sendMail({
    to: user.email,
    subject: 'Booking Status Update',
    text: `Hi ${user.name || 'there'},

Your booking #${booking._id} status has changed from ${oldStatus} to ${newStatus}.${additionalInfo}

Booking Details:
- Guest Name: ${booking.guestName}
- Check-in: ${startDate}
- Check-out: ${endDate}
- Amount: ₪${booking.amount}

If you have any questions about this status change, please contact us.

Thank you,
The Villa App Team`,
    bccAdmin: false // Do NOT BCC admin on status update emails
  });
};

export default {
  sendMail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendBookingStatusUpdateEmail
};

/**
 * A test function to send a test email for verifying the email configuration
 * This can be called from API routes or server-side code for testing purposes
 * 
 * @param {string} testRecipient - Email address to send the test to (optional)
 * @returns {Promise<boolean>} - Success status
 */
export const sendTestEmail = async (testRecipient) => {
  const recipient = testRecipient || process.env.ADMIN_EMAIL || 'sleem.shadi@gmail.com';
  
  try {
    console.log(`Attempting to send test email to ${recipient}...`);
    
    const result = await sendMail({
      to: recipient,
      subject: 'Villa App Email System Test',
      text: `This is a test email from Villa App to verify that the email system is working correctly.

The email was generated at: ${new Date().toISOString()}

If you received this email, the email system is working properly!

Thank you,
Villa App Team`,
      bccAdmin: false
    });
    
    if (result) {
      console.log(`Test email sent successfully to ${recipient}`);
    } else {
      console.error(`Failed to send test email to ${recipient}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
}; 