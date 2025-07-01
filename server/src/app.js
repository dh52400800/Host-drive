require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const database = require('./config/database');
const winston = require('./config/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const fileRoutes = require('./routes/file');
const folderRoutes = require('./routes/folder');
const streamRoutes = require('./routes/stream');
const adminRoutes = require('./routes/admin');

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middlewares
    this.app.use(helmet({
      crossOriginResourcePolicy: false, // Allow cross-origin requests for streaming
      contentSecurityPolicy: false // Disable CSP for development
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range', 'X-2FA-Verified']
    }));

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message) => winston.info(message.trim())
        }
      }));
    }

    // Rate limiting
    this.app.use('/api/', generalLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parsing
    this.app.use(cookieParser());

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use('/public', express.static(path.join(__dirname, '../public')));

    // Trust proxy (for accurate IP addresses)
    this.app.set('trust proxy', 1);
  }

  initializeRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: require('../package.json').version
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/files', fileRoutes);
    this.app.use('/api/folders', folderRoutes);
    this.app.use('/api/stream', streamRoutes);
    this.app.use('/api/admin', adminRoutes);

    // Swagger documentation
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    
    // Swagger JSON endpoint
    this.app.get('/api/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        status: 404
      });
    });

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'HostFileDrive API Server',
        version: require('../package.json').version,
        documentation: '/api/docs',
        health: '/health'
      });
    });

    // Swagger UI
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  }

  initializeErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await database.connect();

      // Start server
      this.server = this.app.listen(this.port, () => {
        winston.info(`🚀 Server is running on port ${this.port}`);
        winston.info(`📖 Environment: ${process.env.NODE_ENV}`);
        winston.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3001'}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      winston.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    // Handle graceful shutdown
    const shutdown = async (signal) => {
      winston.info(`📴 Received ${signal}, shutting down gracefully...`);
      
      if (this.server) {
        this.server.close(() => {
          winston.info('🔌 HTTP server closed');
          
          // Close database connection
          database.disconnect().then(() => {
            winston.info('💾 Database connection closed');
            process.exit(0);
          });
        });
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      winston.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      winston.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Create and start application
const app = new App();

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.start();
}

module.exports = app.app;
