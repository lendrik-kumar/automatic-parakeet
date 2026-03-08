E-COMMERCE BACKEND SYSTEM ARCHITECTURE AND ENDPOINT DESIGN
==========================================================

This document defines the backend system architecture, domain modules, endpoint structure, and operational flows for the remaining backend features of the e-commerce platform.

Authentication for both Admin and Client users is already implemented.

The system uses the following stack:

Node.js
Express
Prisma ORM
PostgreSQL
JWT Access Tokens
Refresh Token Sessions
Better Auth
Zod Validation
Rate Limiting
Email and SMS Services


------------------------------------------------------------
SYSTEM DOMAIN MODULES
------------------------------------------------------------

The backend is divided into domain modules.

Each module should follow a layered architecture.

Routes
Controllers
Services
Repositories (optional)
Utils

Modules included in the system:

auth (already implemented)
products
inventory
cart
orders
shipping
payments
refunds
returns
coupons
wishlist
reviews
users
admins
analytics
activityLogs


------------------------------------------------------------
PRODUCT SYSTEM
------------------------------------------------------------

Tables Used

Product
ProductVariant
ProductImage
SizeGuide
ShoeSpecification
Inventory


Admin Product Endpoints

POST /admin/products

Create a product.

Fields

name
brand
description
gender
shoeType
category
basePrice
releaseDate
featuredProduct
newArrival


GET /admin/products

List products.

Query parameters

page
limit
status
search
category
brand


GET /admin/products/:productId

Returns full product details including:

product
variants
images
specifications
size guides
inventory


PATCH /admin/products/:productId

Update product details.


DELETE /admin/products/:productId

Archive product. Never hard delete.


PATCH /admin/products/:productId/status

Update product status.

Possible states

DRAFT
ACTIVE
ARCHIVED
DISCONTINUED


------------------------------------------------------------
PRODUCT VARIANTS
------------------------------------------------------------

POST /admin/products/:productId/variants

Create product variant.

Fields

sku
size
color
material
width
price
comparePrice
weight
barcode


PATCH /admin/variants/:variantId

Update variant.


DELETE /admin/variants/:variantId

Archive variant.


------------------------------------------------------------
PRODUCT IMAGES
------------------------------------------------------------

POST /admin/products/:productId/images

Upload product images.


DELETE /admin/images/:imageId

Delete product image.


------------------------------------------------------------
PRODUCT SPECIFICATIONS
------------------------------------------------------------

PUT /admin/products/:productId/specifications

Update shoe specifications.


------------------------------------------------------------
SIZE GUIDES
------------------------------------------------------------

POST /admin/products/:productId/size-guides

Create size guide.


DELETE /admin/size-guides/:sizeGuideId

Remove size guide.


------------------------------------------------------------
CLIENT PRODUCT ENDPOINTS
------------------------------------------------------------

GET /products

List products.

Filters

category
brand
gender
priceRange
size
color


GET /products/:slug

Return full product details including

product
variants
inventory
images
reviews


GET /products/featured

Return featured products.


GET /products/new-arrivals

Return newly released products.


GET /products/search?q=term

Search products.


------------------------------------------------------------
INVENTORY SYSTEM
------------------------------------------------------------

Inventory Table Fields

stockQuantity
reservedStock
availableStock
reorderThreshold


Stock Calculation

availableStock = stockQuantity - reservedStock


Admin Inventory Endpoints

GET /admin/inventory

List all inventory records.


GET /admin/inventory/:variantId

Get inventory details for variant.


PATCH /admin/inventory/:variantId

Update inventory.

Fields

stockQuantity
reorderThreshold


Inventory Update Flow

Cart item added -> reserve stock
Order placed -> confirm reserved stock
Order cancelled -> release stock
Return approved -> restock item


------------------------------------------------------------
CART SYSTEM
------------------------------------------------------------

Tables

Cart
CartItem

One user has one cart.


Cart Endpoints

GET /cart

Return user cart.


POST /cart/items

Add item to cart.

Fields

variantId
size
color
quantity


PATCH /cart/items/:itemId

Update quantity.


DELETE /cart/items/:itemId

Remove item.


DELETE /cart

Clear cart.


Cart Flow

1 Validate product exists
2 Validate variant
3 Check inventory availability
4 Reserve stock
5 Add cart item
6 Recalculate totals


Cart Totals

totalItems
subtotal
discount
tax
shippingEstimate
totalPrice


------------------------------------------------------------
WISHLIST SYSTEM
------------------------------------------------------------

Tables

Wishlist
WishlistItem


POST /wishlist/items

Add item to wishlist.


GET /wishlist

List wishlist items.


DELETE /wishlist/items/:itemId

Remove item.


POST /wishlist/items/:itemId/move-to-cart

Move item to cart.


------------------------------------------------------------
ORDER SYSTEM
------------------------------------------------------------

Tables

Order
OrderItem
OrderAddress


Checkout Endpoint

POST /orders/checkout

Fields

cartId
addressId
couponCode
paymentMethod
shippingMethod


Checkout Flow

1 Validate cart
2 Validate inventory
3 Calculate totals
4 Apply coupon
5 Create order
6 Create order items snapshot
7 Create order address snapshot
8 Create payment record
9 Reserve inventory
10 Return payment session


Client Order Endpoints

GET /orders

List user orders.


GET /orders/:orderId

Return order details.


POST /orders/:orderId/cancel

Cancel order.


Order Status Lifecycle

PENDING
CONFIRMED
PROCESSING
SHIPPED
DELIVERED
CANCELLED
RETURNED


Admin Order Endpoints

GET /admin/orders

Filters

status
date
customer
paymentStatus


GET /admin/orders/:orderId


PATCH /admin/orders/:orderId/status

Update order status.


------------------------------------------------------------
SHIPPING SYSTEM
------------------------------------------------------------

Tables

Shipment
ShippingMethod


Admin Shipping Method Endpoints

POST /admin/shipping-methods

Create shipping method.


GET /admin/shipping-methods


PATCH /admin/shipping-methods/:id


DELETE /admin/shipping-methods/:id


Shipment Management

POST /admin/orders/:orderId/shipments

Create shipment.

Fields

courierName
trackingNumber
shippingMethod


PATCH /admin/shipments/:shipmentId/status


Shipping Status

PENDING
PICKED_UP
IN_TRANSIT
OUT_FOR_DELIVERY
DELIVERED
FAILED
RETURNED


------------------------------------------------------------
PAYMENT SYSTEM razorpay mock api for development
------------------------------------------------------------

Table

Payment


POST /payments/create

Create payment session.


POST /payments/webhook

Handle provider webhook.


GET /payments/:paymentId

Get payment details.


Payment Status

PENDING
COMPLETED
FAILED
REFUNDED


------------------------------------------------------------
COUPON SYSTEM
------------------------------------------------------------

Table

Coupon


Admin Coupon Endpoints

POST /admin/coupons

Create coupon.


GET /admin/coupons


PATCH /admin/coupons/:couponId


DELETE /admin/coupons/:couponId


Client Coupon Endpoint

POST /coupons/validate


Coupon Rules

minimumOrderValue
usageLimit
expiryDate
maximumDiscount


Coupon Status

ACTIVE
INACTIVE
EXPIRED


------------------------------------------------------------
RETURNS SYSTEM
------------------------------------------------------------

Tables

ReturnRequest
ReturnItem


Client Endpoints

POST /orders/:orderId/returns

Create return request.


GET /returns

User return requests.


Admin Endpoints

GET /admin/returns


PATCH /admin/returns/:returnId


Return Status

PENDING
APPROVED
REJECTED
RECEIVED
REFUNDED


------------------------------------------------------------
REFUNDS SYSTEM
------------------------------------------------------------

Table

Refund


POST /admin/refunds

Create refund.


PATCH /admin/refunds/:refundId

Update refund status.


Refund Status

PENDING
PROCESSING
COMPLETED
FAILED
CANCELLED


------------------------------------------------------------
REVIEWS SYSTEM
------------------------------------------------------------

Table

ProductReview


POST /products/:productId/reviews

Create review.


GET /products/:productId/reviews


DELETE /admin/reviews/:reviewId


------------------------------------------------------------
USER MANAGEMENT (ADMIN)
------------------------------------------------------------

GET /admin/users


GET /admin/users/:userId


PATCH /admin/users/:userId/status


User Status

ACTIVE
SUSPENDED
DELETED


------------------------------------------------------------
ADMIN MANAGEMENT
------------------------------------------------------------

GET /admin/admins


POST /admin/admins


PATCH /admin/admins/:adminId


PATCH /admin/admins/:adminId/status


Admin Status

ACTIVE
INACTIVE
SUSPENDED


------------------------------------------------------------
ACTIVITY LOGS
------------------------------------------------------------

GET /admin/activity-logs

Filters

adminId
entityType
action


Logged Actions

CREATE
UPDATE
DELETE
ACTIVATE
DEACTIVATE


------------------------------------------------------------
ANALYTICS
------------------------------------------------------------

GET /admin/analytics/dashboard

Returns

sales today
orders today
top products
low inventory


GET /admin/analytics/sales


GET /admin/analytics/products


------------------------------------------------------------
ORDER LIFECYCLE
------------------------------------------------------------

Customer Checkout

↓

Order Created

↓

Payment Pending

↓

Payment Success

↓

Order Confirmed

↓

Order Processing

↓

Shipment Created

↓

Shipped

↓

Delivered

↓

Optional Return

↓

Refund


------------------------------------------------------------
INVENTORY LIFECYCLE
------------------------------------------------------------

stockQuantity = total inventory

reservedStock = items in cart or pending orders

availableStock = stockQuantity - reservedStock


Reserve stock when

Cart item added


Release stock when

Cart item removed
Order cancelled


Deduct stock when

Order confirmed


Increase stock when

Return approved


------------------------------------------------------------
BACKGROUND JOBS
------------------------------------------------------------

coupon expiration job

inventory reorder alert job

abandoned cart cleanup job

order payment timeout job

refund processing job


build this system

at the end generate a api guide for integartion of apis client and admin both

------------------------------------------------------------
END OF DOCUMENT
------------------------------------------------------------