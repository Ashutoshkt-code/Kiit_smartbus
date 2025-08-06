const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90.'
      }
    }
  },
  destination: {
    type: String,
    required: true,
    enum: ['Campus 25', 'Campus 6', 'Campus 15', 'Main Campus', 'Other'],
    default: 'Main Campus'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'offline'],
    default: 'inactive'
  },
  seatAvailability: {
    type: String,
    enum: ['Empty', 'Few Seats', 'Full'],
    default: 'Empty'
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 50
  },
  currentPassengers: {
    type: Number,
    default: 0,
    min: 0
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  speed: {
    type: Number,
    default: 0,
    min: 0
  },
  heading: {
    type: Number,
    default: 0,
    min: 0,
    max: 360
  },
  estimatedArrival: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for geospatial queries
busSchema.index({ currentLocation: '2dsphere' });

// Index for common queries
busSchema.index({ status: 1, destination: 1 });
busSchema.index({ driverId: 1 });
busSchema.index({ busNumber: 1 });

// Virtual for available seats
busSchema.virtual('availableSeats').get(function() {
  return this.capacity - this.currentPassengers;
});

// Virtual for occupancy percentage
busSchema.virtual('occupancyPercentage').get(function() {
  return Math.round((this.currentPassengers / this.capacity) * 100);
});

// Method to update location
busSchema.methods.updateLocation = function(latitude, longitude, speed = 0, heading = 0) {
  this.currentLocation.coordinates = [longitude, latitude];
  this.speed = speed;
  this.heading = heading;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update status
busSchema.methods.updateStatus = function(status, seatAvailability, currentPassengers) {
  this.status = status;
  this.seatAvailability = seatAvailability;
  this.currentPassengers = currentPassengers || this.currentPassengers;
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to find nearby buses
busSchema.statics.findNearby = function(coordinates, maxDistance = 5000) {
  return this.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: 'active',
    isActive: true
  }).populate('driverId', 'name phone');
};

// Pre-save middleware to update seat availability based on current passengers
busSchema.pre('save', function(next) {
  if (this.isModified('currentPassengers')) {
    const percentage = (this.currentPassengers / this.capacity) * 100;
    if (percentage === 0) {
      this.seatAvailability = 'Empty';
    } else if (percentage >= 90) {
      this.seatAvailability = 'Full';
    } else {
      this.seatAvailability = 'Few Seats';
    }
  }
  next();
});

module.exports = mongoose.model('Bus', busSchema); 