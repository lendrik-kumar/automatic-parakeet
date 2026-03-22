# AGENTS.md - Sprint Shoes E-Commerce Backend

This guide provides essential information for AI coding agents working in this repository.

## Project Overview

**Stack**: Node.js + Express + TypeScript (ESM) + Prisma ORM + PostgreSQL + Redis + JWT Auth

**Architecture**: Layered architecture with clear separation of concerns
- Routes → Controllers → Services → Repositories → Database

**Key Features**: E-commerce platform for shoe store with admin/client authentication, products, inventory, cart, orders, payments, shipping, returns, and more.

---

## Build, Lint, and Test Commands

```bash
# Development
npm run dev                    # Start dev server with tsx watch
npm run lint                   # Run ESLint on src/
npm run lint:fix              # Auto-fix ESLint issues

# Build
npm run build                  # Lint + compile TypeScript to dist/
npm start                      # Run production build

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run database migrations
npm run seed                   # Seed database with test data
npm run db:seed               # Alternative seed command

# Tests
# ⚠️ No test command currently configured in package.json
# When adding tests, use: jest <test-file-path>
# Single test: jest tests/path/to/file.test.ts
# With pattern: jest --testPathPattern=user
```

**Note**: The project uses ES modules (`"type": "module"`). All imports must use `.js` extensions.

---

## Project Structure

```
src/
├── app.ts                     # Entry point, Express setup, middleware
├── controllers/               # HTTP handlers (validation, request/response)
├── services/                  # Business logic layer
├── repositories/              # Data access layer (Prisma queries)
├── routes/                    # Route definitions
├── middlewares/               # Auth, rate limiting, error handling
├── lib/                       # External services (Prisma, Redis, SMS, Email)
├── utils/                     # Helpers (slugify, errorHandler)
└── generated/prisma/          # Auto-generated Prisma types
    ├── models/
    ├── enums.ts
    └── client.ts
```

---

## Code Style Guidelines

### 1. Import Conventions

**Order**: External deps → Services → Repositories → Libs → Utils → Types

```typescript
// External dependencies (grouped)
import { Request, Response } from "express";
import { z } from "zod";

// Internal services (namespace alias pattern)
import * as svc from "../services/user-auth.service.js";

// Repository imports
import { userRepository } from "../repositories/user.repository.js";

// Library imports
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

// Utility imports
import { slugify } from "../utils/slugify.js";

// Type-only imports (use 'type' keyword)
import type { UserStatus } from "../generated/prisma/enums.js";
```

**Rules**:
- ✅ **Always use `.js` extension** (ESM requirement)
- ✅ **Relative imports** for internal modules (no absolute paths)
- ✅ **Namespace aliases** (`* as svc`) for service imports in controllers
- ✅ Use `import type` for type-only imports

### 2. Naming Conventions

**Files**: `kebab-case` with suffixes
- Controllers: `user-auth.controller.ts`
- Services: `product.service.ts`
- Repositories: `cart.repository.ts`
- Routes: `admin-products.routes.ts`
- Middleware: `auth.middleware.ts`

**Functions**: `camelCase`
- Standard: `getUserProfile`, `createProduct`, `updateInventory`
- Context prefixes: `adminCreateProduct`, `clientListProducts`
- HTTP verbs: `getCart`, `addItem`, `updateItem`, `removeItem`
- All I/O operations must be `async`

**Variables**: `camelCase` for regular, `UPPER_SNAKE_CASE` for constants
```typescript
const userId = "123";
const JWT_SECRET = process.env.JWT_SECRET;
```

**Classes**: `PascalCase` with descriptive suffixes
```typescript
class AuthError extends Error { }
class ProductError extends Error { }
```

**Repository/Service Exports**: Object literal pattern
```typescript
export const userRepository = {
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: CreateUserInput) => prisma.user.create({ data }),
};
```

### 3. Type Usage

**Define interfaces for repository inputs**:
```typescript
export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  // Use partial for updates
}
```

**Use generated Prisma types**:
```typescript
import type { Gender, ProductStatus, UserStatus } from "../generated/prisma/enums.js";
```

**Express type augmentation** (when needed):
```typescript
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; email: string; role?: string };
    admin?: { id: string; email: string; roleId: string };
  }
}
```

### 4. Error Handling

**Custom error classes per domain** (in service files):
```typescript
export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// Usage: throw new AuthError(401, "Invalid credentials");
```

**Centralized error handler in every controller**:
```typescript
const handleError = (res: Response, error: unknown): void => {
  // 1. Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.issues,
    });
    return;
  }
  
  // 2. Custom service errors
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ 
      success: false, 
      message: error.message 
    });
    return;
  }
  
  // 3. Unknown errors
  console.error("[ControllerName]", error);
  res.status(500).json({ 
    success: false, 
    message: "Internal server error" 
  });
};
```

**Response format**:
```typescript
// Success: { success: true, message?: string, data?: {...} }
// Error: { success: false, message: string, errors?: ZodIssue[] }
```

### 5. Validation with Zod

**Define schemas at top of controller files**:
```typescript
const createUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
});

// Use .partial() for updates
const updateUserSchema = createUserSchema.partial();
```

**Validate in controller handler**:
```typescript
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createUserSchema.parse(req.body);
    // ... use validated data
  } catch (e) {
    handleError(res, e); // Catches ZodError automatically
  }
};
```

### 6. Authentication & Authorization

**Two-token system**:
- Access Token: Short-lived JWT (15 min)
- Refresh Token: Opaque 64-byte hex, stored in database

**Middleware usage**:
```typescript
// Protect routes
userRouter.get("/auth/me", authenticateUser, getCurrentUser);
adminRouter.get("/products", authenticateAdmin, adminListProducts);

// Apply to entire router
cartRouter.use(authenticateUser);
```

**Access authenticated user**:
```typescript
const userId = req.user!.id;      // In user routes
const adminId = req.admin!.id;    // In admin routes
```

### 7. Controller Pattern

**Standard controller function signature**:
```typescript
export const handlerName = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Validate input
    const data = schema.parse(req.body);
    
    // 2. Call service
    const result = await svc.serviceFunction(data);
    
    // 3. Send response
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};
```

### 8. Service Layer Patterns

**Service functions export individually**:
```typescript
export const createProduct = async (adminId: string, data: CreateProductInput) => {
  // 1. Transform/validate data
  const slug = slugify(data.name);
  
  // 2. Call repository
  const product = await productRepository.create({ ...data, slug });
  
  // 3. Log admin activity (for admin operations)
  await adminRepository.logActivity(adminId, "CREATE", "Product", product.id);
  
  // 4. Fire-and-forget notifications (optional)
  sendNotificationEmail(...).catch(console.error);
  
  // 5. Return result
  return product;
};
```

### 9. Repository Pattern

**Object literal exports with Prisma**:
```typescript
export const productRepository = {
  findById: (id: string) => 
    prisma.product.findUnique({ where: { id } }),
  
  findMany: (options: { skip?: number; take?: number; where?: any }) =>
    prisma.product.findMany(options),
  
  create: (data: CreateProductInput) =>
    prisma.product.create({ data }),
  
  update: (id: string, data: UpdateProductInput) =>
    prisma.product.update({ where: { id }, data }),
};
```

---

## Common Patterns

### Rate Limiting
Apply appropriate limiters from `middlewares/rateLimiter.middleware.ts`:
- `authLimiter` - 5 requests / 15 min (login/register)
- `otpLimiter` - 10 requests / 15 min
- `passwordResetLimiter` - 3 requests / 15 min
- `generalLimiter` - 100 requests / 15 min

### Pagination
```typescript
const page = query.page || 1;
const limit = query.limit || 20;
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  repository.findMany({ skip, take: limit }),
  repository.count(),
]);

return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
```

### Section Comments
Use section separators for organization:
```typescript
// ─── Major Section ─────────────────────────────────────────────────────────────

// ── Subsection ──────────────────────────────────────────────────────────────
```

---

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `JWT_SECRET` or `BETTER_AUTH_SECRET` - Auth secrets
- `RESEND_API_KEY` - Email service
- `FAST2SMS_API_KEY` - SMS service (optional)
- `FRONTEND_URL` - CORS configuration

---

## Development Workflow

1. **Start dependencies**: `docker-compose up -d` (PostgreSQL + Redis)
2. **Generate Prisma**: `npm run prisma:generate`
3. **Run migrations**: `npm run prisma:migrate`
4. **Seed database**: `npm run seed` (optional)
5. **Start dev server**: `npm run dev`
6. **Before commit**: `npm run lint:fix` then `npm run build`

---

## Key Principles

- **Never hard delete** - Always archive/soft delete (set status to DELETED/ARCHIVED)
- **Log admin actions** - Use `adminRepository.logActivity()` for audit trail
- **Type safety** - Use TypeScript strict mode, no `any` types
- **Error messages** - User-friendly messages in responses, detailed logs in console
- **Async/await** - All database/external operations must be async
- **ES Modules** - Always use `.js` extensions in imports
