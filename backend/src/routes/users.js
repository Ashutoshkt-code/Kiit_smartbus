const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all users (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { role, campus, limit = 50, page = 1, search } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (campus) filter.campus = campus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { driverId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
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

// Get user by ID (admin only)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('assignedBus', 'busNumber destination status');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', [
  adminAuth,
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'driver', 'admin']).withMessage('Invalid role'),
  body('studentId').optional().notEmpty().withMessage('Student ID is required for students'),
  body('driverId').optional().notEmpty().withMessage('Driver ID is required for drivers'),
  body('department').optional().notEmpty().withMessage('Department is required for students'),
  body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('licenseNumber').optional().notEmpty().withMessage('License number is required for drivers')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      password,
      role,
      studentId,
      driverId,
      department,
      year,
      campus,
      licenseNumber,
      licenseExpiry,
      permissions
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or phone already exists'
      });
    }

    // Validate role-specific fields
    if (role === 'student') {
      if (!studentId || !department || !year) {
        return res.status(400).json({
          error: 'Student ID, department, and year are required for students'
        });
      }
    } else if (role === 'driver') {
      if (!driverId || !licenseNumber) {
        return res.status(400).json({
          error: 'Driver ID and license number are required for drivers'
        });
      }
    }

    // Create user object
    const userData = {
      name,
      email,
      phone,
      password,
      role,
      campus: campus || 'Main Campus'
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
      userData.department = department;
      userData.year = year;
    } else if (role === 'driver') {
      userData.driverId = driverId;
      userData.licenseNumber = licenseNumber;
      if (licenseExpiry) userData.licenseExpiry = licenseExpiry;
    } else if (role === 'admin' && permissions) {
      userData.permissions = permissions;
    }

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', [
  adminAuth,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('role').optional().isIn(['student', 'driver', 'admin']).withMessage('Invalid role'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty'),
  body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('campus').optional().isIn(['Campus 25', 'Campus 6', 'Campus 15', 'Main Campus']).withMessage('Invalid campus'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedUpdates = [
      'name', 'email', 'phone', 'role', 'department', 'year', 
      'campus', 'isActive', 'permissions', 'licenseNumber', 'licenseExpiry'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Check for email/phone conflicts
    if (updates.email || updates.phone) {
      const conflictFilter = {};
      if (updates.email) conflictFilter.email = updates.email;
      if (updates.phone) conflictFilter.phone = updates.phone;
      conflictFilter._id = { $ne: req.params.id };

      const existingUser = await User.findOne(conflictFilter);
      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email or phone already exists'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only) - soft delete
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all drivers
router.get('/drivers/all', async (req, res) => {
  try {
    const drivers = await User.findDrivers()
      .populate('assignedBus', 'busNumber destination status');
    
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all students
router.get('/students/all', async (req, res) => {
  try {
    const students = await User.findStudents();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get users by campus
router.get('/campus/:campus', async (req, res) => {
  try {
    const { campus } = req.params;
    const { role, limit = 50, page = 1 } = req.query;
    
    const filter = { campus, isActive: true };
    if (role) filter.role = role;
    
    const users = await User.find(filter)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ name: 1 });
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
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

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { role, limit = 20 } = req.query;
    
    const filter = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } },
        { driverId: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (role) filter.role = role;
    
    const users = await User.find(filter)
      .select('-password')
      .limit(parseInt(limit))
      .sort({ name: 1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 