// Script to create admin user
const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      email: 'admin@hostfiledrive.com',
      password: 'Admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      permissions: ['read', 'write', 'delete', 'share', 'admin']
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@hostfiledrive.com');
    console.log('Password: Admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();
