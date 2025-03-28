# Shadi Villa - Daily Villa & Pool Rental Management System

A web-based platform for managing daily villa and pool rentals. This system includes authentication, booking management, and an approval process.

## Features

- **Authentication System**: User signup, login with JWT
- **Role-Based Access Control**: Admin and Agent roles
- **Booking Management**: Create, view, update, and delete bookings
- **Calendar View**: See availability and make reservations
- **Admin Approval Workflow**: Approve or reject bookings with reasons
- **User Management**: Admin can manage user accounts

## Tech Stack

- **Frontend**: React.js (Next.js) with TailwindCSS
- **Backend**: Node.js + Express (API routes)
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt password encryption

## Prerequisites

- Node.js (v14+)
- MongoDB (local or MongoDB Atlas)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env.local` file based on `.env.local` template
   - Add your MongoDB connection string and JWT secret

4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app`: Next.js App Router components and routes
- `/app/api`: API routes (Backend)
- `/app/components`: Reusable components
- `/app/(auth)`: Authentication pages (login/register)
- `/app/dashboard`: Admin and Agent dashboards
- `/lib/models`: Mongoose models
- `/lib/controllers`: API controllers
- `/lib/middlewares`: Authentication middlewares
- `/lib/utils`: Utility functions

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login and generate JWT token
- `GET /api/auth/me`: Get current user profile

### Bookings
- `GET /api/bookings`: List all bookings
- `POST /api/bookings`: Create a new booking
- `GET /api/bookings/:id`: Get a specific booking
- `PATCH /api/bookings/:id`: Update booking status
- `DELETE /api/bookings/:id`: Delete a booking
- `GET /api/bookings/available`: Get available dates

### Users (Admin only)
- `GET /api/users`: List all users
- `POST /api/users`: Create a new user
- `GET /api/users/:id`: Get a specific user
- `PATCH /api/users/:id`: Update a user
- `DELETE /api/users/:id`: Delete a user

## License

[MIT](https://choosealicense.com/licenses/mit/)
#   s h a d i - v i l l a  
 