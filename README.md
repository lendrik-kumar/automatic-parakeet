# Sprint Shoes API - Authentication Module

## Overview

This is a fully functional Node.js backend authentication module for Sprint Shoes e-commerce platform, built with Express, Prisma, TypeScript, and Redis.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache/Session**: Redis
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Zod schemas
- **Security**: Rate limiting, Helmet, CORS
- **Email**: Nodemailer
- **SMS**: Dummy service (easily replaceable with real provider)
- **Containerization**: Docker & Docker Compose

## Features Implemented

### User Authentication

- ✅ Multi-step registration with phone OTP verification
- ✅ Email verification flow
- ✅ Login with email/password
- ✅ Alternative login with phone/OTP
- ✅ JWT token-based authentication
- ✅ Refresh token mechanism
- ✅ Password reset flow
- ✅ Session management in Redis
- ✅ Email notifications (welcome, password reset, login alerts)

### Admin Authentication

- ✅ Admin login with email/password
- ✅ Role-based access control
- ✅ Session management
- ✅ Activity logging
- ✅ Multi-session support with session revocation

### Security

- ✅ Rate limiting on sensitive endpoints
- ✅ Password hashing with bcrypt
- ✅ JWT token validation
- ✅ Input validation with Zod
- ✅ CORS and Helmet security headers

### Services

- ✅ Email service with HTML templates
- ✅ SMS service (dummy implementation, production-ready interface)
- ✅ Redis-based OTP storage and verification
- ✅ Session management

## Project Structure

```
src/
├── app.ts                      # Express app configuration
├── controllers/
│   ├── user.controller.ts      # User auth logic
│   └── admin.controller.ts     # Admin auth logic
├── routes/
│   ├── user.routes.ts          # User auth endpoints
│   └── admin.routes.ts         # Admin auth endpoints
├── middlewares/
│   ├── auth.middleware.ts      # JWT authentication
│   └── rateLimiter.middleware.ts # Rate limiting
├── lib/
│   ├── prisma.ts               # Prisma client
│   ├── redis.ts                # Redis client & helpers
│   ├── email.ts                # Email service
│   └── sms.ts                  # SMS service
└── utils/
    └── errorHandler.ts         # Error handling
```

## API Endpoints

### User Authentication

```
POST   /api/user/auth/register/initiate-phone  # Start registration with phone
POST   /api/user/auth/register/verify-phone    # Verify OTP
POST   /api/user/auth/register/complete        # Complete registration
POST   /api/user/auth/login/request-otp        # Request login OTP
POST   /api/user/auth/login/phone              # Login with phone/OTP
POST   /api/user/auth/login                    # Login with email/password
POST   /api/user/auth/logout                   # Logout
POST   /api/user/auth/refresh                  # Refresh access token
POST   /api/user/auth/forgot-password          # Request password reset
POST   /api/user/auth/reset-password           # Reset password
GET    /api/user/auth/me                       # Get current user (protected)
```

### Admin Authentication

```
POST   /api/admin/auth/login                   # Admin login
POST   /api/admin/auth/logout                  # Admin logout
POST   /api/admin/auth/refresh                 # Refresh admin token
GET    /api/admin/auth/me                      # Get current admin (protected)
GET    /api/admin/auth/activity-logs           # Get activity logs (protected)
DELETE /api/admin/auth/sessions/:sessionId     # Revoke session (protected)
```

## Environment Variables

See `.env.example` for all required environment variables:

- Database configuration (PostgreSQL)
- Redis configuration
- JWT secrets
- Email provider settings
- SMS provider settings

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment file:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your configuration

### Start with Docker Compose

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Or start everything including the app
docker-compose up -d
```

### Development

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

### Build for Production

```bash
npm run build
npm start
```

## Testing

Comprehensive test suite included covering:

- User registration flow (all steps)
- User login (email and phone/OTP)
- Token refresh and validation
- Password reset flow
- Admin authentication
- Rate limiting
- Input validation
- Email and SMS service invocation

Tests use Jest and Supertest with proper mocking of external dependencies.

## Architecture Highlights

### Multi-layer Architecture

- **Routes Layer**: HTTP routing only, no business logic
- **Controller Layer**: Business logic, validation, orchestration
- **Service Layer**: External communications (email, SMS)
- **Data Layer**: Prisma ORM for database operations

### Session Management

- JWT access tokens (short-lived)
- Refresh tokens stored in database
- Redis for temporary data (OTPs, password reset tokens)

### Security Features

- Rate limiting: 5 requests/15min for auth, 3 requests/15min for OTP
- Password complexity requirements
- Token expiration
- Account status checks
- Activity logging for admins

## Database Schema

The project uses Prisma with modular schema files in `prisma/schemas/`:

- User and UserSession models
- Admin, AdminSession, and AdminActivityLog models
- Full e-commerce schema (products, orders, cart, etc.)

## Future Enhancements

- [ ] Email verification enforcement
- [ ] 2FA support
- [ ] OAuth integration (Google, Facebook, etc.)
- [ ] Replace dummy SMS with real provider (Twilio, Fast2SMS, etc.)
- [ ] Replace Nodemailer with Resend or SendGrid
- [ ] Add WebSocket for real-time notifications
- [ ] Implement admin permissions system

## Author

Built as a complete authentication module for Sprint Shoes e-commerce platform.

## License

ISC
