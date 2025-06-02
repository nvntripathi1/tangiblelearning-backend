const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import email service
const { sendNotificationEmail } = require('./utils/emailService');

// Import models
const Contact = require('./models/Contact');
const Admin = require('./models/Admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://tangiblelearning.vercel.app',
    'https://www.tangiblelearning.vercel.app'
    'https://tangiblelearning.in',        
    'https://www.tangiblelearning.in'    
  ],
  credentials: true
}));

// Trust proxy for IP address handling
app.set('trust proxy', true);

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((error) => console.error('❌ MongoDB error:', error));

// Basic routes without separate route files
app.get('/', (req, res) => {
  res.json({
    message: 'Tangible Learning Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message, company, location, school} = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Get client information
    const ipAddress = req.ip || req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const contact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      company,
      location,
      school,
      ipAddress,
      userAgent,
      source: 'website'
    });

    await contact.save();

    // Debug email configuration
      console.log('📧 Attempting to send email notification...');
      console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
      console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
      console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'Set' : 'Not set');

      // Send notification email (don't wait for it to complete)
      sendNotificationEmail(contact).then(() => {
        console.log('✅ Email notification sent successfully');
      }).catch(error => {
        console.error('❌ Failed to send email notification:', error.message);
        });

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form'
    });
  }
});

// Simple admin login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const admin = await Admin.findOne({ 
      $or: [{ username }, { email: username }],
      isActive: true
    }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get contacts (simple version)
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: contacts
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 Tangible Learning Backend Started!');
  console.log('=====================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('🌐 Railway will provide the public URL');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   GET  /health');
  console.log('   POST /api/contact');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/contacts');
  console.log('');
});

module.exports = app;
