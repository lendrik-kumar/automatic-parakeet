# Admin Portal - Design & Architecture Guide

**Sprint Shoes E-Commerce Platform**  
**Stack**: React/Next.js + TypeScript + Tailwind CSS + shadcn/ui

This document provides comprehensive guidance for building a production-ready admin portal from scratch using the Sprint Shoes backend API.

---

## Table of Contents

1. [Tech Stack & Setup](#1-tech-stack--setup)
2. [Project Structure](#2-project-structure)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Core Features & Modules](#4-core-features--modules)
5. [UI/UX Design System](#5-uiux-design-system)
6. [Component Architecture](#6-component-architecture)
7. [State Management](#7-state-management)
8. [API Integration](#8-api-integration)
9. [Forms & Validation](#9-forms--validation)
10. [Tables & Data Display](#10-tables--data-display)
11. [File Uploads & Media](#11-file-uploads--media)
12. [Real-time Features](#12-real-time-features)
13. [Performance Optimization](#13-performance-optimization)
14. [Security Best Practices](#14-security-best-practices)
15. [Deployment & DevOps](#15-deployment--devops)

---

## 1. Tech Stack & Setup

### 1.1 Core Technologies

```json
{
  "framework": "Next.js 14+ (App Router)",
  "language": "TypeScript 5+",
  "styling": "Tailwind CSS 3.4+",
  "ui-library": "shadcn/ui",
  "state": "Zustand / React Query",
  "forms": "React Hook Form + Zod",
  "charts": "Recharts / Chart.js",
  "tables": "@tanstack/react-table",
  "http": "Axios / Fetch API",
  "date": "date-fns",
  "icons": "Lucide React",
  "notifications": "sonner"
}
```

### 1.2 Initial Setup

```bash
# Create Next.js project with TypeScript and Tailwind
npx create-next-app@latest admin-portal --typescript --tailwind --app --eslint

cd admin-portal

# Install shadcn/ui
npx shadcn-ui@latest init

# Install dependencies
npm install axios react-hook-form zod @hookform/resolvers
npm install zustand @tanstack/react-query @tanstack/react-table
npm install date-fns lucide-react sonner recharts
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-toast
npm install clsx tailwind-merge class-variance-authority

# Install dev dependencies
npm install -D @types/node
```

### 1.3 Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_NAME=Sprint Shoes Admin
NEXT_PUBLIC_ITEMS_PER_PAGE=20
```

---

## 2. Project Structure

```
admin-portal/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Dashboard layout group
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx          # Product list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Create product
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Product details
│   │   │       └── edit/
│   │   │           └── page.tsx  # Edit product
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── inventory/
│   │   ├── analytics/
│   │   ├── marketing/
│   │   ├── returns/
│   │   ├── reviews/
│   │   ├── settings/
│   │   └── layout.tsx            # Dashboard layout
│   ├── api/                      # API routes (optional proxy)
│   ├── layout.tsx                # Root layout
│   └── globals.css
│
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── forms/                    # Form components
│   │   ├── ProductForm.tsx
│   │   ├── OrderForm.tsx
│   │   └── ...
│   ├── tables/                   # Table components
│   │   ├── ProductsTable.tsx
│   │   ├── OrdersTable.tsx
│   │   └── ...
│   ├── charts/                   # Chart components
│   │   ├── SalesChart.tsx
│   │   ├── RevenueChart.tsx
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Breadcrumbs.tsx
│   └── shared/                   # Shared components
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       └── ...
│
├── lib/                          # Utilities & helpers
│   ├── api/                      # API client
│   │   ├── client.ts             # Axios instance
│   │   ├── auth.ts               # Auth API calls
│   │   ├── products.ts           # Product API calls
│   │   ├── orders.ts
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useOrders.ts
│   │   └── ...
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── ...
│   ├── utils/                    # Utility functions
│   │   ├── cn.ts                 # Class name merger
│   │   ├── formatters.ts         # Date, currency formatters
│   │   ├── validators.ts         # Validation helpers
│   │   └── constants.ts
│   └── types/                    # TypeScript types
│       ├── api.ts                # API response types
│       ├── models.ts             # Data models
│       └── enums.ts
│
├── public/                       # Static assets
│   ├── images/
│   └── icons/
│
├── styles/                       # Additional styles
│   └── custom.css
│
├── middleware.ts                 # Next.js middleware (auth)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Authentication & Authorization

### 3.1 Auth Store (Zustand)

`lib/stores/authStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  setAuth: (admin: Admin, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (admin, accessToken, refreshToken) =>
        set({
          admin,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          admin: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      updateTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      hasPermission: (permission) => {
        const { admin } = get();
        if (!admin?.role?.permissions) return false;
        return admin.role.permissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 3.2 API Client with Auto Token Refresh

`lib/api/client.ts`:
```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { refreshToken, updateTokens, clearAuth } = useAuthStore.getState();
      
      if (!refreshToken) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        const response = await axios.post(`${API_BASE_URL}/admin/auth/refresh`, {
          refreshToken,
        });
        
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
        
        updateTokens(newAccessToken, newRefreshToken);
        
        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 3.3 Auth API Functions

`lib/api/auth.ts`:
```typescript
import apiClient from './client';
import { useAuthStore } from '../stores/authStore';

interface LoginResponse {
  success: boolean;
  data: {
    admin: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: {
        id: string;
        name: string;
        permissions: string[];
      };
    };
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<LoginResponse>('/admin/auth/login', {
      email,
      password,
    });
    
    const { admin, accessToken, refreshToken } = response.data.data;
    useAuthStore.getState().setAuth(admin, accessToken, refreshToken);
    
    return response.data;
  },

  logout: async () => {
    const { refreshToken } = useAuthStore.getState();
    
    try {
      await apiClient.post('/admin/auth/logout', { refreshToken });
    } finally {
      useAuthStore.getState().clearAuth();
    }
  },

  getCurrentAdmin: async () => {
    const response = await apiClient.get('/admin/auth/me');
    return response.data.data.admin;
  },
};
```

### 3.4 Auth Middleware

`middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth-storage');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/products') ||
                          request.nextUrl.pathname.startsWith('/orders');

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if accessing login while authenticated
  if (isAuthPage && authCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/products/:path*', '/orders/:path*', '/login'],
};
```

### 3.5 Protected Route HOC

`components/auth/ProtectedRoute.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, hasPermission } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, requiredPermission, hasPermission, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## 4. Core Features & Modules

### 4.1 Dashboard Module

**Features:**
- Overview statistics (total revenue, orders, customers, products)
- Recent orders list
- Sales chart (daily/weekly/monthly)
- Top selling products
- Low stock alerts
- Recent customer reviews

**Key Components:**
- `StatCard` - Display metric with trend
- `SalesChart` - Revenue/sales over time
- `RecentOrdersTable` - Latest orders
- `TopProductsCard` - Best sellers
- `AlertsCard` - Low stock notifications

### 4.2 Products Module

**Features:**
- Product listing with filters (category, brand, status, price range)
- Product creation (multi-step form)
- Product editing
- Variant management (sizes, colors, inventory)
- Bulk operations (status change, price update, delete)
- Image upload and management
- SEO metadata
- Product specifications

**Pages:**
- `products/page.tsx` - List view
- `products/new/page.tsx` - Create product
- `products/[id]/page.tsx` - Product details
- `products/[id]/edit/page.tsx` - Edit product

**Key Components:**
- `ProductsTable` - Filterable product list
- `ProductForm` - Multi-step form
- `VariantManager` - Manage product variants
- `ImageUploader` - Drag-and-drop image upload
- `InventoryManager` - Stock management
- `BulkActionsToolbar` - Bulk operations

### 4.3 Orders Module

**Features:**
- Order listing with filters (status, date range, customer)
- Order details view
- Order status management
- Shipment tracking integration
- Invoice generation
- Refund processing
- Order timeline

**Pages:**
- `orders/page.tsx` - List view
- `orders/[id]/page.tsx` - Order details

**Key Components:**
- `OrdersTable` - Filterable order list
- `OrderDetailsCard` - Order information
- `OrderStatusTimeline` - Order progress
- `ShipmentTracker` - Tracking integration
- `RefundDialog` - Process refunds

### 4.4 Customers Module

**Features:**
- Customer listing with search
- Customer details and order history
- Customer segmentation
- Activity log
- Account management

### 4.5 Inventory Module

**Features:**
- Real-time stock levels
- Low stock alerts
- Inventory adjustments
- Stock history
- Reorder management

### 4.6 Analytics Module

**Features:**
- Sales analytics (revenue, profit, AOV)
- Product performance
- Customer insights
- Traffic sources
- Conversion rates
- Custom date ranges
- Export reports

**Key Charts:**
- Revenue over time (line chart)
- Sales by category (pie chart)
- Top products (bar chart)
- Customer acquisition (area chart)

### 4.7 Marketing Module

**Features:**
- Coupon management (create, edit, deactivate)
- Collections management
- Featured products
- Banner management
- Email campaigns

### 4.8 Returns & Refunds Module

**Features:**
- Return request listing
- Return approval/rejection
- Refund processing
- Return reason analytics

### 4.9 Reviews Module

**Features:**
- Review moderation (approve/reject)
- Review filtering
- Customer rating analytics
- Flagged reviews

### 4.10 Settings Module

**Features:**
- General settings (store name, contact, timezone)
- Shipping rules management
- Tax rules configuration
- Payment settings
- Admin role management
- Activity logs

---

## 5. UI/UX Design System

### 5.1 Color Palette

Using shadcn/ui theming with Tailwind:

```css
/* globals.css */
@layer base {
  :root {
    /* Primary - Brand color */
    --primary: 221 83% 53%;          /* #2563eb - Blue */
    --primary-foreground: 0 0% 100%;
    
    /* Secondary - Accent color */
    --secondary: 142 76% 36%;        /* #16a34a - Green */
    --secondary-foreground: 0 0% 100%;
    
    /* Destructive - Error/danger */
    --destructive: 0 84% 60%;        /* #ef4444 - Red */
    --destructive-foreground: 0 0% 100%;
    
    /* Muted - Subtle backgrounds */
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    
    /* Accent - Highlights */
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    
    /* Background & Foreground */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    
    /* Card */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    
    /* Popover */
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    
    /* Border */
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    
    /* Ring - Focus states */
    --ring: 221 83% 53%;
    
    /* Radius */
    --radius: 0.5rem;
  }
  
  .dark {
    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 11%;
    
    --secondary: 142 76% 36%;
    --secondary-foreground: 0 0% 100%;
    
    --destructive: 0 62% 30%;
    --destructive-foreground: 0 0% 100%;
    
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    
    --card: 224 71% 4%;
    --card-foreground: 213 31% 91%;
    
    --popover: 224 71% 4%;
    --popover-foreground: 213 31% 91%;
    
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    
    --ring: 224 76% 48%;
  }
}
```

### 5.2 Typography

```typescript
// lib/utils/typography.ts
export const typography = {
  h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
  h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
  h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
  h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
  p: 'leading-7 [&:not(:first-child)]:mt-6',
  lead: 'text-xl text-muted-foreground',
  large: 'text-lg font-semibold',
  small: 'text-sm font-medium leading-none',
  muted: 'text-sm text-muted-foreground',
};
```

### 5.3 Spacing & Layout

```typescript
// Standard spacing scale (Tailwind default)
const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};

// Container widths
const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

### 5.4 Component Variants

Using `class-variance-authority`:

```typescript
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Usage:
<Badge variant="success">Active</Badge>
<Badge variant="warning">Low Stock</Badge>
<Badge variant="destructive">Out of Stock</Badge>
```

### 5.5 Status Colors

```typescript
// lib/utils/status-colors.ts
export const statusColors = {
  // Order status
  order: {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
    PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
    SHIPPED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  },
  
  // Product status
  product: {
    ACTIVE: 'bg-green-100 text-green-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    ARCHIVED: 'bg-orange-100 text-orange-800',
    DISCONTINUED: 'bg-red-100 text-red-800',
  },
  
  // Payment status
  payment: {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
  },
};

// Usage component
export function StatusBadge({ 
  status, 
  type 
}: { 
  status: string; 
  type: 'order' | 'product' | 'payment' 
}) {
  const colorClass = statusColors[type][status as keyof typeof statusColors[typeof type]];
  
  return (
    <Badge className={colorClass}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

---

## 6. Component Architecture

### 6.1 Atomic Design Pattern

Follow atomic design methodology:

**Atoms** (smallest building blocks):
- Button, Input, Label, Badge, Avatar, Icon

**Molecules** (simple combinations):
- FormField (Label + Input + Error)
- SearchBar (Input + Icon + Button)
- StatCard (Icon + Title + Value + Trend)

**Organisms** (complex combinations):
- DataTable (Search + Filters + Table + Pagination)
- ProductForm (Multiple FormFields + Validation)
- Sidebar (Logo + Navigation + User Menu)

**Templates** (page layouts):
- DashboardLayout (Sidebar + Header + Content)
- AuthLayout (Centered card)

**Pages** (specific instances):
- Products List Page
- Order Details Page

### 6.2 Example: Stat Card Component

`components/dashboard/StatCard.tsx`:
```typescript
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description 
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend.isPositive ? (
              <ArrowUpIcon className="mr-1 h-3 w-3 text-green-600" />
            ) : (
              <ArrowDownIcon className="mr-1 h-3 w-3 text-red-600" />
            )}
            <span className={cn(
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {Math.abs(trend.value)}%
            </span>
            <span className="ml-1">from last month</span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Usage:
<StatCard
  title="Total Revenue"
  value="$45,231.89"
  icon={DollarSignIcon}
  trend={{ value: 20.1, isPositive: true }}
  description="Revenue from all orders"
/>
```

### 6.3 Example: Data Table with Filters

`components/tables/DataTable.tsx`:
```typescript
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  filterOptions?: {
    key: string;
    label: string;
    options: { label: string; value: string }[];
  }[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  filterOptions,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {searchKey && (
          <Input
            placeholder={`Search ${searchKey}...`}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        )}
        
        {filterOptions?.map((filter) => (
          <Select key={filter.key}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

---

## 7. State Management

### 7.1 Zustand for Global State

**Auth State**: Already covered in section 3.1

**UI State**:
```typescript
// lib/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
}));
```

### 7.2 React Query for Server State

`lib/hooks/useProducts.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { toast } from 'sonner';

export function useProducts(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      productsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });
}
```

---

## 8. API Integration

### 8.1 Products API

`lib/api/products.ts`:
```typescript
import apiClient from './client';
import type { Product, CreateProductInput, UpdateProductInput } from '../types/models';

export const productsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    category?: string;
    brand?: string;
  }) => {
    const response = await apiClient.get('/admin/products', { params });
    return response.data.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/admin/products/${id}`);
    return response.data.data.product;
  },

  create: async (data: CreateProductInput) => {
    const response = await apiClient.post('/admin/products', data);
    return response.data.data.product;
  },

  update: async (id: string, data: UpdateProductInput) => {
    const response = await apiClient.patch(`/admin/products/${id}`, data);
    return response.data.data.product;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/admin/products/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/admin/products/${id}/status`, { status });
    return response.data.data.product;
  },

  bulkUpdateStatus: async (productIds: string[], status: string) => {
    const response = await apiClient.patch('/admin/products/bulk/status', {
      productIds,
      status,
    });
    return response.data;
  },

  // Variants
  createVariant: async (productId: string, data: any) => {
    const response = await apiClient.post(
      `/admin/products/${productId}/variants`,
      data
    );
    return response.data.data.variant;
  },

  updateVariant: async (productId: string, variantId: string, data: any) => {
    const response = await apiClient.patch(
      `/admin/products/${productId}/variants/${variantId}`,
      data
    );
    return response.data.data.variant;
  },

  deleteVariant: async (productId: string, variantId: string) => {
    const response = await apiClient.delete(
      `/admin/products/${productId}/variants/${variantId}`
    );
    return response.data;
  },
};
```

### 8.2 Orders API

`lib/api/orders.ts`:
```typescript
import apiClient from './client';

export const ordersApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/admin/orders', { params });
    return response.data.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data.data.order;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/admin/orders/${id}/status`, { status });
    return response.data.data.order;
  },

  getStats: async () => {
    const response = await apiClient.get('/admin/analytics/orders/stats');
    return response.data.data;
  },
};
```

---

## 9. Forms & Validation

### 9.1 Product Form with Zod

`lib/schemas/product.ts`:
```typescript
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  brand: z.string().min(1, 'Brand is required'),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  gender: z.enum(['MEN', 'WOMEN', 'UNISEX', 'KIDS']),
  shoeType: z.string().min(1, 'Shoe type is required'),
  category: z.string().min(1, 'Category is required'),
  basePrice: z.number().positive('Price must be positive'),
  featuredProduct: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

`components/forms/ProductForm.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '@/lib/schemas/product';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
}

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '',
      brand: '',
      description: '',
      gender: 'UNISEX',
      shoeType: '',
      category: '',
      basePrice: 0,
      featuredProduct: false,
      newArrival: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Air Max 90" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Nike" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Detailed product description..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEN">Men</SelectItem>
                      <SelectItem value="WOMEN">Women</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                      <SelectItem value="KIDS">Kids</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="129.99"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Features</h3>
          
          <FormField
            control={form.control}
            name="featuredProduct"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Featured Product</FormLabel>
                  <FormDescription>
                    Display this product in the featured section
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newArrival"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">New Arrival</FormLabel>
                  <FormDescription>
                    Mark this product as a new arrival
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## 10. Tables & Data Display

### 10.1 Products Table Columns

`app/(dashboard)/products/columns.tsx`:
```typescript
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatters';
import type { Product } from '@/lib/types/models';

export const productColumns: ColumnDef<Product>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Product Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex items-center gap-3">
          <img
            src={product.thumbnail || '/placeholder.png'}
            alt={product.name}
            className="h-10 w-10 rounded object-cover"
          />
          <div>
            <div className="font-medium">{product.name}</div>
            <div className="text-sm text-muted-foreground">{product.brand}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'basePrice',
    header: 'Price',
    cell: ({ row }) => formatCurrency(row.getValue('basePrice')),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.getValue('status')} type="product" />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(product.id)}
            >
              Copy product ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit product</DropdownMenuItem>
            <DropdownMenuItem>Manage variants</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

---

## 11. File Uploads & Media

### 11.1 Image Upload Component

`components/shared/ImageUploader.tsx`:
```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value?: string[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
}

export function ImageUploader({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>(value);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, maxFiles));
    onChange(acceptedFiles);
  }, [maxFiles, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles,
    maxSize,
  });

  const removeImage = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-sm text-muted-foreground">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-sm font-medium mb-1">
              Drag & drop images here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to {maxSize / 1024 / 1024}MB (max {maxFiles} images)
            </p>
          </div>
        )}
      </div>

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 12. Real-time Features

### 12.1 Real-time Order Updates (WebSocket/Polling)

```typescript
// lib/hooks/useRealTimeOrders.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealTimeOrders() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Poll for new orders every 30 seconds
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient]);
}

// For WebSocket implementation:
export function useOrderWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws/orders');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'NEW_ORDER') {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        // Show notification
        toast.info(`New order received: ${data.orderNumber}`);
      }
    };

    return () => ws.close();
  }, [queryClient]);
}
```

---

## 13. Performance Optimization

### 13.1 Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={product.thumbnail}
  alt={product.name}
  width={200}
  height={200}
  className="rounded-lg"
  loading="lazy"
/>
```

### 13.2 Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const ChartComponent = dynamic(() => import('@/components/charts/SalesChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### 13.3 Memoization

```typescript
import { useMemo } from 'react';

function ProductList({ products }) {
  const sortedProducts = useMemo(() => {
    return products.sort((a, b) => b.createdAt - a.createdAt);
  }, [products]);

  return <div>{/* Render sorted products */}</div>;
}
```

---

## 14. Security Best Practices

1. **Never expose tokens in URLs**
2. **Sanitize user inputs**
3. **Implement CSP headers**
4. **Use HTTPS only in production**
5. **Rate limit API calls**
6. **Validate file uploads**
7. **Implement RBAC** (Role-Based Access Control)
8. **Log admin activities**
9. **Use secure cookies** for tokens
10. **Regular security audits**

---

## 15. Deployment & DevOps

### 15.1 Build & Deploy

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Deploy to Vercel
vercel deploy --prod
```

### 15.2 Environment Variables (Production)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.sprintshoes.com/api
NEXT_PUBLIC_APP_NAME=Sprint Shoes Admin
```

### 15.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy Admin Portal

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## Conclusion

This architecture provides a solid foundation for building a production-ready admin portal. Key takeaways:

✅ **Modern Stack**: Next.js 14 + TypeScript + Tailwind + shadcn/ui  
✅ **Type Safety**: End-to-end TypeScript with Zod validation  
✅ **Scalable Architecture**: Modular structure with clear separation  
✅ **Great DX**: Hot reload, type hints, auto-complete  
✅ **Performance**: Code splitting, lazy loading, memoization  
✅ **Security**: Auth middleware, RBAC, token refresh  
✅ **UX**: Loading states, error handling, notifications  

**Next Steps:**
1. Set up project with recommended stack
2. Implement authentication flow
3. Build dashboard module
4. Add products module
5. Implement orders module
6. Add remaining modules iteratively
7. Test thoroughly
8. Deploy to production

**Resources:**
- shadcn/ui: https://ui.shadcn.com
- Next.js Docs: https://nextjs.org/docs
- React Query: https://tanstack.com/query
- Zustand: https://zustand-demo.pmnd.rs

---

**Last Updated**: March 22, 2026  
**Version**: 1.0.0
