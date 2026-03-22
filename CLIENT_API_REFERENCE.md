# Client API Reference - Sprint Shoes E-Commerce

Complete reference for all client-facing API endpoints. This document excludes admin panel routes and focuses on customer-facing functionality.

**Base URL**: `http://localhost:3000/api`  
**Authentication**: Bearer token in `Authorization` header where required  
**Response Format**: All responses follow `{ success: boolean, message?: string, data?: any, errors?: any[] }`

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Products & Catalog](#2-products--catalog)
3. [Shopping Cart](#3-shopping-cart)
4. [Wishlist & Price Alerts](#4-wishlist--price-alerts)
5. [Orders & Checkout](#5-orders--checkout)
6. [Returns & Refunds](#6-returns--refunds)
7. [Addresses](#7-addresses)
8. [Payment Methods](#8-payment-methods)
9. [Reviews](#9-reviews)

---

## 1. Authentication & User Management

### 1.1 User Registration (5-Step Flow)

#### Step 1: Initiate Phone Registration
```http
POST /user/auth/register/initiate-phone
Content-Type: application/json
Rate Limit: 10 requests / 15 min
```

**Request Body:**
```json
{
  "phoneNumber": "+15194599381"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your phone",
  "sessionId": "sess_abc123xyz",
  "otp": "123456"  // Only in development mode
}
```

---

#### Step 2: Verify Phone OTP
```http
POST /user/auth/register/verify-phone
Content-Type: application/json
Rate Limit: 10 requests / 15 min
```

**Request Body:**
```json
{
  "phoneNumber": "+15194599381",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "sessionId": "sess_abc123xyz"
}
```

---

#### Step 3: Initiate Email Verification
```http
POST /user/auth/register/initiate-email-otp
Content-Type: application/json
Rate Limit: 10 requests / 15 min
```

**Request Body:**
```json
{
  "sessionId": "sess_abc123xyz",
  "email": "john.doe@example.com",
  "firstName": "John"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "otp": "654321"  // Only in development mode
}
```

---

#### Step 4: Verify Email OTP
```http
POST /user/auth/register/verify-email-otp
Content-Type: application/json
Rate Limit: 10 requests / 15 min
```

**Request Body:**
```json
{
  "sessionId": "sess_abc123xyz",
  "email": "john.doe@example.com",
  "otp": "654321"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

#### Step 5: Complete Registration
```http
POST /user/auth/register/complete
Content-Type: application/json
Rate Limit: 5 requests / 15 min
```

**Request Body:**
```json
{
  "sessionId": "sess_abc123xyz",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "MEN",  // MEN | WOMEN | UNISEX | KIDS
  "email": "john.doe@example.com",
  "password": "SecurePass@123",
  "dateOfBirth": "1990-05-15"  // YYYY-MM-DD format
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+15194599381",
      "gender": "MEN",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "c64a3d9d..."
  }
}
```

---

### 1.2 User Login

#### Login with Email & Password
```http
POST /user/auth/login
Content-Type: application/json
Rate Limit: 5 requests / 15 min
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+15194599381",
      "gender": "MEN",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "c64a3d9d..."
  }
}
```

**Token Details:**
- **Access Token**: JWT, expires in 15 minutes
- **Refresh Token**: Opaque 64-byte hex string, stored in database

---

#### Login with Phone (OTP-based)

**Step 1: Request OTP**
```http
POST /user/auth/login/request-otp
Content-Type: application/json
Rate Limit: 10 requests / 15 min
```

**Request Body:**
```json
{
  "phoneNumber": "+15194599381"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your phone",
  "otp": "123456"  // Only in development mode
}
```

**Step 2: Login with OTP**
```http
POST /user/auth/login/phone
Content-Type: application/json
Rate Limit: 5 requests / 15 min
```

**Request Body:**
```json
{
  "phoneNumber": "+15194599381",
  "otp": "123456"
}
```

**Response:** Same as email login response

---

### 1.3 Session Management

#### Refresh Access Token
```http
POST /user/auth/refresh
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "c64a3d9d..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "new_refresh_token..."
  }
}
```

---

#### Logout (Single Session)
```http
POST /user/auth/logout
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "c64a3d9d..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### Logout All Sessions
```http
POST /user/auth/logout/all
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "All sessions logged out"
}
```

---

#### List Active Sessions
```http
GET /user/auth/sessions
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "device": "Chrome on Mac",
        "ipAddress": "192.168.1.1",
        "createdAt": "2026-03-22T10:00:00.000Z",
        "lastUsed": "2026-03-22T12:30:00.000Z"
      }
    ]
  }
}
```

---

#### Revoke Specific Session
```http
DELETE /user/auth/sessions/:sessionId
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

### 1.4 Password Management

#### Forgot Password (Request Reset)
```http
POST /user/auth/forgot-password
Content-Type: application/json
Rate Limit: 3 requests / 15 min
```

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset OTP sent to your email",
  "otp": "123456"  // Only in development mode
}
```

---

#### Reset Password
```http
POST /user/auth/reset-password
Content-Type: application/json
Rate Limit: 3 requests / 15 min
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### 1.5 Profile Management

#### Get Current User Profile
```http
GET /user/auth/me
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+15194599381",
      "gender": "MEN",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "status": "ACTIVE",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

---

#### Update User Profile
```http
PUT /user/auth/me
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:** (All fields optional)
```json
{
  "firstName": "Jonathan",
  "lastName": "Doe",
  "phoneNumber": "+15194599999",
  "gender": "MEN",
  "dateOfBirth": "1990-05-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { /* Updated user object */ }
  }
}
```

---

## 2. Products & Catalog

All product endpoints are **public** (no authentication required).

### 2.1 Product Listing & Search

#### List All Products
```http
GET /products?page=1&limit=20&sortBy=price&order=asc
Rate Limit: 100 requests / 15 min
```

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 20) | `20` |
| `category` | string | Category slug | `running-shoes` |
| `collection` | string | Collection name | `Nike Air Max` |
| `gender` | enum | MEN, WOMEN, UNISEX, KIDS | `MEN` |
| `shoeType` | string | Shoe type | `RUNNING` |
| `minPrice` | number | Minimum price | `50` |
| `maxPrice` | number | Maximum price | `200` |
| `size` | string | Shoe size | `9` |
| `color` | string | Color filter | `Black` |
| `search` | string | Search query | `Nike Air` |
| `sortBy` | enum | price, newest, popular, name | `price` |
| `order` | enum | asc, desc | `asc` |

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Air Max 90",
        "slug": "air-max-90",
        "brand": "Nike",
        "category": "Running Shoes",
        "basePrice": 129.99,
        "gender": "MEN",
        "shoeType": "RUNNING",
        "featuredProduct": true,
        "newArrival": false,
        "status": "ACTIVE",
        "thumbnail": "https://picsum.photos/600/600",
        "minVariantPrice": 129.99,
        "maxVariantPrice": 149.99,
        "availableColors": ["Black", "White", "Red"],
        "availableSizes": ["7", "8", "9", "10", "11"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

#### Get Product by Slug
```http
GET /products/:slug
Rate Limit: 100 requests / 15 min
```

**Example:** `GET /products/air-max-90`

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "uuid",
      "name": "Air Max 90",
      "slug": "air-max-90",
      "brand": "Nike",
      "description": "Iconic running shoe with Air cushioning...",
      "shortDescription": "Nike Air Max 90 - Running Shoes",
      "category": "Running Shoes",
      "gender": "MEN",
      "shoeType": "RUNNING",
      "basePrice": 129.99,
      "featuredProduct": true,
      "newArrival": false,
      "releaseDate": "2025-10-11T00:00:00.000Z",
      "status": "ACTIVE",
      "variants": [
        {
          "id": "uuid",
          "sku": "AIR-MAX-90-BLK-9",
          "size": "9",
          "color": "Black",
          "material": "Leather",
          "width": "Regular",
          "price": 129.99,
          "comparePrice": 149.99,
          "weight": 310.5,
          "barcode": "9012345678901",
          "status": "ACTIVE",
          "inventory": {
            "stockQuantity": 50,
            "reservedStock": 5,
            "availableStock": 45,
            "reorderThreshold": 10
          }
        }
      ],
      "images": [
        {
          "id": "uuid",
          "imageUrl": "https://picsum.photos/600/600",
          "altText": "Air Max 90 - Black - view 1",
          "position": 0,
          "isThumbnail": true
        }
      ],
      "shoeSpecification": {
        "material": "Leather",
        "soleMaterial": "Rubber",
        "upperMaterial": "Mesh",
        "cushioningType": "Air",
        "heelHeight": 2.5,
        "closureType": "Lace-up",
        "waterproof": false,
        "breathable": true,
        "weight": 310.5
      },
      "sizeGuides": [
        {
          "sizeSystem": "US",
          "sizeValue": "9",
          "footLength": 27
        }
      ],
      "reviews": [
        {
          "id": "uuid",
          "rating": 5,
          "reviewTitle": "Excellent shoes!",
          "reviewText": "Very comfortable...",
          "verifiedPurchase": true,
          "status": "APPROVED",
          "createdAt": "2026-03-20T10:00:00.000Z",
          "customer": {
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      ]
    }
  }
}
```

---

#### Search Products
```http
GET /products/search?q=nike+running&page=1&limit=20
Rate Limit: 100 requests / 15 min
```

**Query Parameters:**
- `q` (required): Search query
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:** Same structure as "List All Products"

---

### 2.2 Curated Product Lists

#### Featured Products
```http
GET /products/featured?limit=10
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [ /* Array of product objects */ ]
  }
}
```

---

#### New Arrivals
```http
GET /products/new-arrivals?limit=10
Rate Limit: 100 requests / 15 min
```

---

#### Best Sellers
```http
GET /products/best-sellers?page=1&limit=20
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        /* Product object */
        "totalSales": 1250,
        "salesRank": 1
      }
    ],
    "pagination": { /* Pagination object */ }
  }
}
```

---

#### Trending Products
```http
GET /products/trending?page=1&limit=20
Rate Limit: 100 requests / 15 min
```

---

### 2.3 Categories & Collections

#### Get All Categories
```http
GET /products/categories
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Running Shoes",
        "slug": "running-shoes",
        "productCount": 125
      },
      {
        "name": "Basketball Shoes",
        "slug": "basketball-shoes",
        "productCount": 87
      }
    ]
  }
}
```

---

#### Get Products by Category
```http
GET /products/categories/:category?page=1&limit=20
Rate Limit: 100 requests / 15 min
```

**Example:** `GET /products/categories/running-shoes?gender=MEN&minPrice=50&maxPrice=200`

**Query Parameters:** Same as "List All Products"

---

#### Get Products by Sub-Category
```http
GET /products/categories/:category/:subCategory?page=1&limit=20
Rate Limit: 100 requests / 15 min
```

**Example:** `GET /products/categories/running-shoes/trail-running`

---

#### Get All Collections
```http
GET /products/collections
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id": "uuid",
        "name": "Nike Air Max Collection",
        "slug": "nike-air-max-collection",
        "description": "Iconic Air Max lineup...",
        "productCount": 45
      }
    ]
  }
}
```

---

#### Get Products by Collection
```http
GET /products/collections/:collection?page=1&limit=20
Rate Limit: 100 requests / 15 min
```

---

### 2.4 Product Filters & Recommendations

#### Get Filter Options
```http
GET /products/filters
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": ["Nike", "Adidas", "Puma"],
    "categories": ["Running Shoes", "Basketball Shoes"],
    "colors": ["Black", "White", "Red"],
    "sizes": ["7", "8", "9", "10", "11"],
    "priceRange": {
      "min": 49.99,
      "max": 299.99
    }
  }
}
```

---

#### Get Related Products
```http
GET /products/:productId/related?limit=10
Rate Limit: 100 requests / 15 min
```

---

#### Get Similar Products
```http
GET /products/:productId/similar?limit=10
Rate Limit: 100 requests / 15 min
```

---

#### Get Personalized Recommendations
```http
GET /products/recommendations/personalized?limit=10
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Note:** Requires authentication. Recommendations based on browsing history, wishlist, and purchase history.

---

### 2.5 Product Variants

#### Get All Variants for a Product
```http
GET /products/:productId/variants
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "variants": [
      {
        "id": "uuid",
        "sku": "AIR-MAX-90-BLK-9",
        "size": "9",
        "color": "Black",
        "material": "Leather",
        "width": "Regular",
        "price": 129.99,
        "comparePrice": 149.99,
        "inventory": {
          "availableStock": 45
        }
      }
    ]
  }
}
```

---

#### Get Specific Variant Details
```http
GET /products/variant/:variantId
Rate Limit: 100 requests / 15 min
```

---

## 3. Shopping Cart

**All cart endpoints require authentication.**

### 3.1 Cart Management

#### Get Current Cart
```http
GET /cart
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "uuid",
      "totalItems": 3,
      "totalPrice": 389.97,
      "appliedDiscount": 20.00,
      "appliedCoupon": {
        "code": "SAVE20",
        "discountType": "PERCENTAGE",
        "discountValue": 20
      },
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "variantId": "uuid",
          "size": "9",
          "color": "Black",
          "quantity": 2,
          "unitPrice": 129.99,
          "totalPrice": 259.98,
          "product": {
            "name": "Air Max 90",
            "slug": "air-max-90",
            "status": "ACTIVE"
          },
          "variant": {
            "sku": "AIR-MAX-90-BLK-9",
            "size": "9",
            "color": "Black",
            "price": 129.99,
            "status": "ACTIVE"
          }
        }
      ]
    }
  }
}
```

---

#### Add Item to Cart
```http
POST /cart/items
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "variantId": "uuid",
  "quantity": 2,
  "size": "9",
  "color": "Black"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": { /* Full cart object */ }
  }
}
```

---

#### Update Cart Item
```http
PATCH /cart/items/:itemId
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart item updated",
  "data": {
    "cart": { /* Full cart object */ }
  }
}
```

---

#### Remove Item from Cart
```http
DELETE /cart/items/:itemId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

#### Clear Entire Cart
```http
DELETE /cart
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

### 3.2 Bulk Operations

#### Bulk Add Items
```http
POST /cart/items/bulk
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "items": [
    {
      "variantId": "uuid1",
      "quantity": 2,
      "size": "9",
      "color": "Black"
    },
    {
      "variantId": "uuid2",
      "quantity": 1,
      "size": "10",
      "color": "White"
    }
  ]
}
```

---

#### Bulk Update Items
```http
PATCH /cart/items/bulk
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "updates": [
    {
      "itemId": "uuid1",
      "quantity": 3
    },
    {
      "itemId": "uuid2",
      "quantity": 2
    }
  ]
}
```

---

#### Bulk Remove Items
```http
DELETE /cart/items/bulk
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "itemIds": ["uuid1", "uuid2"]
}
```

---

### 3.3 Coupons

#### Apply Coupon
```http
POST /cart/coupon
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "couponCode": "SAVE20"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "discount": 20.00,
    "finalTotal": 369.97
  }
}
```

---

#### Remove Coupon
```http
DELETE /cart/coupon
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

### 3.4 Cart Utilities

#### Get Cart Summary
```http
GET /cart/summary
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subtotal": 389.97,
    "discount": 20.00,
    "tax": 32.50,
    "shipping": 10.00,
    "total": 412.47,
    "itemCount": 3
  }
}
```

---

#### Validate Cart (Pre-checkout)
```http
POST /cart/validate
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "issues": [],
    "warnings": [
      {
        "itemId": "uuid",
        "message": "Only 2 items left in stock"
      }
    ]
  }
}
```

---

### 3.5 Save for Later

#### Save Item for Later
```http
POST /cart/save-for-later/:itemId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### List Saved Items
```http
GET /cart/saved-items
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Restore Saved Item to Cart
```http
POST /cart/restore-saved-item/:savedItemId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Remove Saved Item
```http
DELETE /cart/saved-items/:savedItemId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

### 3.6 Wishlist Integration

#### Move Cart Item to Wishlist
```http
POST /cart/move-to-wishlist/:itemId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Add Wishlist Item to Cart
```http
POST /cart/add-from-wishlist/:wishlistItemId
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "quantity": 1
}
```

---

### 3.7 Cart Sync (Guest to User)

#### Sync Guest Cart to User Account
```http
POST /cart/sync
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "guestSessionId": "guest_session_xyz",
  "items": [
    {
      "variantId": "uuid",
      "quantity": 1,
      "size": "9",
      "color": "Black"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart synced successfully",
  "data": {
    "cart": { /* Merged cart */ }
  }
}
```

---

## 4. Wishlist & Price Alerts

**All wishlist endpoints require authentication.**

### 4.1 Wishlist Management

#### Get User Wishlist
```http
GET /wishlist
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wishlist": {
      "id": "uuid",
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "addedAt": "2026-03-20T10:00:00.000Z",
          "product": {
            "id": "uuid",
            "name": "Air Max 90",
            "slug": "air-max-90",
            "brand": "Nike",
            "basePrice": 129.99,
            "thumbnail": "https://picsum.photos/600/600",
            "status": "ACTIVE"
          },
          "priceAlert": {
            "id": "uuid",
            "targetPrice": 99.99,
            "currentPrice": 129.99,
            "notificationSent": false
          }
        }
      ]
    }
  }
}
```

---

#### Add Item to Wishlist
```http
POST /wishlist/items
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "productId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to wishlist",
  "data": {
    "item": { /* Wishlist item object */ }
  }
}
```

---

#### Add Multiple Items
```http
POST /wishlist/items/bulk
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

#### Remove Item from Wishlist
```http
DELETE /wishlist/items/:itemId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Clear Wishlist
```http
DELETE /wishlist
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Check if Product is in Wishlist
```http
GET /wishlist/check/:productId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inWishlist": true,
    "itemId": "uuid"
  }
}
```

---

#### Move Wishlist Item to Cart
```http
POST /wishlist/items/:itemId/move-to-cart
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "variantId": "uuid",
  "quantity": 1,
  "size": "9",
  "color": "Black"
}
```

---

### 4.2 Price Alerts

#### List All Price Alerts
```http
GET /wishlist/price-alerts
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "productId": "uuid",
        "targetPrice": 99.99,
        "currentPrice": 129.99,
        "notificationSent": false,
        "active": true,
        "createdAt": "2026-03-20T10:00:00.000Z",
        "product": {
          "name": "Air Max 90",
          "slug": "air-max-90"
        }
      }
    ]
  }
}
```

---

#### Create Price Alert
```http
POST /wishlist/price-alerts
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "productId": "uuid",
  "targetPrice": 99.99
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price alert created",
  "data": {
    "alert": { /* Price alert object */ }
  }
}
```

---

#### Update Price Alert
```http
PATCH /wishlist/price-alerts/:alertId
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "targetPrice": 89.99,
  "active": true
}
```

---

#### Delete Price Alert
```http
DELETE /wishlist/price-alerts/:alertId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

## 5. Orders & Checkout

**All order endpoints require authentication.**

### 5.1 Checkout Flow

#### Option A: Legacy One-Step Checkout
```http
POST /orders/checkout
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "shippingAddressId": "uuid",
  "billingAddressId": "uuid",
  "shippingMethodId": "uuid",
  "paymentMethod": "CREDIT_CARD",  // CREDIT_CARD | DEBIT_CARD | UPI | NET_BANKING | COD | WALLET
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "cardHolderName": "John Doe",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-2026-001234",
      "status": "PENDING",
      "totalAmount": 412.47,
      "createdAt": "2026-03-22T15:30:00.000Z"
    },
    "payment": {
      "id": "uuid",
      "status": "COMPLETED",
      "transactionId": "TXN123456"
    }
  }
}
```

---

#### Option B: New 3-Step Checkout (Recommended)

**Step 1: Validate Checkout**
```http
POST /orders/checkout/validate
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "shippingAddressId": "uuid",
  "billingAddressId": "uuid",
  "shippingMethodId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "summary": {
      "subtotal": 389.97,
      "discount": 20.00,
      "tax": 32.50,
      "shipping": 10.00,
      "total": 412.47
    },
    "issues": [],
    "warnings": []
  }
}
```

---

**Step 2: Create Order**
```http
POST /orders/checkout/create
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "shippingAddressId": "uuid",
  "billingAddressId": "uuid",
  "shippingMethodId": "uuid",
  "specialInstructions": "Leave at front door"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-2026-001234",
      "status": "PENDING_PAYMENT",
      "totalAmount": 412.47,
      "items": [
        {
          "productName": "Air Max 90",
          "variantSku": "AIR-MAX-90-BLK-9",
          "size": "9",
          "color": "Black",
          "quantity": 2,
          "unitPrice": 129.99,
          "totalPrice": 259.98
        }
      ]
    }
  }
}
```

---

**Step 3: Process Payment**
```http
POST /orders/checkout/:orderId/pay
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "paymentMethod": "CREDIT_CARD",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "cardHolderName": "John Doe",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  },
  "savePaymentMethod": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "payment": {
      "id": "uuid",
      "orderId": "uuid",
      "status": "COMPLETED",
      "amount": 412.47,
      "transactionId": "TXN123456",
      "paymentMethod": "CREDIT_CARD"
    },
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-2026-001234",
      "status": "CONFIRMED"
    }
  }
}
```

---

### 5.2 Order Management

#### List User Orders
```http
GET /orders?page=1&limit=10&status=DELIVERED
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-2026-001234",
        "status": "DELIVERED",
        "totalAmount": 412.47,
        "itemCount": 3,
        "createdAt": "2026-03-15T10:00:00.000Z",
        "deliveredAt": "2026-03-20T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

#### Get Order Details
```http
GET /orders/:orderId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-2026-001234",
      "status": "DELIVERED",
      "totalAmount": 412.47,
      "subtotal": 389.97,
      "discount": 20.00,
      "tax": 32.50,
      "shippingCost": 10.00,
      "specialInstructions": "Leave at front door",
      "createdAt": "2026-03-15T10:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "productName": "Air Max 90",
          "variantSku": "AIR-MAX-90-BLK-9",
          "size": "9",
          "color": "Black",
          "quantity": 2,
          "unitPrice": 129.99,
          "totalPrice": 259.98,
          "thumbnail": "https://picsum.photos/600/600"
        }
      ],
      "shippingAddress": {
        "fullName": "John Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA",
        "phoneNumber": "+15194599381"
      },
      "payment": {
        "id": "uuid",
        "status": "COMPLETED",
        "paymentMethod": "CREDIT_CARD",
        "amount": 412.47,
        "transactionId": "TXN123456"
      },
      "shipment": {
        "id": "uuid",
        "carrier": "FedEx",
        "trackingNumber": "1Z999AA10123456784",
        "status": "DELIVERED",
        "shippedAt": "2026-03-16T08:00:00.000Z",
        "deliveredAt": "2026-03-20T14:30:00.000Z"
      }
    }
  }
}
```

---

#### Get Order Statistics
```http
GET /orders/stats
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 25,
    "pendingOrders": 2,
    "completedOrders": 20,
    "cancelledOrders": 3,
    "totalSpent": 5234.75,
    "averageOrderValue": 209.39
  }
}
```

---

#### Get Upcoming Orders
```http
GET /orders/upcoming
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:** Returns orders with status PENDING, CONFIRMED, PROCESSING, or SHIPPED

---

#### Cancel Order
```http
PATCH /orders/:orderId/cancel
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "id": "uuid",
      "status": "CANCELLED"
    }
  }
}
```

**Note:** Orders can only be cancelled if status is PENDING or CONFIRMED

---

#### Update Order Address (Before Shipment)
```http
PATCH /orders/:orderId/address
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "shippingAddressId": "new-uuid"
}
```

---

### 5.3 Order Actions

#### Get Order Tracking
```http
GET /orders/:orderId/tracking
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tracking": {
      "orderId": "uuid",
      "carrier": "FedEx",
      "trackingNumber": "1Z999AA10123456784",
      "status": "IN_TRANSIT",
      "estimatedDelivery": "2026-03-25T00:00:00.000Z",
      "currentLocation": "New York Distribution Center",
      "timeline": [
        {
          "status": "LABEL_CREATED",
          "location": "Los Angeles, CA",
          "timestamp": "2026-03-22T10:00:00.000Z",
          "description": "Shipping label created"
        },
        {
          "status": "PICKED_UP",
          "location": "Los Angeles, CA",
          "timestamp": "2026-03-22T14:00:00.000Z",
          "description": "Package picked up by carrier"
        },
        {
          "status": "IN_TRANSIT",
          "location": "Phoenix, AZ",
          "timestamp": "2026-03-23T08:00:00.000Z",
          "description": "Package in transit"
        }
      ]
    }
  }
}
```

---

#### Reorder (Create New Order from Existing)
```http
POST /orders/:orderId/reorder
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "message": "Items added to cart",
  "data": {
    "cart": { /* Cart with reordered items */ }
  }
}
```

---

#### Get Order Invoice
```http
GET /orders/:orderId/invoice
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:** Returns PDF invoice or JSON invoice data

---

## 6. Returns & Refunds

**All return endpoints require authentication.**

### 6.1 Return Management

#### Create Return Request
```http
POST /returns
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "orderId": "uuid",
  "items": [
    {
      "orderItemId": "uuid",
      "quantity": 1,
      "reason": "SIZE_ISSUE",
      "comments": "Shoes too small"
    }
  ],
  "preferredResolution": "REFUND"  // REFUND | EXCHANGE | STORE_CREDIT
}
```

**Return Reasons:**
- `SIZE_ISSUE`
- `QUALITY_ISSUE`
- `DAMAGED`
- `WRONG_ITEM`
- `NOT_AS_DESCRIBED`
- `CHANGED_MIND`
- `OTHER`

**Response:**
```json
{
  "success": true,
  "message": "Return request created",
  "data": {
    "return": {
      "id": "uuid",
      "returnNumber": "RET-2026-001234",
      "status": "PENDING",
      "totalRefundAmount": 129.99,
      "createdAt": "2026-03-22T15:00:00.000Z"
    }
  }
}
```

---

#### List User Returns
```http
GET /returns?page=1&limit=10
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "returns": [
      {
        "id": "uuid",
        "returnNumber": "RET-2026-001234",
        "status": "APPROVED",
        "totalRefundAmount": 129.99,
        "createdAt": "2026-03-22T15:00:00.000Z",
        "order": {
          "orderNumber": "ORD-2026-001234"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

#### Get Return Details
```http
GET /returns/:returnId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "return": {
      "id": "uuid",
      "returnNumber": "RET-2026-001234",
      "status": "APPROVED",
      "preferredResolution": "REFUND",
      "totalRefundAmount": 129.99,
      "createdAt": "2026-03-22T15:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "productName": "Air Max 90",
          "variantSku": "AIR-MAX-90-BLK-9",
          "quantity": 1,
          "reason": "SIZE_ISSUE",
          "comments": "Shoes too small",
          "refundAmount": 129.99
        }
      ],
      "order": {
        "orderNumber": "ORD-2026-001234"
      },
      "refund": {
        "id": "uuid",
        "status": "PROCESSED",
        "amount": 129.99,
        "refundMethod": "ORIGINAL_PAYMENT",
        "processedAt": "2026-03-25T10:00:00.000Z"
      }
    }
  }
}
```

---

#### Cancel Return Request
```http
PATCH /returns/:returnId/cancel
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "message": "Return request cancelled"
}
```

**Note:** Can only cancel if status is PENDING or APPROVED

---

#### Get Return Timeline
```http
GET /returns/:returnId/timeline
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "status": "PENDING",
        "timestamp": "2026-03-22T15:00:00.000Z",
        "description": "Return request submitted"
      },
      {
        "status": "APPROVED",
        "timestamp": "2026-03-23T09:00:00.000Z",
        "description": "Return approved by admin"
      },
      {
        "status": "PICKED_UP",
        "timestamp": "2026-03-24T14:00:00.000Z",
        "description": "Item picked up for return"
      },
      {
        "status": "RECEIVED",
        "timestamp": "2026-03-25T08:00:00.000Z",
        "description": "Item received at warehouse"
      },
      {
        "status": "COMPLETED",
        "timestamp": "2026-03-25T10:00:00.000Z",
        "description": "Refund processed"
      }
    ]
  }
}
```

---

#### Get Return Reasons
```http
GET /returns/reasons
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reasons": [
      {
        "code": "SIZE_ISSUE",
        "label": "Size doesn't fit",
        "description": "The product size is too small or too large"
      },
      {
        "code": "QUALITY_ISSUE",
        "label": "Quality problem",
        "description": "The product has quality or manufacturing defects"
      }
    ]
  }
}
```

---

## 7. Addresses

**All address endpoints require authentication.**

### 7.1 Address Management

#### List User Addresses
```http
GET /user/addresses
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "id": "uuid",
        "fullName": "John Doe",
        "phoneNumber": "+15194599381",
        "addressLine1": "123 Main St",
        "addressLine2": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA",
        "addressType": "HOME",  // HOME | WORK | OTHER
        "isDefaultShipping": true,
        "isDefaultBilling": false,
        "createdAt": "2026-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### Get Single Address
```http
GET /user/addresses/:addressId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Create Address
```http
POST /user/addresses
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phoneNumber": "+15194599381",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA",
  "addressType": "HOME",
  "isDefaultShipping": true,
  "isDefaultBilling": false
}
```

**Validation Rules:**
- `fullName`: 2-100 characters
- `phoneNumber`: Valid E.164 format (e.g., +15194599381)
- `addressLine1`: Required, max 200 characters
- `addressLine2`: Optional, max 200 characters
- `city`: Required, 2-100 characters
- `state`: Required, 2-100 characters
- `postalCode`: Required, 3-20 characters
- `country`: Required, 2-100 characters

**Response:**
```json
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "address": { /* Address object */ }
  }
}
```

---

#### Update Address
```http
PATCH /user/addresses/:addressId
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:** Same as Create Address (all fields optional)

---

#### Delete Address
```http
DELETE /user/addresses/:addressId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

---

#### Set Default Shipping Address
```http
PATCH /user/addresses/:addressId/set-default-shipping
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Set Default Billing Address
```http
PATCH /user/addresses/:addressId/set-default-billing
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

## 8. Payment Methods

**All payment method endpoints require authentication.**

### 8.1 Saved Payment Methods

#### List Saved Payment Methods
```http
GET /payment-methods
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "id": "uuid",
        "type": "CREDIT_CARD",
        "cardBrand": "Visa",
        "last4Digits": "4242",
        "expiryMonth": "12",
        "expiryYear": "2025",
        "cardHolderName": "John Doe",
        "isDefault": true,
        "createdAt": "2026-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### Add Payment Method
```http
POST /payment-methods
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "type": "CREDIT_CARD",
  "cardNumber": "4242424242424242",
  "cardHolderName": "John Doe",
  "expiryMonth": "12",
  "expiryYear": "2025",
  "cvv": "123",
  "isDefault": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method added successfully",
  "data": {
    "paymentMethod": {
      "id": "uuid",
      "type": "CREDIT_CARD",
      "last4Digits": "4242",
      "isDefault": true
    }
  }
}
```

**Note:** Full card number is never stored or returned. Only last 4 digits are kept.

---

#### Remove Payment Method
```http
DELETE /payment-methods/:paymentMethodId
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

#### Set Default Payment Method
```http
PATCH /payment-methods/:paymentMethodId/default
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

---

## 9. Reviews

Reviews can be created by authenticated users, but viewed publicly.

### 9.1 Product Reviews

#### Get Product Reviews
```http
GET /products/:productId/reviews?page=1&limit=10&sortBy=recent
Rate Limit: 100 requests / 15 min
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `sortBy`: `recent` | `helpful` | `rating_high` | `rating_low`
- `rating`: Filter by rating (1-5)
- `verifiedPurchase`: `true` | `false`

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "rating": 5,
        "reviewTitle": "Amazing shoes!",
        "reviewText": "Super comfortable and stylish. Best purchase ever!",
        "images": [
          "https://example.com/review-image-1.jpg"
        ],
        "verifiedPurchase": true,
        "helpfulCount": 12,
        "status": "APPROVED",
        "createdAt": "2026-03-20T10:00:00.000Z",
        "customer": {
          "firstName": "John",
          "lastName": "D."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

#### Get Review Summary
```http
GET /products/:productId/reviews/summary
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 45,
      "ratingDistribution": {
        "5": 28,
        "4": 10,
        "3": 4,
        "2": 2,
        "1": 1
      },
      "verifiedPurchasePercentage": 82,
      "recommendationRate": 91
    }
  }
}
```

---

#### Create Review
```http
POST /products/:productId/reviews
Authorization: Bearer {accessToken}
Content-Type: application/json
Rate Limit: 100 requests / 15 min
```

**Request Body:**
```json
{
  "rating": 5,
  "reviewTitle": "Amazing shoes!",
  "reviewText": "Super comfortable and stylish. Best purchase ever!",
  "images": [
    "https://example.com/review-image-1.jpg"
  ]
}
```

**Validation Rules:**
- `rating`: Required, integer 1-5
- `reviewTitle`: Optional, max 100 characters
- `reviewText`: Required, 10-2000 characters
- `images`: Optional, max 5 images

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "id": "uuid",
      "status": "PENDING",
      "createdAt": "2026-03-22T15:00:00.000Z"
    }
  }
}
```

**Note:** Reviews are subject to moderation and will have status PENDING until approved by admin.

---

#### Mark Review as Helpful
```http
POST /products/:productId/reviews/:reviewId/helpful
Authorization: Bearer {accessToken}
Rate Limit: 100 requests / 15 min
```

**Response:**
```json
{
  "success": true,
  "message": "Review marked as helpful",
  "data": {
    "helpfulCount": 13
  }
}
```

**Note:** Users can only mark each review as helpful once.

---

## Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error or invalid input |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

---

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Zod Validation Errors** (400):
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

**Authentication Errors** (401):
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**Rate Limit Errors** (429):
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

---

## Rate Limiting

Different rate limits apply to different endpoint categories:

| Category | Limit | Window | Applies To |
|----------|-------|--------|------------|
| Auth | 5 requests | 15 min | Login, register complete |
| OTP | 10 requests | 15 min | OTP requests/verification |
| Password Reset | 3 requests | 15 min | Forgot/reset password |
| General | 100 requests | 15 min | Most other endpoints |

When rate limit is exceeded, you'll receive a 429 status with `retryAfter` indicating seconds until reset.

---

## Authentication Flow Examples

### Complete Registration Flow
```
1. POST /user/auth/register/initiate-phone { phoneNumber }
   → Returns: sessionId, otp

2. POST /user/auth/register/verify-phone { phoneNumber, otp }
   → Returns: sessionId (updated)

3. POST /user/auth/register/initiate-email-otp { sessionId, email }
   → Returns: otp

4. POST /user/auth/register/verify-email-otp { sessionId, email, otp }
   → Returns: success

5. POST /user/auth/register/complete { sessionId, firstName, lastName, gender, email, password, dateOfBirth }
   → Returns: user, accessToken, refreshToken

6. Store accessToken and refreshToken securely
7. Use accessToken in Authorization header for subsequent requests
```

### Login Flow
```
1. POST /user/auth/login { email, password }
   → Returns: user, accessToken, refreshToken

2. Store tokens securely
3. Use accessToken in Authorization header
4. When accessToken expires (401), use refreshToken:
   POST /user/auth/refresh { refreshToken }
   → Returns: new accessToken, new refreshToken
```

### Shopping Flow
```
1. GET /products (browse)
2. GET /products/:slug (view details)
3. POST /cart/items (add to cart) - requires auth
4. GET /cart (view cart)
5. POST /orders/checkout/validate (validate)
6. POST /orders/checkout/create (create order)
7. POST /orders/checkout/:orderId/pay (pay)
8. GET /orders/:orderId (view order)
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (HttpOnly cookies or secure storage)
3. **Handle token expiration** gracefully with refresh flow
4. **Implement retry logic** for rate-limited requests
5. **Validate input** on client-side before sending
6. **Show loading states** during API calls
7. **Handle errors** with user-friendly messages
8. **Cache product listings** where appropriate
9. **Debounce search queries** to reduce API calls
10. **Use pagination** for large data sets

---

## Testing Credentials

**Test User:**
- Email: `james.smith1@example.com`
- Password: `Admin@123`
- Phone: `+15194599381`

**More Test Users:**
- `james.smith2@example.com` through `james.smith30@example.com`
- All use password: `Admin@123`

**Test Products:**
- 40 products available with 723 variants
- Categories: Running Shoes, Basketball Shoes, Casual Sneakers, etc.
- Brands: Nike, Adidas, Puma, New Balance, etc.

---

## Support & Resources

- **API Base URL**: `http://localhost:3000/api`
- **Postman Collection**: Available in repository root
- **Seed Data Reference**: See `SEED_DATA_REFERENCE.md`
- **Admin API Reference**: Separate document for admin endpoints

---

**Last Updated**: March 22, 2026  
**API Version**: 1.0.0
