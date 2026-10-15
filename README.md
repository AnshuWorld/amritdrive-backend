# 🚀 AmritDrive - Backend API

> A robust, full-featured cloud storage backend built with Node.js, Express 5, MongoDB, and Mongoose. It provides secure file storage, folder hierarchy management, password-protected file sharing, a soft-delete trash recovery lifecycle, and interactive Swagger API documentation.

---

## 📋 Table of Contents
- [Tech Stack](#-tech-stack)
- [Project Architecture & Folder Structure](#-project-architecture--folder-structure)
- [Prerequisites](#-prerequisites)
- [Environment Variables (.env)](#-environment-variables-env)
- [Quick Start & Local Setup](#-quick-start--local-setup)
- [Interactive Swagger API Documentation](#-interactive-swagger-api-documentation)
- [Complete API Endpoints Overview](#-complete-api-endpoints-overview)
- [Key Features Explained in Simple Words](#-key-features-explained-in-simple-words)
  - [1. User Authentication (JWT + Google OAuth)](#1-user-authentication-jwt--google-oauth)
  - [2. File Storage & Quota Management](#2-file-storage--quota-management)
  - [3. Folder Hierarchy & Organization](#3-folder-hierarchy--organization)
  - [4. File Sharing with Passwords & Expiration](#4-file-sharing-with-passwords--expiration)
  - [5. Trash & Recovery System](#5-trash--recovery-system)
- [Docker Deployment](#-docker-deployment)
- [Production Deployment (Render)](#-production-deployment-render)

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** (v20+) | JavaScript runtime environment |
| **Express 5** | High-performance backend web framework |
| **MongoDB & Mongoose 8** | NoSQL database & ODM for schemas and indexing |
| **Multer 2** | Multipart form-data handling for file uploads |
| **JSON Web Token (JWT)** | Stateless user authentication |
| **Passport.js** | Authentication strategies (JWT & Google OAuth 2.0) |
| **Bcrypt.js** | Secure password hashing (salted) |
| **Swagger UI Express** | Interactive OpenAPI 3.0 API documentation & testing |
| **Helmet & CORS** | Security headers and cross-origin resource sharing |
| **Express Validator** | Request payload & parameter validation |

---

## 📂 Project Architecture & Folder Structure

```text
backend/
├── config/
│   ├── clientOrigins.js    # Allowed CORS frontend domains (Localhost, Vercel)
│   ├── database.js         # MongoDB Atlas connection & error handlers
│   ├── passport.js         # JWT strategy & optional Google OAuth setup
│   └── swagger.js          # Complete OpenAPI 3.0 specs & Swagger UI config
├── controllers/
│   ├── authController.js   # Register, Login, Me, Logout, Google OAuth
│   ├── fileController.js   # Upload, List, Download, View, Rename, Move, Delete
│   ├── folderController.js # Create, List, Details, Rename, Delete Folders
│   ├── shareController.js  # Generate, List, Public Info, Download, Revoke links
│   └── trashController.js  # Move to trash, Restore, Permanent delete, Empty
├── middleware/
│   ├── auth.js             # Verifies Bearer JWT token in Authorization header
│   ├── errorHandler.js     # Global API error formatter (Mongoose, Cast, JWT)
│   └── upload.js           # Multer storage configuration, limits (25MB), file filter
├── models/
│   ├── File.js             # File schema (name, size, mimetype, folderId, trashedAt)
│   ├── Folder.js           # Folder schema (name, parentId, path, trashedAt)
│   ├── ShareLink.js        # Share link schema (token, file, password, expiresAt)
│   └── User.js             # User schema (name, email, password, storageUsed/Limit)
├── routes/
│   ├── auth.js             # /api/auth router
│   ├── files.js            # /api/files router
│   ├── folders.js          # /api/folders router
│   ├── share.js            # /api/share router
│   └── trash.js            # /api/trash router
├── uploads/                # Local disk storage directory for uploaded files
├── .env                    # Environment variables (do not commit secrets)
├── .dockerignore           # Excluded files for Docker build
├── Dockerfile              # Production Docker image configuration
├── package.json            # Dependencies and npm scripts
└── server.js               # Application entry point & middleware mounting
```

---

## ⚙️ Environment Variables (.env)

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Port (Render sets this dynamically; defaults to 5000 locally)
PORT=5000

# MongoDB Connection String (Atlas or Local MongoDB)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/amrit_drive?retryWrites=true&w=majority

# JWT Authentication Secret & Token Expiration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Allowed Frontend Origins (comma-separated for CORS)
CLIENT_URL=https://amritdrive-frontend.vercel.app
CLIENT_URLS=https://amritdrive-frontend.vercel.app,http://localhost:5173,http://localhost:3000

# Backend Server URL (used for OAuth redirects)
SERVER_URL=https://amritdrive-backend.onrender.com

# Default Storage Limit for New Users in Bytes (10 GB = 10737418240 bytes)
DEFAULT_QUOTA_BYTES=10737418240

# Google OAuth 2.0 Credentials (Optional: required only for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 🚀 Quick Start & Local Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Ensure your `.env` file exists with your `MONGODB_URI` and `JWT_SECRET`.

### 3. Start the Server
* **Development Mode (with auto-reload via Nodemon):**
  ```bash
  npm run dev
  ```
* **Production Mode:**
  ```bash
  npm start
  ```

Once started, the backend will listen on:
```text
Server running on port http://localhost:5000
MongoDB Connected: cluster0-shard-00-00.xxx.mongodb.net
```

---

## 📖 Interactive Swagger API Documentation

The backend includes a fully interactive Swagger UI documentation page. You can inspect all endpoints, schemas, request parameters, and test API calls directly in your browser:

* **Live on Render:** [https://amritdrive-backend.onrender.com/api-docs](https://amritdrive-backend.onrender.com/api-docs)
* **Local Development:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
* **Short Redirect:** Visiting `/docs` automatically redirects to `/api-docs`.

> 💡 **Testing Protected Routes in Swagger:**
> 1. Run `POST /auth/login` to obtain your JWT token.
> 2. Click the green **Authorize 🔓** button at the top right of the Swagger UI.
> 3. Paste your token and click **Authorize**. All subsequent requests will automatically include the authentication header!

---

## 📡 Complete API Endpoints Overview

### 🔐 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create new account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Public | Sign in with email & password, returns JWT token |
| `GET` | `/api/auth/me` | Private | Get profile details and storage quota info |
| `POST` | `/api/auth/logout` | Private | Sign out user session |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth sign-in flow |
| `GET` | `/api/auth/google/callback`| Public | Google OAuth callback; redirects with token |

### 📁 2. File Management (`/api/files`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/files/upload` | Private | Upload file via `multipart/form-data` (max 25MB) |
| `GET` | `/api/files` | Private | List files with pagination (`page`, `limit`) & `search` |
| `GET` | `/api/files/:fileId` | Private | Get metadata for a specific file |
| `GET` | `/api/files/:fileId/download` | Private | Download file as an attachment |
| `GET` | `/api/files/:fileId/view` | Private | Stream file inline (for browser PDF, Image, Video preview) |
| `PUT` | `/api/files/:fileId/rename` | Private | Rename a file |
| `PUT` | `/api/files/:fileId/move` | Private | Move file to another folder |
| `PUT` | `/api/files/:fileId/remove-from-folder` | Private | Move file back to root |
| `DELETE` | `/api/files/:fileId` | Private | Permanently delete file from disk & free storage quota |
| `PUT` | `/api/files/:fileId/share` | Private | Toggle public sharing flag on file |
| `GET` | `/api/files/shared/:shareToken` | Public | Get public shared file metadata |
| `GET` | `/api/files/shared/:shareToken/download` | Public | Download shared file directly |

### 📂 3. Folder Management (`/api/folders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/folders` | Private | Create folder (`name`, optional `parentId`) |
| `GET` | `/api/folders` | Private | List folders in root or inside a parent folder |
| `GET` | `/api/folders/:folderId` | Private | Get details of a single folder |
| `PUT` | `/api/folders/:folderId` | Private | Rename a folder |
| `DELETE` | `/api/folders/:folderId` | Private | Delete empty folder |

### 🔗 4. Share Links (`/api/share`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/share` | Private | Generate share link (`fileId`, optional `expiresIn`, optional `password`) |
| `GET` | `/api/share` | Private | List all active share links created by the user |
| `GET` | `/api/share/:token` | Public | Browser redirect to frontend `/share/:token` |
| `GET` | `/api/share/:token/info` | Public | Get public file details and password requirement |
| `POST` | `/api/share/:token/download` | Public | Download file by verifying password (if protected) |
| `DELETE` | `/api/share/:shareId` | Private | Revoke and delete a share link |

### 🗑️ 5. Trash & Recovery (`/api/trash`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/trash` | Private | List all soft-deleted files and folders |
| `POST` | `/api/trash/move` | Private | Move file or folder to trash (`type`, `id`) |
| `POST` | `/api/trash/restore` | Private | Restore item from trash back to drive (`type`, `id`) |
| `DELETE` | `/api/trash/delete` | Private | Permanently delete a single item from trash |
| `DELETE` | `/api/trash/empty` | Private | Empty entire trash bin & free storage quota |

### 🩺 6. System Health (`/health`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health probe returning `{"status": "OK"}` |

---

## 💡 Key Features Explained in Simple Words

### 1. User Authentication (JWT + Google OAuth)
* When a user logs in, the server generates a signed **JWT (JSON Web Token)** with their user ID.
* The frontend includes this token in the request header: `Authorization: Bearer <token>`.
* The `auth.js` middleware validates the token, extracts the user ID, and attaches `req.user` to the request.
* If Google credentials are provided, users can also sign in via Google OAuth. If not provided, Google login is disabled safely without crashing the server.

### 2. File Storage & Quota Management
* Files uploaded via `/api/files/upload` are processed by **Multer**.
* Each user gets their own isolated folder on disk: `uploads/<userId>/<fileName>`.
* Before saving, the backend verifies that the user's `storageUsed + file.size` does not exceed their `storageLimit`.
* If an upload fails, is rejected, or is cancelled, the temporary file is automatically removed with `fs.unlinkSync` to avoid storage leaks.
* When files are permanently deleted, `user.storageUsed` is reduced automatically.

### 3. Folder Hierarchy & Organization
* Folders support unlimited nesting using a parent-child relationship (`parentId`).
* Root folders have `parentId: null`.
* Subfolders point to their parent folder's ID.
* When fetching root files or folders, `null` is checked consistently so child items never accidentally leak into the root view.

### 4. File Sharing with Passwords & Expiration
* Users can share any file by creating a 64-character cryptographic token (`crypto.randomBytes`).
* Links can be configured with:
  1. **Expiry in Days**: Expired links are automatically rejected.
  2. **Password Protection**: Passwords are saved with bcrypt hashing. Users must provide the correct password before the file can be downloaded.
* Public visitors only see public file info without seeing other user data.

### 5. Trash & Recovery System
* Moving an item to trash performs a **soft delete** (`isTrashed: true`, `trashedAt: new Date()`).
* If a folder is trashed, all contained files and subfolders are also marked as trashed.
* When restored, items return to their original location. If the original parent folder was permanently deleted, the item is restored to the root folder so the user never loses access.
* Emptying trash or permanently deleting a folder physically deletes all stored files on disk and recalculates the user's quota.

---

## 🐳 Docker Deployment

A production-ready [Dockerfile](file:///home/amritkeshari/amrit-drive-mern/backend/Dockerfile) is included:

```bash
# Build the Docker image
docker build -t amritdrive-backend ./backend

# Run the container
docker run -d \
  -p 5000:5000 \
  --env-file ./backend/.env \
  -v backend_uploads:/app/uploads \
  --name amritdrive-backend \
  amritdrive-backend
```

---

## ☁️ Production Deployment (Render)

1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Web Service**:
   * **Root Directory**: `backend`
   * **Environment**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
3. Add your Environment Variables in the Render Dashboard (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, etc.).
4. Render automatically assigns a dynamic `PORT` at runtime. The backend automatically binds to Render's port using `process.env.PORT || 5000`.
