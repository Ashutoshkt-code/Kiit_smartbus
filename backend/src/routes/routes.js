const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Route Schema
const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  stops: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    estimatedTime: {
      type: Number, // minutes from start
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  estimatedDuration: {
    type: Number, // minutes
    required: true,
    min: 1
  },
  distance: {
    type: Number, // kilometers
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  schedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    departures: [{
      time: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }]
  }],
  capacity: {
    type: Number,
    default: 50,
    min: 1
  },
  fare: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for geospatial queries
routeSchema.index({ startLocation: '2dsphere', endLocation: '2dsphere' });
routeSchema.index({ 'stops.location': '2dsphere' });

const Route = mongoose.model('Route', routeSchema);

// Get all routes
router.get('/', async (req, res) => {
  try {
    const { isActive, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const routes = await Route.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ name: 1 });
    
    const total = await Route.countDocuments(filter);
    
    res.json({
      routes,
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

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new route (admin only)
router.post('/', [
  adminAuth,
  body('name').notEmpty().withMessage('Route name is required'),
  body('startLocation.coordinates').isArray({ min: 2, max: 2 }).withMessage('Start location coordinates are required'),
  body('endLocation.coordinates').isArray({ min: 2, max: 2 }).withMessage('End location coordinates are required'),
  body('estimatedDuration').isInt({ min: 1 }).withMessage('Estimated duration must be positive'),
  body('distance').isFloat({ min: 0 }).withMessage('Distance must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      startLocation,
      endLocation,
      stops,
      estimatedDuration,
      distance,
      schedule,
      capacity,
      fare
    } = req.body;

    // Check if route name already exists
    const existingRoute = await Route.findOne({ name });
    if (existingRoute) {
      return res.status(400).json({ error: 'Route name already exists' });
    }

    const route = new Route({
      name,
      description,
      startLocation,
      endLocation,
      stops: stops || [],
      estimatedDuration,
      distance,
      schedule: schedule || [],
      capacity: capacity || 50,
      fare: fare || 0
    });

    await route.save();

    res.status(201).json({
      message: 'Route created successfully',
      route
    });
  } catch (error) {
    console.error('Route creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update route (admin only)
router.put('/:id', [
  adminAuth,
  body('name').optional().notEmpty().withMessage('Route name cannot be empty'),
  body('estimatedDuration').optional().isInt({ min: 1 }).withMessage('Estimated duration must be positive'),
  body('distance').optional().isFloat({ min: 0 }).withMessage('Distance must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const allowedUpdates = [
      'name', 'description', 'startLocation', 'endLocation', 'stops',
      'estimatedDuration', 'distance', 'schedule', 'capacity', 'fare', 'isActive'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Check for name conflicts
    if (updates.name && updates.name !== route.name) {
      const existingRoute = await Route.findOne({ name: updates.name });
      if (existingRoute) {
        return res.status(400).json({ error: 'Route name already exists' });
      }
    }

    const updatedRoute = await Route.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Route updated successfully',
      route: updatedRoute
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete route (admin only) - soft delete
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    route.isActive = false;
    await route.save();

    res.json({ message: 'Route deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get routes by campus
router.get('/campus/:campus', async (req, res) => {
  try {
    const { campus } = req.params;
    
    // Define campus coordinates (approximate KIIT campus locations)
    const campusCoordinates = {
      'Main Campus': [85.8189, 20.2961],
      'Campus 6': [85.8200, 20.2950],
      'Campus 15': [85.8170, 20.2970],
      'Campus 25': [85.8250, 20.3000]
    };

    const campusLocation = campusCoordinates[campus];
    if (!campusLocation) {
      return res.status(400).json({ error: 'Invalid campus' });
    }

    // Find routes that start or end near this campus
    const routes = await Route.find({
      isActive: true,
      $or: [
        {
          startLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: campusLocation
              },
              $maxDistance: 2000 // 2km radius
            }
          }
        },
        {
          endLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: campusLocation
              },
              $maxDistance: 2000 // 2km radius
            }
          }
        }
      ]
    }).sort({ name: 1 });

    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get routes between two campuses
router.get('/between/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    
    // Define campus coordinates
    const campusCoordinates = {
      'Main Campus': [85.8189, 20.2961],
      'Campus 6': [85.8200, 20.2950],
      'Campus 15': [85.8170, 20.2970],
      'Campus 25': [85.8250, 20.3000]
    };

    const fromLocation = campusCoordinates[from];
    const toLocation = campusCoordinates[to];

    if (!fromLocation || !toLocation) {
      return res.status(400).json({ error: 'Invalid campus names' });
    }

    // Find routes that connect these campuses
    const routes = await Route.find({
      isActive: true,
      $and: [
        {
          startLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: fromLocation
              },
              $maxDistance: 2000
            }
          }
        },
        {
          endLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: toLocation
              },
              $maxDistance: 2000
            }
          }
        }
      ]
    }).sort({ estimatedDuration: 1 });

    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get route schedule
router.get('/:id/schedule', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).select('schedule name');
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json({
      routeName: route.name,
      schedule: route.schedule
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update route schedule (admin only)
router.put('/:id/schedule', [
  adminAuth,
  body('schedule').isArray().withMessage('Schedule must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    route.schedule = req.body.schedule;
    await route.save();

    res.json({
      message: 'Route schedule updated successfully',
      schedule: route.schedule
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 