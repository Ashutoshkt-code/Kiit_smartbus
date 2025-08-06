# KIIT SmartBus - Development Guide

## 🚀 Project Overview

KIIT SmartBus is a real-time campus bus tracking system designed to solve transportation challenges at KIIT University. The system provides live bus tracking, seat availability updates, and route management for students, drivers, and administrators.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React.js + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + MongoDB
- **Real-time**: Socket.io
- **Maps**: Leaflet.js (OpenStreetMap)
- **Authentication**: JWT
- **State Management**: React Query

### Project Structure
```
KIIT_SmartBus/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth & validation
│   │   └── server.js       # Main server file
│   ├── package.json
│   └── env.example
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Git

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd KIIT_SmartBus

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Start MongoDB (if not running)
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in backend/.env
```

### 3. Environment Configuration

```bash
# Backend environment
cd backend
cp env.example .env
# Edit .env with your configuration

# Frontend environment (optional)
cd ../frontend
# Create .env if needed for API URL
```

### 4. Start Development Servers

```bash
# From root directory
npm run dev

# Or start separately:
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm start
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile

### Buses
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id` - Get bus by ID
- `POST /api/buses` - Create new bus (admin)
- `PUT /api/buses/:id/location` - Update bus location
- `PUT /api/buses/:id/status` - Update bus status
- `GET /api/buses/nearby/:lat/:lng` - Find nearby buses

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID (admin)
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user (admin)

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route by ID
- `POST /api/routes` - Create route (admin)
- `PUT /api/routes/:id` - Update route (admin)

## 🔌 Real-time Features

### Socket.io Events

**Client to Server:**
- `join-bus-tracking` - Join bus tracking room
- `update-bus-location` - Update bus location (driver)
- `update-bus-status` - Update bus status (driver)

**Server to Client:**
- `bus-location-updated` - Bus location changed
- `bus-status-updated` - Bus status changed

## 🎯 Development Phases

### Phase 1: Foundation ✅
- [x] Project structure setup
- [x] Backend API foundation
- [x] Database models
- [x] Authentication system
- [x] Basic frontend setup

### Phase 2: Core Features (Current)
- [ ] User registration/login pages
- [ ] Bus tracking map component
- [ ] Driver dashboard
- [ ] Student dashboard
- [ ] Real-time location updates

### Phase 3: Advanced Features
- [ ] Push notifications
- [ ] Route optimization
- [ ] Admin analytics dashboard
- [ ] Mobile responsiveness
- [ ] Offline support

### Phase 4: Production Ready
- [ ] Testing suite
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deployment setup
- [ ] Documentation

## 🚀 Next Steps

### Immediate Tasks (Week 1-2)

1. **Complete Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Configure MongoDB connection
   npm run dev
   ```

2. **Create Frontend Pages**
   - Home page with bus tracking
   - Login/Register forms
   - Student dashboard
   - Driver dashboard
   - Admin dashboard

3. **Implement Real-time Features**
   - Socket.io connection
   - Live bus tracking
   - Status updates

### Week 3-4: Core Features

1. **Map Integration**
   - Leaflet.js setup
   - Bus markers
   - Route visualization
   - GPS integration

2. **User Management**
   - Role-based access
   - Profile management
   - User search/filter

3. **Bus Management**
   - CRUD operations
   - Status updates
   - Location tracking

### Week 5-6: Enhancement

1. **Advanced Features**
   - Push notifications
   - Route optimization
   - Analytics dashboard

2. **Testing & Optimization**
   - Unit tests
   - Integration tests
   - Performance optimization

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
Use Postman or similar tool to test endpoints:
- Import the provided Postman collection
- Set up environment variables
- Test all endpoints

## 📱 Mobile Considerations

### Progressive Web App (PWA)
- Service workers for offline support
- App-like experience
- Push notifications

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Optimized for small screens

## 🔒 Security Considerations

### Authentication
- JWT token management
- Password hashing (bcrypt)
- Role-based access control

### Data Protection
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

### API Security
- Rate limiting
- Request validation
- Error handling

## 🚀 Deployment

### Backend Deployment
- Railway/Render for Node.js
- MongoDB Atlas for database
- Environment variables setup

### Frontend Deployment
- Vercel/Netlify for React
- CDN for static assets
- Environment configuration

## 📊 Monitoring & Analytics

### Performance Monitoring
- Response time tracking
- Error logging
- User analytics

### Business Metrics
- Bus utilization rates
- Route popularity
- Peak usage times

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Write tests
4. Submit pull request
5. Code review
6. Merge to main

### Code Standards
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Component documentation

## 📞 Support

### Getting Help
- Check documentation
- Review existing issues
- Create new issue with details
- Contact development team

### Common Issues
- MongoDB connection problems
- CORS errors
- Socket.io connection issues
- Environment variable setup

---

## 🎉 Getting Started

Ready to start development? Follow these steps:

1. **Setup Environment**
   ```bash
   npm run install:all
   ```

2. **Start Development**
   ```bash
   npm run dev
   ```

3. **Access Applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/api/health

4. **Create Test Data**
   - Register test users (student, driver, admin)
   - Create test buses and routes
   - Test real-time features

Happy coding! 🚌✨ 