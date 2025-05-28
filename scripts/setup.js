const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

// This script creates the first admin account so you can access the admin panel
const setupDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tangible-learning', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log('ℹ️  Super admin already exists:', existingSuperAdmin.username);
      console.log('   Email:', existingSuperAdmin.email);
      console.log('');
      console.log('🚀 You can start the server with: npm run dev');
      process.exit(0);
    }

    // Create default super admin account
    console.log('Creating super admin account...');
    
    const superAdmin = new Admin({
      username: 'superadmin',
      email: 'naveenp@tangiblelearning.in',
      password: 'admin123456', // This will be automatically encrypted
      fullName: 'Naveen Tripathi',
      role: 'super_admin'
    });

    await superAdmin.save();

    console.log('');
    console.log('🎉 Setup completed successfully!');
    console.log('');
    console.log('📧 Super Admin Account Created:');
    console.log('   Username: superadmin');
    console.log('   Email: naveenp@tangiblelearning.in');
    console.log('   Password: admin123456');
    console.log('   Full Name: Naveen Tripathi');
    console.log('');
    console.log('⚠️  IMPORTANT SECURITY NOTE:');
    console.log('   1. Change the default password after first login!');
    console.log('   2. Use a strong password in production');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Test contact form: http://localhost:5000/api/contact');
    console.log('   3. Login to admin: POST http://localhost:5000/api/auth/login');
    console.log('   4. View API docs: http://localhost:5000/api-docs');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('');
      console.log('💡 This looks like a database connection issue.');
      console.log('   Make sure MongoDB is running or check your MONGODB_URI in .env');
    }
    
    if (error.code === 11000) {
      console.log('');
      console.log('💡 Admin account already exists with this email or username.');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📋 Database connection closed.');
  }
};

// Display helpful information
console.log('🔧 Tangible Learning Backend Setup');
console.log('===================================');
console.log('');

setupDatabase();