const nodemailer = require('nodemailer');

// Create email transporter (the thing that sends emails)
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send notification email to admin when new contact is received
const sendNotificationEmail = async (contact) => {
  try {
    // Skip if email is not configured
    if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
      console.log('Email configuration not found, skipping notification');
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL, // This goes to naveenp@tangiblelearning.in
      subject: `New Contact Form Submission - ${contact.subject || 'No Subject'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #007bff; margin-top: 0;">Contact Details</h3>
            
            <p><strong>Name:</strong> ${contact.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${contact.email}">${contact.email}</a></p>
            ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
            ${contact.company ? `<p><strong>Company:</strong> ${contact.company}</p>` : ''}
            <p><strong>Subject:</strong> ${contact.subject || 'No subject'}</p>
            <p><strong>Submitted:</strong> ${contact.createdAt.toLocaleString()}</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
            <h4 style="color: #333; margin-top: 0;">Message:</h4>
            <p style="line-height: 1.6; color: #555; white-space: pre-wrap;">${contact.message}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
              <strong>Admin Panel:</strong> 
              <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}" 
                 style="color: #007bff; text-decoration: none;">
                View in Admin Panel
              </a>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Notification email sent successfully');

  } catch (error) {
    console.error('Failed to send notification email:', error);
    throw error;
  }
};

// Send reply email to contact person
const sendReplyEmail = async (contact, subject, message, fromEmail) => {
  try {
    if (!process.env.SMTP_USER) {
      throw new Error('Email configuration not found');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: contact.email,
      subject: `Re: ${subject}`,
      replyTo: fromEmail,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Tangible Learning</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f8f9fa;">
            <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">
              Hello ${contact.name},
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              Thank you for contacting us. Here's our response to your inquiry:
            </p>
          </div>

          <div style="padding: 20px; background-color: white; border-left: 4px solid #007bff;">
            <div style="line-height: 1.6; color: #333; white-space: pre-wrap;">${message}</div>
          </div>

          <div style="padding: 20px; background-color: #343a40; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">
              Best regards,<br>
              Tangible Learning Team
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
              <a href="https://tangiblelearning.in" style="color: #6c757d;">
                https://tangiblelearning.in
              </a>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Reply email sent successfully');

  } catch (error) {
    console.error('Failed to send reply email:', error);
    throw error;
  }
};

module.exports = {
  sendNotificationEmail,
  sendReplyEmail
};