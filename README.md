# KolajBot API v3.0.0

## 🚀 AI-Powered Automatic Collage & Brand Management Platform

Enterprise-grade brand management platform with automatic collage generation, built with **Node.js**, **PostgreSQL**, and **MVC/OOP architecture**.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Core Features
- **Authentication & Authorization** - JWT-based auth with role-based access control (RBAC)
- **User Management** - Complete user CRUD with role assignments
- **Brand Management** - Multi-brand support with category organization
- **Product Management** - Product catalog with AI-powered data extraction
- **Template System** - Dynamic template generation for collages
- **Social Media Integration** - Telegram & WhatsApp integration
- **File Upload & CDN** - Bunny CDN integration for asset management
- **AI Services** - OCR, price extraction, label extraction

### Enterprise Features
- **Layered Architecture** - Clean MVC/OOP design
- **Database Connection Pooling** - Optimized PostgreSQL connections
- **Error Handling** - Centralized error management
- **Logging** - Structured logging with Winston
- **Security** - Helmet, CORS, rate limiting
- **Validation** - Joi-based request validation
- **Performance** - Compression, caching strategies

---

## 🏗️ Architecture

### Layered Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Controllers, Routes, Middleware)      │
├─────────────────────────────────────────┤
│       Business Logic Layer              │
│          (Services)                     │
├─────────────────────────────────────────┤
│       Data Access Layer                 │
│      (Models, Repositories)             │
├─────────────────────────────────────────┤
│          Core Layer                     │
│ (Database, Logger, Error Handler)       │
└─────────────────────────────────────────┘
```

### Design Patterns
- **MVC Pattern** - Model-View-Controller separation
- **Repository Pattern** - Data access abstraction
- **Service Layer Pattern** - Business logic encapsulation
- **Singleton Pattern** - Single instances for services
- **Factory Pattern** - Object creation abstraction
- **Middleware Pattern** - Request/response pipeline

---

## 💻 Tech Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Language**: JavaScript (ES6+ modules)

### Key Dependencies
- **pg** - PostgreSQL client
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **joi** - Input validation
- **winston** - Logging
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **compression** - Response compression
- **express-rate-limit** - Rate limiting

---

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 9.0.0

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd kolajBot
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Configure environment variables** (see [Configuration](#configuration))

---

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=8000
API_PREFIX=/api

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kolajbot_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=20

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=3600000

# External Services
GOOGLE_AI_API_KEY=your-google-ai-key
BUNNY_CDN_API_KEY=your-bunny-cdn-key
TELEGRAM_BOT_TOKEN=your-telegram-token
```

See `.env.example` for complete configuration options.

---

## 🗄️ Database Setup

### Create Database
```bash
createdb kolajbot_db
```

### Run Migrations
```bash
psql -U postgres -d kolajbot_db -f src/database/migrations/001_create_initial_schema.sql
```

### Seed Initial Data
```bash
psql -U postgres -d kolajbot_db -f src/database/seeds/001_seed_initial_data.sql
```

### Default Admin Credentials
```
Email: admin@kolajbot.com
Password: Admin@123
```

**⚠️ IMPORTANT: Change the default password immediately after first login!**

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Application will be available at:
```
http://localhost:8000
```

### API Base URL:
```
http://localhost:8000/api
```

---

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role_id": 2
}
```

#### POST /api/auth/login
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Get current user (requires authentication)

### User Management Endpoints

#### GET /api/users
Get all users (requires `users.view` permission)

Query Parameters:
- `page` (number) - Page number
- `limit` (number) - Items per page
- `role_id` (number) - Filter by role
- `is_active` (boolean) - Filter by active status

#### GET /api/users/:id
Get user by ID

#### POST /api/users
Create new user (requires `users.create` permission)

#### PUT /api/users/:id
Update user (requires `users.edit` permission)

#### DELETE /api/users/:id
Delete user (requires `users.delete` permission)

### Health Check
#### GET /api/health
Check API health status

---

## 📁 Project Structure

```
kolajBot/
├── src/
│   ├── config/              # Configuration files
│   │   ├── app.config.js
│   │   ├── database.config.js
│   │   └── env.js
│   ├── core/                # Core utilities
│   │   ├── database.js
│   │   ├── logger.js
│   │   ├── error-handler.js
│   │   └── response.js
│   ├── models/              # Data models (ORM)
│   │   ├── base.model.js
│   │   ├── user.model.js
│   │   ├── role.model.js
│   │   ├── brand.model.js
│   │   └── product.model.js
│   ├── services/            # Business logic
│   │   ├── auth.service.js
│   │   └── user.service.js
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.js
│   │   └── user.controller.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.js
│   │   ├── permission.middleware.js
│   │   ├── validation.middleware.js
│   │   └── error.middleware.js
│   ├── routes/              # API routes
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── database/            # Database files
│   │   ├── migrations/
│   │   └── seeds/
│   └── app.js               # Application entry point
├── logs/                    # Log files
├── uploads/                 # File uploads
├── .env                     # Environment variables
├── .env.example             # Example environment file
├── package.json             # Dependencies
└── README.md                # Documentation
```

---

## 🛠️ Development

### Code Style
- ES6+ modules (import/export)
- Async/await for asynchronous operations
- JSDoc comments for documentation
- Consistent naming conventions

### Best Practices
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Error handling with try-catch
- Input validation on all endpoints
- Logging for debugging and monitoring

---

## 🔐 Security Features

- **Password Hashing** - bcrypt with configurable rounds
- **JWT Authentication** - Stateless authentication
- **Account Locking** - After failed login attempts
- **Role-Based Access Control** - Permission system
- **Rate Limiting** - API request throttling
- **Security Headers** - Helmet.js integration
- **CORS** - Configurable origins
- **Input Validation** - Joi schemas

---

## 📊 Performance Optimizations

- Database connection pooling
- Response compression
- Efficient indexing
- Pagination for large datasets
- Caching strategies
- Query optimization

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Authors

**Pofuduk Digital**
- Website: https://pofudukdijital.com
- Email: info@kolajbot.com

---

## 🙏 Acknowledgments

- Express.js community
- PostgreSQL team
- All open-source contributors

---

## 📞 Support

For support, email info@kolajbot.com or open an issue in the repository.

---

**Made with ❤️ by Pofuduk Digital**
