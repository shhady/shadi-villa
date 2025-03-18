import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guestName: {
    type: String,
    required: [true, 'Please provide guest name'],
    trim: true
  },
  guestCount: {
    type: Number,
    required: [true, 'Please provide number of guests'],
    min: [1, 'There must be at least 1 guest']
  },
  rentalType: {
    type: String,
    enum: ['pool', 'villa_pool'],
    required: [true, 'Please specify rental type']
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide end date']
  },
  duration: {
    type: Number,
    required: [true, 'Please provide duration']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide transaction amount']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add validation to ensure end date is after or equal to start date
BookingSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate) {
    // Normalize dates to start of day before comparing
    const normalizedStartDate = new Date(this.startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    
    const normalizedEndDate = new Date(this.endDate);
    normalizedEndDate.setHours(0, 0, 0, 0);
    
    // Check if end date is before start date
    if (normalizedEndDate < normalizedStartDate) {
      this.invalidate('endDate', 'End date must be after or equal to start date');
      return next();
    }
    
    // For pool rentals, start and end date must be the same (single day)
    if (this.rentalType === 'pool') {
      if (normalizedStartDate.getTime() !== normalizedEndDate.getTime()) {
        this.invalidate('endDate', 'Pool bookings must be for a single day only');
      }
    }
    
    // For villa_pool rentals, ensure start and end dates are provided
    if (this.rentalType === 'villa_pool') {
      if (!this.startDate || !this.endDate) {
        this.invalidate('startDate', 'Villa bookings must have both start and end dates');
      }
    }
  }
  next();
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

export default Booking; 