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
  phoneNumber: {
    type: String,
    required: [true, 'Please provide phone number'],
    trim: true
  },
  adults: {
    type: Number,
    required: [true, 'Please provide number of adults'],
    min: [1, 'There must be at least 1 adult']
  },
  children: {
    type: Number,
    default: 0,
    min: [0, 'Children count cannot be negative']
  },
  guestCount: {
    type: Number,
    required: [true, 'Please provide total number of guests'],
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
  details: {
    type: String,
    default: ''
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
    
    // For pool rentals, end date must be exactly one day after start date
    if (this.rentalType === 'pool') {
      // Create a date that is one day after start date for comparison
      const oneDayAfterStart = new Date(normalizedStartDate);
      oneDayAfterStart.setDate(oneDayAfterStart.getDate() + 1);
      
      // Compare that the end date is exactly one day after
      if (normalizedEndDate.getTime() !== oneDayAfterStart.getTime()) {
        this.invalidate('endDate', 'Pool bookings must be for exactly one day');
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