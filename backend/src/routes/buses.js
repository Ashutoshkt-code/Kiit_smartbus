const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all buses
router.get('/', async (req, res) => {
  try {
    const { status, destination, limit = 50, page = 1 } = req.query;
    
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (destination) filter.destination = destination;
    
    const buses = await Bus.find(filter)
      .populate('driverId', 'name phone')
      .populate('route', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ lastUpdated: -1 });
    
    const total = await Bus.countDocuments(filter);
    
    res.json({
      buses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bus by ID
router.get('/:id', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('driverId', 'name phone email')
      .populate('route', 'name stops');
    
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    res.json(bus);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new bus
router.post('/', [
  auth,
  body('busNumber').notEmpty().withMessage('Bus number is required'),
  body('driverId').isMongoId().withMessage('Valid driver ID is required'),
  body('capacity').isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1 and 100'),
  body('destination').isIn(['Campus 25', 'Campus 6', 'Campus 15', 'Main Campus', 'Other']).withMessage('Invalid destination')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { busNumber, driverId, capacity, destination, route } = req.body;
    
    // Check if bus number already exists
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({ error: 'Bus number already exists' });
    }
    
    // Check if driver exists and is a driver
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({ error: 'Invalid driver ID' });
    }
    
    // Set initial location (can be updated later)
    const initialLocation = {
      type: 'Point',
      coordinates: [85.8189, 20.2961] // Default KIIT coordinates
    };
    
    const bus = new Bus({
      busNumber,
      driverId,
      capacity,
      destination,
      route,
      currentLocation: initialLocation
    });
    
    await bus.save();
    
    // Update driver's assigned bus
    await User.findByIdAndUpdate(driverId, { assignedBus: bus._id });
    
    const populatedBus = await Bus.findById(bus._id)
      .populate('driverId', 'name phone')
      .populate('route', 'name');
    
    res.status(201).json(populatedBus);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bus location
router.put('/:id/location', [
  auth,
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be positive'),
  body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be between 0 and 360')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { latitude, longitude, speed = 0, heading = 0 } = req.body;
    const busId = req.params.id;
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    // Check if user is the driver of this bus
    if (req.user.role === 'driver' && bus.driverId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this bus location' });
    }
    
    await bus.updateLocation(latitude, longitude, speed, heading);
    
    // Emit real-time update via Socket.io
    const { io } = require('../server');
    io.to(`bus-${busId}`).emit('bus-location-updated', {
      busId,
      location: { latitude, longitude },
      speed,
      heading,
      timestamp: new Date()
    });
    
    res.json({ message: 'Location updated successfully', bus });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bus status
router.put('/:id/status', [
  auth,
  body('status').isIn(['active', 'inactive', 'maintenance', 'offline']).withMessage('Invalid status'),
  body('seatAvailability').isIn(['Empty', 'Few Seats', 'Full']).withMessage('Invalid seat availability'),
  body('currentPassengers').optional().isInt({ min: 0 }).withMessage('Current passengers must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { status, seatAvailability, currentPassengers, destination, notes } = req.body;
    const busId = req.params.id;
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    // Check if user is the driver of this bus
    if (req.user.role === 'driver' && bus.driverId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this bus status' });
    }
    
    const updateData = { status, seatAvailability };
    if (currentPassengers !== undefined) updateData.currentPassengers = currentPassengers;
    if (destination) updateData.destination = destination;
    if (notes) updateData.notes = notes;
    
    Object.assign(bus, updateData);
    bus.lastUpdated = new Date();
    await bus.save();
    
    // Emit real-time update via Socket.io
    const { io } = require('../server');
    io.to(`bus-${busId}`).emit('bus-status-updated', {
      busId,
      status,
      seatAvailability,
      currentPassengers: bus.currentPassengers,
      destination: bus.destination,
      timestamp: new Date()
    });
    
    res.json({ message: 'Status updated successfully', bus });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get nearby buses
router.get('/nearby/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000 } = req.query;
    const coordinates = [parseFloat(longitude), parseFloat(latitude)];
    
    const nearbyBuses = await Bus.findNearby(coordinates, parseInt(maxDistance));
    
    res.json({
      location: { latitude, longitude },
      maxDistance: parseInt(maxDistance),
      buses: nearbyBuses
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get buses by destination
router.get('/destination/:destination', async (req, res) => {
  try {
    const { destination } = req.params;
    const { status = 'active' } = req.query;
    
    const buses = await Bus.find({
      destination,
      status,
      isActive: true
    })
    .populate('driverId', 'name phone')
    .populate('route', 'name')
    .sort({ lastUpdated: -1 });
    
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete bus (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    // Only admins can delete buses
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    bus.isActive = false;
    await bus.save();
    
    res.json({ message: 'Bus deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 