const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'AmritDrive REST API',
    version: '1.0.0',
    description: 'Interactive API documentation for AmritDrive - Cloud File Storage application built with the MERN stack.',
    contact: {
      name: 'AmritDrive Support'
    }
  },
  servers: [
    {
      url: 'https://amritdrive-backend.onrender.com/api',
      description: 'Production Server (Render)'
    },
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /auth/login or /auth/register'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d1' },
          name: { type: 'string', example: 'Amrit Keshari' },
          email: { type: 'string', example: 'amrit@example.com' },
          storageInfo: {
            type: 'object',
            properties: {
              storageUsed: { type: 'number', example: 1048576 },
              storageLimit: { type: 'number', example: 10737418240 }
            }
          }
        }
      },
      File: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d2' },
          name: { type: 'string', example: 'document.pdf' },
          originalName: { type: 'string', example: 'document.pdf' },
          size: { type: 'number', example: 204800 },
          mimetype: { type: 'string', example: 'application/pdf' },
          folderId: { type: 'string', nullable: true, example: null },
          userId: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d1' },
          isTrashed: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Folder: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d3' },
          name: { type: 'string', example: 'Projects' },
          parentId: { type: 'string', nullable: true, example: null },
          userId: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d1' },
          isTrashed: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      ShareLink: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d4' },
          token: { type: 'string', example: 'a1b2c3d4e5f6...32bytes' },
          file: { $ref: '#/components/schemas/File' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          downloadCount: { type: 'number', example: 5 },
          isActive: { type: 'boolean', example: true }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Error message description' }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'User registration, login, profile, and OAuth' },
    { name: 'Files', description: 'Upload, manage, download, view, and organize files' },
    { name: 'Folders', description: 'Create and organize folder hierarchies' },
    { name: 'Sharing', description: 'Public share links with optional password & expiration' },
    { name: 'Trash', description: 'Soft delete, restore, and permanent deletion' },
    { name: 'System', description: 'Server health check' }
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Amrit Keshari' },
                  email: { type: 'string', example: 'amrit@example.com' },
                  password: { type: 'string', minLength: 6, example: 'password123' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'User registered successfully' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error or user already exists' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in to existing account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'amrit@example.com' },
                  password: { type: 'string', example: 'password123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Login successful' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid credentials or validation error' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile and storage quota info',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user profile details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized / Token invalid' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out user session',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logout successful' }
        }
      }
    },
    '/auth/google': {
      get: {
        tags: ['Authentication'],
        summary: 'Initiate Google OAuth 2.0 login redirect',
        parameters: [
          {
            name: 'redirect',
            in: 'query',
            description: 'Frontend redirect URL',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to Google authentication consent screen' }
        }
      }
    },
    '/files/upload': {
      post: {
        tags: ['Files'],
        summary: 'Upload a single file (max 25MB)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'The file to upload' },
                  folderId: { type: 'string', description: 'Optional target folder ID (leave empty for root)' },
                  name: { type: 'string', description: 'Optional custom display name' },
                  description: { type: 'string', description: 'Optional file description' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'File uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'File uploaded successfully' },
                    file: { $ref: '#/components/schemas/File' },
                    storageInfo: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'No file uploaded or name already exists in location' },
          413: { description: 'Storage quota limit exceeded or file exceeds 25MB' }
        }
      }
    },
    '/files': {
      get: {
        tags: ['Files'],
        summary: 'List user files in folder or search files',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'folderId', in: 'query', schema: { type: 'string' }, description: 'Target folder ID (leave empty for root)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search files by name keyword' }
        ],
        responses: {
          200: {
            description: 'List of files',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    files: { type: 'array', items: { $ref: '#/components/schemas/File' } },
                    total: { type: 'integer', example: 15 },
                    totalPages: { type: 'integer', example: 1 },
                    currentPage: { type: 'integer', example: 1 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/files/{fileId}': {
      get: {
        tags: ['Files'],
        summary: 'Get single file metadata',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { file: { $ref: '#/components/schemas/File' } }
                }
              }
            }
          },
          404: { description: 'File not found' }
        }
      },
      delete: {
        tags: ['Files'],
        summary: 'Permanently delete a file from disk and database',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'File deleted successfully' },
          404: { description: 'File not found' }
        }
      }
    },
    '/files/{fileId}/download': {
      get: {
        tags: ['Files'],
        summary: 'Download file as attachment',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Binary file download',
            content: {
              'application/octet-stream': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          404: { description: 'File not found' }
        }
      }
    },
    '/files/{fileId}/view': {
      get: {
        tags: ['Files'],
        summary: 'View file inline (for browser previews of PDFs, Images, Videos)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Inline file stream',
            content: {
              'application/octet-stream': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          404: { description: 'File not found' }
        }
      }
    },
    '/files/{fileId}/rename': {
      put: {
        tags: ['Files'],
        summary: 'Rename file',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', example: 'new-name.pdf' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'File renamed successfully' },
          400: { description: 'Name already exists in location' }
        }
      }
    },
    '/files/{fileId}/move': {
      put: {
        tags: ['Files'],
        summary: 'Move file to a folder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { folderId: { type: 'string', nullable: true, example: '65f2a1b9c8d7e6f5a4b3c2d3' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'File moved successfully' }
        }
      }
    },
    '/folders': {
      post: {
        tags: ['Folders'],
        summary: 'Create a new folder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Documents' },
                  parentId: { type: 'string', nullable: true, example: null }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Folder created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Folder created successfully' },
                    folder: { $ref: '#/components/schemas/Folder' }
                  }
                }
              }
            }
          },
          400: { description: 'Folder with this name already exists in location' }
        }
      },
      get: {
        tags: ['Folders'],
        summary: 'List user folders in root or subfolder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'parentId', in: 'query', schema: { type: 'string' }, description: 'Parent folder ID (omit for root folders)' }
        ],
        responses: {
          200: {
            description: 'List of folders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    folders: { type: 'array', items: { $ref: '#/components/schemas/Folder' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/folders/{folderId}': {
      get: {
        tags: ['Folders'],
        summary: 'Get folder details',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'folderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { folder: { $ref: '#/components/schemas/Folder' } }
                }
              }
            }
          },
          404: { description: 'Folder not found' }
        }
      },
      put: {
        tags: ['Folders'],
        summary: 'Rename folder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'folderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', example: 'RenamedFolder' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Folder updated successfully' }
        }
      },
      delete: {
        tags: ['Folders'],
        summary: 'Delete empty folder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'folderId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Folder deleted successfully' },
          400: { description: 'Cannot delete folder with subfolders or files' }
        }
      }
    },
    '/share': {
      post: {
        tags: ['Sharing'],
        summary: 'Generate a public share link for a file',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileId'],
                properties: {
                  fileId: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d2' },
                  expiresIn: { type: 'integer', description: 'Expiration in days (optional)', example: 7 },
                  password: { type: 'string', description: 'Optional password protection (min 6 chars)', example: 'secret123' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Share link generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Share link generated successfully' },
                    token: { type: 'string', example: '9a8b7c6d5e4f3a2b1c...' }
                  }
                }
              }
            }
          }
        }
      },
      get: {
        tags: ['Sharing'],
        summary: 'List user active share links',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    shares: { type: 'array', items: { $ref: '#/components/schemas/ShareLink' } },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    currentPage: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/share/{token}/info': {
      get: {
        tags: ['Sharing'],
        summary: 'Get public metadata for a shared file (public endpoint)',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Metadata of shared file',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'shared-report.pdf' },
                        size: { type: 'number', example: 1048576 },
                        mimetype: { type: 'string', example: 'application/pdf' }
                      }
                    },
                    requiresPassword: { type: 'boolean', example: true }
                  }
                }
              }
            }
          },
          404: { description: 'Share link not found or expired' }
        }
      }
    },
    '/share/{token}/download': {
      post: {
        tags: ['Sharing'],
        summary: 'Download shared file with optional password verification (public endpoint)',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { password: { type: 'string', example: 'secret123' } }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Binary file download',
            content: {
              'application/octet-stream': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          401: { description: 'Invalid password' },
          404: { description: 'Share link not found or expired' }
        }
      }
    },
    '/share/{shareId}': {
      delete: {
        tags: ['Sharing'],
        summary: 'Revoke and delete a share link',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'shareId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Share link revoked successfully' },
          404: { description: 'Share link not found' }
        }
      }
    },
    '/trash': {
      get: {
        tags: ['Trash'],
        summary: 'Get all soft-deleted files and folders in trash',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    files: { type: 'array', items: { $ref: '#/components/schemas/File' } },
                    folders: { type: 'array', items: { $ref: '#/components/schemas/Folder' } },
                    total: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/trash/move': {
      post: {
        tags: ['Trash'],
        summary: 'Move file or folder to trash (soft delete)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'id'],
                properties: {
                  type: { type: 'string', enum: ['file', 'folder'], example: 'file' },
                  id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d2' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Item moved to trash successfully' },
          404: { description: 'Item not found' }
        }
      }
    },
    '/trash/restore': {
      post: {
        tags: ['Trash'],
        summary: 'Restore item from trash back to its location',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'id'],
                properties: {
                  type: { type: 'string', enum: ['file', 'folder'], example: 'file' },
                  id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d2' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Item restored successfully' },
          400: { description: 'Parent folder is in trash or deleted' }
        }
      }
    },
    '/trash/delete': {
      delete: {
        tags: ['Trash'],
        summary: 'Permanently delete item from trash and disk',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'id'],
                properties: {
                  type: { type: 'string', enum: ['file', 'folder'], example: 'file' },
                  id: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d2' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Item permanently deleted' },
          404: { description: 'Item not found in trash' }
        }
      }
    },
    '/trash/empty': {
      delete: {
        tags: ['Trash'],
        summary: 'Empty all trash items and free storage quota',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Trash emptied successfully' },
                    deleted: {
                      type: 'object',
                      properties: {
                        files: { type: 'integer', example: 5 },
                        folders: { type: 'integer', example: 2 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check probe for server monitoring',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'OK' } }
                }
              }
            }
          }
        }
      }
    }
  }
};

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none } .swagger-ui .info { margin: 25px 0 }',
  customSiteTitle: 'AmritDrive API Documentation'
};

module.exports = {
  swaggerUi,
  swaggerDocument,
  swaggerUiOptions
};
