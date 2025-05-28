// server.js - This is the main file that starts your backend server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config(); // Load environment variables from .env file

// Import your route files
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// SECURITY MIDDLEWARE
// Helmet adds security headers to protect against common attacks
app.use(helmet());

// CORS allows your frontend to communicate with this backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Your React app URL
  credentials: true
}));

// RATE LIMITING - Prevents abuse
// General rate limit: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Special rate limit for contact form - only 5 submissions per hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many contact form submissions, please try again later.'
});

// BODY PARSER - Allows reading JSON data from requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API DOCUMENTATION SETUP
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tangible Learning API',
      version: '1.0.0',
      description: 'API for Tangible Learning contact form and admin panel'
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// CONNECT TO DATABASE
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tangible-learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((error) => console.error('❌ MongoDB connection error:', error));

// API ROUTES
app.use('/api/contact', contactLimiter, contactRoutes);  // Contact form routes
app.use('/api/admin', adminRoutes);                       // Admin panel routes
app.use('/api/auth', authRoutes);                         // Authentication routes

// HEALTH CHECK ENDPOINT - Check if server is running
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Tangible Learning Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ROOT ENDPOINT - Basic info about your API
app.get('/', (req, res) => {
  res.json({
    message: 'Tangible Learning Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    contact: '/api/contact',
    admin: '/api/admin',
    auth: '/api/auth'
  });
});

// ERROR HANDLING MIDDLEWARE
app.use(errorHandler);

// HANDLE 404 - Route not found
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: {
      contact: '/api/contact',
      admin: '/api/admin',
      auth: '/api/auth',
      docs: '/api-docs',
      health: '/health'
    }
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Tangible Learning Backend Started!');
  console.log('=====================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   POST /api/contact           - Submit contact form');
  console.log('   POST /api/auth/login        - Admin login');
  console.log('   GET  /api/admin/dashboard   - Admin dashboard');
  console.log('   GET  /api/admin/contacts    - List contacts');
  console.log('');
  console.log('🔧 To set up admin account, run: node scripts/setup.js');
  console.log('');
});

module.exports = app;