const express = require('express');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { sendNotificationEmail } = require('../utils/emailService');
const router = express.Router();

// POST /api/contact - Submit a contact form
router.post('/', [
  // Validation rules - these check the data before processing
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, subject, message, company } = req.body;

    // Prevent duplicate submissions (same email and message in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingContact = await Contact.findOne({
      email,
      message,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingContact) {
      return res.status(429).json({
        success: false,
        message: 'Duplicate submission detected. Please wait before submitting again.'
      });
    }

    // Get client information for security tracking
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Create and save new contact
    const contact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      company,
      ipAddress,
      userAgent,
      source: 'website'
    });

    await contact.save();

    // Send notification email to you (don't wait for it to complete)
    sendNotificationEmail(contact).catch(error => {
      console.error('Failed to send notification email:', error);
    });

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please try again later.'
    });
  }
});

// GET /api/contact/stats - Get public statistics (how many contacts submitted)
router.get('/stats', async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments();
    const todayContacts = await Contact.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    res.json({
      success: true,
      data: {
        totalSubmissions: totalContacts,
        todaySubmissions: todayContacts
      }
    });

  } catch (error) {
    console.error('Contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics'
    });
  }
});

// POST /api/contact/verify - Verify a contact submission exists
router.post('/verify', async (req, res) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required'
      });
    }

    const contact = await Contact.findById(contactId).select('_id status createdAt');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: contact._id,
        status: contact.status,
        submittedAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Contact verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify contact submission'
    });
  }
});

module.exports = router;