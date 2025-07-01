const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Host Drive API',
    version: '1.0.0',
    description: 'Hệ thống quản lý File với Google Drive API - sử dụng Multer và FFmpeg',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.yourdomain.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token để xác thực API'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'JWT token trong cookie'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID người dùng'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email người dùng'
          },
          firstName: {
            type: 'string',
            description: 'Tên'
          },
          lastName: {
            type: 'string',
            description: 'Họ'
          },
          isEmailVerified: {
            type: 'boolean',
            description: 'Trạng thái xác minh email'
          },
          isTwoFactorEnabled: {
            type: 'boolean',
            description: 'Bật xác thực 2 bước'
          },
          storageUsed: {
            type: 'number',
            description: 'Dung lượng đã sử dụng (bytes)'
          },
          storageLimit: {
            type: 'number',
            description: 'Giới hạn dung lượng (bytes)'
          }
        }
      },
      File: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID file'
          },
          name: {
            type: 'string',
            description: 'Tên file'
          },
          originalName: {
            type: 'string',
            description: 'Tên file gốc'
          },
          size: {
            type: 'number',
            description: 'Kích thước file (bytes)'
          },
          mimeType: {
            type: 'string',
            description: 'Loại MIME'
          },
          driveFileId: {
            type: 'string',
            description: 'ID file trên Google Drive'
          },
          webViewLink: {
            type: 'string',
            description: 'Link xem file trên Google Drive'
          },
          thumbnailLink: {
            type: 'string',
            description: 'Link thumbnail'
          },
          isPublic: {
            type: 'boolean',
            description: 'File công khai'
          },
          description: {
            type: 'string',
            description: 'Mô tả file'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Tags của file'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo'
          },
          metadata: {
            type: 'object',
            properties: {
              duration: {
                type: 'number',
                description: 'Thời lượng video (giây)'
              },
              resolution: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              },
              bitrate: {
                type: 'number',
                description: 'Bitrate'
              },
              frameRate: {
                type: 'number',
                description: 'FPS'
              }
            }
          }
        }
      },
      UploadResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'File uploaded successfully'
          },
          data: {
            type: 'object',
            properties: {
              file: {
                $ref: '#/components/schemas/File'
              },
              uploadId: {
                type: 'string',
                description: 'ID của quá trình upload'
              }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error message'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string'
              },
              details: {
                type: 'object'
              }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    tryItOutEnabled: true
  },
  customJs: '/swagger-custom.js',
  customCssUrl: '/swagger-custom.css'
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};
