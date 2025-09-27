const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const onboardingRoutes = require('./routes/onboarding');
const leaderboardRoutes = require('./routes/leaderboard');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/timetide', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ MongoDB connection error:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'timetide-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/timetide'
  }),
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/progress', progressRoutes);

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Weather API key not configured. Set OPENWEATHER_API_KEY in environment.' });
    }
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TimeTide API is running',
    timestamp: new Date().toISOString()
  });
});

// Production: Serve React build files
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing - send all non-API requests to React
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
} else {
  // Development: API-only server (React runs separately on port 3001)
  app.get('/', (req, res) => {
    res.json({ 
      message: '🚀 TimeTide API Server is running!',
      frontend: 'React app should be running on http://localhost:3001',
      api: `API available at http://localhost:${PORT}/api`,
      endpoints: [
        'GET /api/health - Health check',
        'POST /api/auth/login - User login',
        'POST /api/auth/register - User registration',
        'GET /api/auth/check - Check authentication',
        'POST /api/auth/logout - User logout',
        'GET /api/sessions - Get user sessions',
        'POST /api/sessions - Create new session',
        'PUT /api/sessions/:id/complete - Complete session',
        'GET /api/sessions/analytics - Get analytics',
        'GET /api/weather?lat=&lon= - Get weather data'
      ]
    });
  });
  
  // Catch-all for non-API routes in development
  app.get('*', (req, res) => {
    res.status(404).json({ 
      error: 'Route not found', 
      message: 'This is the API server. React app should be running on port 3001.' 
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TimeTide API Server running on http://localhost:${PORT}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`📱 App available at http://localhost:${PORT}`);
  } else {
    console.log(`📱 React app should be running on http://localhost:3001`);
    console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💡 Visit http://localhost:${PORT} to see available API endpoints`);
  }
});