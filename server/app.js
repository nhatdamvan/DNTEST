const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database configuration
const { initializeDatabase, testConnection } = require('./config/database');
// In server/app.js, add this import with other route imports
const corporateRoutes = require('./routes/corporate');

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001; // Changed from 3000 to 3001

// Trust proxy for Railway - MUST be before rate limiter
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
} else {
  app.set('trust proxy', false); // Don't trust proxy in development
}

// Security middleware - Fixed for Tailwind CSS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));

// Rate limiting with proper configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting in development
  skip: (req) => process.env.NODE_ENV === 'development',
  // Use custom key generator that handles trust proxy properly
  keyGenerator: (req) => {
    if (!req.ip) {
      console.warn('Warning: req.ip is undefined. Check your trust proxy settings.');
      return req.socket.remoteAddress;
    }
    return req.ip;
  }
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
// app.use(express.static(path.join(__dirname, '../client/build')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
// Add this with other API routes
app.use('/api/corporate', corporateRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(isDevelopment && { stack: err.stack })
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Serve React app for all other routes (must be last!)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/build/index.html'));
// });

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Smart Report System running on port ${PORT}`);
  console.log(`📱 Access your app at: http://13.60.66.60:${PORT}`);
  console.log(`🏥 Health check: http://13.60.66.60:${PORT}/health`);

  // Test database connection
  const dbConnected = await testConnection();
  console.log(`📊 Database: ${dbConnected ? 'Connected ✅' : 'Not connected ❌'}`);
  
  // Initialize database tables
  await initializeDatabase();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;