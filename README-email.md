# Email Notifications in Villa App

This guide explains how the email notification system works in the Villa App and how to configure it for your environment.

## Overview

The application sends automated email notifications for the following events:

1. **User Creation**: When an admin creates a new user account, a welcome email is sent to the user.
2. **Booking Creation**: When a booking is created, a confirmation email is sent to the agent.
3. **Booking Status Updates**: When a booking's status changes (approved, rejected, pending), an email notification is sent to the agent.

**Note:** The administrator email (configured as ADMIN_EMAIL) will receive a copy of user creation and booking creation emails as a BCC recipient, but will NOT receive copies of booking status change notifications. This ensures that the administrator is informed of important system activities without being overwhelmed by status update notifications.

## Setup Requirements

### 1. Dependencies

The email system uses Nodemailer, which is included in the `package.json`. Make sure to install it:

```bash
npm install
# or
yarn
```

### 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```
# SMTP Configuration for emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Villa App <your-email@gmail.com>"

# Admin email to receive copies of certain notifications
ADMIN_EMAIL=admin@example.com
```

If `ADMIN_EMAIL` is not specified, the system will default to using `sleem.shadi@gmail.com` as the administrator email.

### 3. Using Gmail

If you're using Gmail as your SMTP provider:

1. Enable 2-Step Verification for your Google account
2. Generate an App Password:
   - Go to your Google Account > Security
   - Under "Signing in to Google," select App passwords
   - Create a new app password for "Mail" and "Other (Custom name)"
   - Use this generated password as your `SMTP_PASS`

### 4. Testing Emails

To test if emails are sending correctly:

1. Create a new user account (admin function)
2. Create a booking
3. Update a booking's status

Check the console logs for confirmation of email sending or any errors.

## Troubleshooting

If emails are not being sent:

1. Check the server logs for any error messages
2. Verify your SMTP credentials are correct
3. Ensure your SMTP provider allows sending from your application
4. Check spam/junk folders for test emails

## Email Templates

The email templates are defined in the `lib/utils/mailer.js` file. You can modify these templates to customize the email content.

### Available Email Functions

- `sendWelcomeEmail(user)`: Sends a welcome email to a new user (admin receives a copy)
- `sendBookingConfirmationEmail(booking, user)`: Sends booking confirmation (admin receives a copy)
- `sendBookingStatusUpdateEmail(booking, user, previousStatus)`: Sends status update notifications (admin does NOT receive a copy)

## Error Handling

The email system is designed to fail gracefully if emails cannot be sent. Errors are logged to the console, but they don't interrupt the main application flow. This ensures that the core functionality (user registration, booking, etc.) continues to work even if email sending fails. 