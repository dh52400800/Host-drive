const mongoose = require('mongoose');
const winston = require('winston');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://huuthang9764:Iex0SbvlO6qR1nuC@cluster0.uk99xcq.mongodb.net/drive-storage1';
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      winston.info('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        winston.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        winston.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        winston.info('🔄 MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      winston.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      winston.info('🔌 MongoDB disconnected');
    } catch (error) {
      winston.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
