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
    'https://www.tangiblelearning.vercel.app',
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

// Create initial admin user (add this endpoint)
app.post('/api/admin/create', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'superadmin' });
    if (existingAdmin) {
      return res.json({ success: true, message: 'Admin already exists' });
    }

    const admin = new Admin({
      username: 'superadmin',
      email: 'naveenp@tangiblelearning.in',
      password: 'admin123456',
      fullName: 'Naveen Tripathi',
      role: 'super_admin'
    });

    await admin.save();
    
    res.json({
      success: true,
      message: 'Admin user created successfully'
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
});


// Change admin password (NEW - add this)
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, username } = req.body;

    if (!currentPassword || !newPassword || !username) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and username are required'
      });
    }

    // Find admin
    const admin = await Admin.findOne({ username }).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isValidPassword = await admin.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Create new admin user (NEW - add this)
app.post('/api/admin/create-user', async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this username or email already exists'
      });
    }

    const admin = new Admin({
      username,
      email,
      password,
      fullName,
      role: role || 'admin'
    });

    await admin.save();
    
    res.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user'
    });
  }
});

// Quick password reset (NEW - add this)
app.get('/api/admin/reset-password/:username/:newPassword', async (req, res) => {
  try {
    const { username, newPassword } = req.params;
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: `Password updated for ${username}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Delete contact
app.delete('/api/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedContact = await Contact.findByIdAndDelete(id);

    if (!deletedContact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact'
    });
  }
});

// Update contact status
app.patch('/api/admin/contacts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'replied', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: new, read, replied, or resolved'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact status updated successfully',
      data: contact
    });

  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact status'
    });
  }
});

// Send reply email
app.post('/api/admin/contacts/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message, fromEmail } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Find the contact
    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Import email service
    const { sendReplyEmail } = require('./utils/emailService');

    // Send reply email
    await sendReplyEmail(contact, subject, message, fromEmail || process.env.ADMIN_EMAIL);

    // Update contact status to replied
    contact.status = 'replied';
    await contact.save();

    res.json({
      success: true,
      message: 'Reply sent successfully'
    });

  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply: ' + error.message
    });
  }
});

// Get contact statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });
    const repliedContacts = await Contact.countDocuments({ status: 'replied' });
    
    // Today's contacts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todayContacts = await Contact.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    res.json({
      success: true,
      data: {
        total: totalContacts,
        new: newContacts,
        replied: repliedContacts,
        today: todayContacts
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Get all contacts with enhanced filtering
app.get('/api/admin/contacts', async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
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
