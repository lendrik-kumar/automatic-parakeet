import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({
  dataUrl: connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// Helper to generate random integers
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate random float
const randomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

// Helper to generate picsum image URL
const getPicsumImage = (
  width: number = 600,
  height: number = 600,
  id: number = 1,
) => {
  return `https://picsum.photos/${width}/${height}?random=${id}`;
};

// Shoe data templates
const shoeData = [
  {
    name: "Air Max Pro",
    brand: "Nike",
    category: "Running Shoes",
    shoeType: "RUNNING",
    description:
      "High-performance running shoes with advanced cushioning technology",
    basePrice: 129.99,
  },
  {
    name: "Court Slam",
    brand: "Adidas",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    description: "Professional basketball shoes with ankle support",
    basePrice: 139.99,
  },
  {
    name: "Urban Motion",
    brand: "Puma",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    description: "Comfortable everyday casual shoes",
    basePrice: 89.99,
  },
  {
    name: "Trail Blazer",
    brand: "Nike",
    category: "Running Shoes",
    shoeType: "RUNNING",
    description: "Trail running shoes with rugged grip",
    basePrice: 119.99,
  },
  {
    name: "City Flex",
    brand: "Adidas",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    description: "Street style casual sneakers",
    basePrice: 99.99,
  },
  {
    name: "Speed Runner",
    brand: "New Balance",
    category: "Running Shoes",
    shoeType: "RUNNING",
    description: "Lightweight speed running shoes",
    basePrice: 109.99,
  },
  {
    name: "Court King",
    brand: "Puma",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    description: "Elite basketball performance shoes",
    basePrice: 149.99,
  },
  {
    name: "Comfort Walk",
    brand: "Nike",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    description: "Walking shoes with maximum comfort",
    basePrice: 94.99,
  },
];

const colors = ["Black", "White", "Red", "Blue", "Gray", "Navy", "Lime"];
const sizes = ["6", "7", "8", "9", "10", "11", "12", "13"];
const materials = [
  "Mesh",
  "Leather",
  "Synthetic",
  "Knit",
  "Canvas",
  "Suede",
  "Cotton",
];

// Seed function
async function main() {
  console.log("🌱 Starting seed...");

  try {
    // ============================================
    // CLEAR DATABASE
    // ============================================
    console.log("🗑️  Clearing database...");
    await prisma.productImage.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.returnItem.deleteMany();
    await prisma.returnRequest.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.orderAddress.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.productReview.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.shoeSpecification.deleteMany();
    await prisma.sizeGuide.deleteMany();
    await prisma.productTag.deleteMany();
    await prisma.product.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.address.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.adminActivityLog.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.role.deleteMany();
    await prisma.shippingMethod.deleteMany();

    console.log("✅ Database cleared");

    // ============================================
    // SEED ROLES
    // ============================================
    console.log("📝 Creating roles...");
    const superAdminRole = await prisma.role.create({
      data: {
        roleName: "Super Admin",
        description: "Full system access",
      },
    });

    const adminRole = await prisma.role.create({
      data: {
        roleName: "Administrator",
        description: "Admin panel access",
      },
    });

    const moderatorRole = await prisma.role.create({
      data: {
        roleName: "Moderator",
        description: "Content moderation access",
      },
    });

    console.log("✅ Roles created");

    // ============================================
    // SEED ADMINS
    // ============================================
    console.log("👨‍💼 Creating admins...");
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const admins = [];
    const adminNames = [
      { firstName: "John", lastName: "Admin" },
      { firstName: "Sarah", lastName: "Manager" },
      { firstName: "Mike", lastName: "Moderator" },
    ];

    for (let i = 0; i < adminNames.length; i++) {
      const admin = await prisma.admin.create({
        data: {
          firstName: adminNames[i].firstName,
          lastName: adminNames[i].lastName,
          email: `admin${i + 1}@shoesprint.com`,
          passwordHash: hashedPassword,
          roleId:
            i === 0
              ? superAdminRole.id
              : i === 1
                ? adminRole.id
                : moderatorRole.id,
          profileImage: getPicsumImage(200, 200, i + 100),
          accountStatus: "ACTIVE",
        },
      });
      admins.push(admin);
    }

    console.log("✅ Admins created");

    // ============================================
    // SEED USERS
    // ============================================
    console.log("👥 Creating users...");
    const users = [];
    const firstNames = [
      "Alex",
      "Emma",
      "Chris",
      "Lisa",
      "David",
      "Sarah",
      "Michael",
      "Jessica",
    ];
    const lastNames = [
      "Johnson",
      "Smith",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
    ];

    for (let i = 0; i < 10; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          username: `user${i + 1}`,
          email: `user${i + 1}@example.com`,
          passwordHash: hashedPassword,
          phoneNumber: `+1${randomInt(2000000000, 9999999999)}`,
          status: "ACTIVE",
          emailVerified: Math.random() > 0.5,
          phoneVerified: Math.random() > 0.5,
          lastLogin: new Date(Date.now() - randomInt(1000000, 100000000)),
        },
      });

      users.push(user);

      // Create addresses for each user
      await prisma.address.createMany({
        data: [
          {
            userId: user.id,
            fullName: `${firstName} ${lastName}`,
            phone: `+1${randomInt(2000000000, 9999999999)}`,
            addressLine1: `${randomInt(1, 999)} Main Street`,
            addressLine2: `Apt ${randomInt(1, 50)}`,
            city: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"][
              randomInt(0, 4)
            ],
            state: ["NY", "CA", "IL", "TX", "AZ"][randomInt(0, 4)],
            postalCode: `${randomInt(10000, 99999)}`,
            landmark: randomInt(0, 1) ? "Near Downtown" : "Suburban Area",
            latitude: randomFloat(25, 48),
            longitude: randomFloat(-125, -66),
            isDefaultShipping: Math.random() > 0.5,
            isDefaultBilling: Math.random() > 0.5,
          },
          {
            userId: user.id,
            fullName: `${firstName} ${lastName}`,
            phone: `+1${randomInt(2000000000, 9999999999)}`,
            addressLine1: `${randomInt(1, 999)} Oak Avenue`,
            city: ["Boston", "Miami", "Denver", "Philly", "Atlanta"][
              randomInt(0, 4)
            ],
            state: ["MA", "FL", "CO", "PA", "GA"][randomInt(0, 4)],
            postalCode: `${randomInt(10000, 99999)}`,
            latitude: randomFloat(25, 48),
            longitude: randomFloat(-125, -66),
          },
        ],
      });

      // Create cart for user
      await prisma.cart.create({
        data: {
          customerId: user.id,
          sessionId: `session_${user.id}`,
        },
      });

      // Create wishlist for user
      await prisma.wishlist.create({
        data: {
          customerId: user.id,
        },
      });
    }

    console.log("✅ Users created with addresses, carts, and wishlists");

    // ============================================
    // SEED SHIPPING METHODS
    // ============================================
    console.log("🚚 Creating shipping methods...");
    const shippingMethods = await prisma.shippingMethod.createMany({
      data: [
        {
          name: "Standard",
          description: "5-7 business days",
          cost: 5.99,
          estimatedDeliveryDays: 6,
        },
        {
          name: "Express",
          description: "2-3 business days",
          cost: 12.99,
          estimatedDeliveryDays: 2,
        },
        {
          name: "Overnight",
          description: "Next day delivery",
          cost: 24.99,
          estimatedDeliveryDays: 1,
        },
        {
          name: "Economy",
          description: "7-10 business days",
          cost: 2.99,
          estimatedDeliveryDays: 8,
        },
        {
          name: "Same Day",
          description: "Same day delivery",
          cost: 39.99,
          estimatedDeliveryDays: 0,
        },
      ],
    });

    console.log("✅ Shipping methods created");

    // ============================================
    // SEED COUPONS
    // ============================================
    console.log("🎟️  Creating coupons...");
    await prisma.coupon.createMany({
      data: [
        {
          code: "SAVE10",
          description: "10% off on any purchase",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minimumOrderValue: 50,
          usageLimit: 100,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
        {
          code: "SUMMER20",
          description: "20% off summer collection",
          discountType: "PERCENTAGE",
          discountValue: 20,
          minimumOrderValue: 100,
          usageLimit: 50,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
        {
          code: "FLAT15",
          description: "$15 off",
          discountType: "FIXED_AMOUNT",
          discountValue: 15,
          minimumOrderValue: 60,
          maximumDiscount: 15,
          usageLimit: 200,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
        {
          code: "WELCOME5",
          description: "$5 off for first-time buyers",
          discountType: "FIXED_AMOUNT",
          discountValue: 5,
          usageLimit: 500,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
        {
          code: "EXPIRED2023",
          description: "Expired coupon",
          discountType: "PERCENTAGE",
          discountValue: 25,
          startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          status: "EXPIRED",
        },
      ],
    });

    console.log("✅ Coupons created");

    // ============================================
    // SEED PRODUCTS
    // ============================================
    console.log("👟 Creating products...");
    const products = [];

    for (let i = 0; i < shoeData.length; i++) {
      const shoe = shoeData[i];
      const slug = shoe.name.toLowerCase().replace(/\s+/g, "-");

      const product = await prisma.product.create({
        data: {
          name: shoe.name,
          slug: `${slug}-${i}`,
          brand: shoe.brand,
          description: shoe.description,
          shortDescription: shoe.description.substring(0, 100),
          gender: ["MEN", "WOMEN", "UNISEX", "KIDS"][randomInt(0, 3)] as any,
          shoeType: shoe.shoeType,
          category: shoe.category,
          releaseDate: new Date(Date.now() - randomInt(1000000000, 5000000000)),
          basePrice: shoe.basePrice,
          featuredProduct: Math.random() > 0.6,
          newArrival: Math.random() > 0.7,
          status: "ACTIVE",
        },
      });

      // Create shoe specifications
      await prisma.shoeSpecification.create({
        data: {
          productId: product.id,
          material: materials[randomInt(0, materials.length - 1)],
          soleMaterial: "Rubber",
          upperMaterial: materials[randomInt(0, materials.length - 1)],
          cushioningType: ["Air Cushion", "Gel Cushion", "Foam", "Spring"][
            randomInt(0, 3)
          ],
          heelHeight: randomFloat(0.5, 2.5),
          closureType: ["Lace-up", "Slip-on", "Velcro", "Buckle"][
            randomInt(0, 3)
          ],
          waterproof: Math.random() > 0.6,
          breathable: Math.random() > 0.4,
          weight: randomFloat(200, 400),
        },
      });

      // Create size guides
      const sizeGuides = [
        { sizeSystem: "US", sizeValue: "7", footLength: 9.5 },
        { sizeSystem: "US", sizeValue: "10", footLength: 11.5 },
        { sizeSystem: "EU", sizeValue: "41", footLength: 26 },
        { sizeSystem: "EU", sizeValue: "44", footLength: 29 },
        { sizeSystem: "UK", sizeValue: "6", footLength: 8.5 },
        { sizeSystem: "UK", sizeValue: "9", footLength: 11.5 },
      ];

      for (const guide of sizeGuides) {
        await prisma.sizeGuide.create({
          data: {
            productId: product.id,
            sizeSystem: guide.sizeSystem as any,
            sizeValue: guide.sizeValue,
            footLength: guide.footLength,
          },
        });
      }

      // Create product images
      for (let j = 0; j < 5; j++) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            imageUrl: getPicsumImage(600, 600, i * 10 + j),
            altText: `${product.name} - Image ${j + 1}`,
            position: j,
            isThumbnail: j === 0,
          },
        });
      }

      products.push(product);
    }

    console.log(
      "✅ Products created with specifications, size guides, and images",
    );

    // ============================================
    // SEED PRODUCT VARIANTS
    // ============================================
    console.log("🎨 Creating product variants...");
    const variants = [];

    for (const product of products) {
      for (let colorIdx = 0; colorIdx < 4; colorIdx++) {
        for (let sizeIdx = 0; sizeIdx < 5; sizeIdx++) {
          const color = colors[randomInt(0, colors.length - 1)];
          const size = sizes[sizeIdx];

          const variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `${product.slug.toUpperCase()}-${color.substring(0, 3).toUpperCase()}-${size}`,
              size,
              material: materials[randomInt(0, materials.length - 1)],
              color,
              width: ["Narrow", "Regular", "Wide"][randomInt(0, 2)],
              price: product.basePrice + randomFloat(-10, 30),
              comparePrice:
                Math.random() > 0.5
                  ? product.basePrice + randomFloat(40, 80)
                  : null,
              weight: randomFloat(200, 400),
              barcode: `${randomInt(1000000000000, 9999999999999)}`,
              status: "ACTIVE",
            },
          });

          // Create inventory for variant
          await prisma.inventory.create({
            data: {
              variantId: variant.id,
              stockQuantity: randomInt(10, 200),
              reorderThreshold: 20,
            },
          });

          variants.push(variant);

          // Create variant images
          for (let imgIdx = 0; imgIdx < 3; imgIdx++) {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                variantId: variant.id,
                imageUrl: getPicsumImage(600, 600, variants.length + imgIdx),
                altText: `${product.name} - ${color} - Image ${imgIdx + 1}`,
                position: imgIdx,
              },
            });
          }
        }
      }
    }

    console.log("✅ Product variants with inventory and images created");

    // ============================================
    // SEED CART ITEMS
    // ============================================
    console.log("🛒 Adding items to carts...");
    for (let userIdx = 0; userIdx < users.length; userIdx++) {
      const user = users[userIdx];
      const cart = await prisma.cart.findUnique({
        where: { customerId: user.id },
      });

      if (cart && randomInt(0, 1)) {
        const numItems = randomInt(1, 3);
        for (let i = 0; i < numItems; i++) {
          const variant = variants[randomInt(0, variants.length - 1)];
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: variant.productId,
              variantId: variant.id,
              size: variant.size,
              color: variant.color,
              quantity: randomInt(1, 3),
              unitPrice: variant.price,
              totalPrice: variant.price * randomInt(1, 3),
            },
          });
        }
      }
    }

    console.log("✅ Cart items added");

    // ============================================
    // SEED WISHLIST ITEMS
    // ============================================
    console.log("❤️  Adding items to wishlists...");
    for (let userIdx = 0; userIdx < users.length; userIdx++) {
      const user = users[userIdx];
      const wishlist = await prisma.wishlist.findUnique({
        where: { customerId: user.id },
      });

      if (wishlist && randomInt(0, 1)) {
        const numItems = randomInt(2, 4);
        for (let i = 0; i < numItems; i++) {
          const variant = variants[randomInt(0, variants.length - 1)];
          await prisma.wishlistItem.create({
            data: {
              wishlistId: wishlist.id,
              productId: variant.productId,
              variantId: variant.id,
            },
          });
        }
      }
    }

    console.log("✅ Wishlist items added");

    // ============================================
    // SEED REVIEWS
    // ============================================
    console.log("⭐ Creating product reviews...");
    const reviewTexts = [
      "Great shoes! Very comfortable and durable.",
      "Amazing quality and excellent customer service.",
      "Perfect fit and fast delivery.",
      "Highly recommend to anyone looking for quality shoes.",
      "Best purchase I've made this year.",
      "Good value for money, very satisfied.",
      "Excellent craftsmanship and design.",
    ];

    for (let i = 0; i < 15; i++) {
      const user = users[randomInt(0, users.length - 1)];
      const product = products[randomInt(0, products.length - 1)];

      await prisma.productReview.create({
        data: {
          customerId: user.id,
          productId: product.id,
          rating: randomInt(3, 5),
          reviewTitle: `Great ${product.name}`,
          reviewText: reviewTexts[randomInt(0, reviewTexts.length - 1)],
          verifiedPurchase: true,
        },
      });
    }

    console.log("✅ Product reviews created");

    // ============================================
    // SEED ORDERS
    // ============================================
    console.log("📦 Creating orders...");
    const orders = [];

    for (let i = 0; i < 12; i++) {
      const user = users[randomInt(0, users.length - 1)];
      const addresses = await prisma.address.findMany({
        where: { userId: user.id },
        take: 2,
      });

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-${i}`,
          customerId: user.id,
          orderStatus: [
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
          ][randomInt(0, 4)] as any,
          paymentStatus: ["PENDING", "COMPLETED", "FAILED"][
            randomInt(0, 2)
          ] as any,
          fulfillmentStatus: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"][
            randomInt(0, 3)
          ] as any,
          subtotal: 0,
          taxAmount: 0,
          shippingCost: randomInt(3, 25),
          discountAmount: Math.random() > 0.7 ? randomFloat(5, 50) : 0,
          totalAmount: 0,
          currency: "USD",
        },
      });

      // Create order items
      const numItems = randomInt(1, 4);
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const variant = variants[randomInt(0, variants.length - 1)];
        const product = products.find((p) => p.id === variant.productId);
        const quantity = randomInt(1, 2);
        const itemTotal = variant.price * quantity;
        subtotal += itemTotal;

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: variant.productId,
            variantId: variant.id,
            productNameSnapshot: `${product?.name || "Product"} - ${variant.color}`,
            size: variant.size,
            color: variant.color,
            quantity,
            price: variant.price,
            total: itemTotal,
          },
        });
      }

      const taxAmount = subtotal * 0.1;
      const totalAmount =
        subtotal + taxAmount + order.shippingCost - order.discountAmount;

      // Update order totals
      await prisma.order.update({
        where: { id: order.id },
        data: {
          subtotal,
          taxAmount,
          totalAmount,
        },
      });

      // Create order address
      if (addresses.length > 0) {
        await prisma.orderAddress.create({
          data: {
            orderId: order.id,
            shippingAddress: `${addresses[0].addressLine1}, ${addresses[0].city}, ${addresses[0].state}`,
            billingAddress: `${addresses[addresses.length - 1].addressLine1}, ${addresses[addresses.length - 1].city}`,
          },
        });
      }

      orders.push(order);
    }

    console.log("✅ Orders created with items and addresses");

    // ============================================
    // SEED PAYMENTS
    // ============================================
    console.log("💳 Creating payments...");
    const paymentMethods = [
      "CREDIT_CARD",
      "DEBIT_CARD",
      "NET_BANKING",
      "WALLET",
      "UPI",
    ];
    const paymentProviders = ["STRIPE", "RAZORPAY", "PAYPAL"];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: paymentMethods[
            randomInt(0, paymentMethods.length - 1)
          ] as any,
          paymentProvider: paymentProviders[
            randomInt(0, paymentProviders.length - 1)
          ] as any,
          transactionId: `TXN-${randomInt(1000000000000, 9999999999999)}`,
          paymentStatus: order.paymentStatus,
          amount: order.totalAmount,
          paidAt: order.paymentStatus === "COMPLETED" ? new Date() : null,
        },
      });

      // Create refund for some completed payments
      if (order.paymentStatus === "COMPLETED" && Math.random() > 0.8) {
        await prisma.refund.create({
          data: {
            paymentId: payment.id,
            orderId: order.id,
            refundAmount: randomFloat(10, order.totalAmount),
            refundReason: [
              "Changed mind",
              "Product defect",
              "Better price found",
              "Wrong size",
            ][randomInt(0, 3)],
            refundStatus: Math.random() > 0.5 ? "COMPLETED" : "PENDING",
          },
        });
      }
    }

    console.log("✅ Payments and refunds created");

    // ============================================
    // SEED SHIPMENTS
    // ============================================
    console.log("🚚 Creating shipments...");
    const couriers = ["FedEx", "UPS", "DHL", "Amazon", "Local Courier"];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      if (
        order.orderStatus !== "CANCELLED" &&
        order.orderStatus !== "PENDING"
      ) {
        const shippedAt = new Date(Date.now() - randomInt(1000000, 10000000));

        await prisma.shipment.create({
          data: {
            orderId: order.id,
            courierName: couriers[randomInt(0, couriers.length - 1)],
            trackingNumber: `TRACK${randomInt(1000000000, 9999999999)}`,
            shippingMethod: "Express",
            shippedAt,
            deliveredAt:
              order.orderStatus === "DELIVERED"
                ? new Date(shippedAt.getTime() + 2 * 24 * 60 * 60 * 1000)
                : null,
            shippingStatus:
              order.orderStatus === "DELIVERED" ? "DELIVERED" : "IN_TRANSIT",
          },
        });
      }
    }

    console.log("✅ Shipments created");

    // ============================================
    // SEED RETURN REQUESTS
    // ============================================
    console.log("↩️  Creating return requests...");
    const returnReasons = [
      "Product is defective",
      "Wrong size/fit",
      "Different from description",
      "Changed mind",
      "Better option found",
    ];

    for (let i = 0; i < 5; i++) {
      const order = orders[randomInt(0, orders.length - 1)];

      if (order.orderStatus === "DELIVERED") {
        await prisma.returnRequest.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            reason: returnReasons[randomInt(0, returnReasons.length - 1)],
            returnStatus: ["PENDING", "APPROVED", "RECEIVED", "REFUNDED"][
              randomInt(0, 3)
            ] as any,
          },
        });
      }
    }

    console.log("✅ Return requests created");

    // ============================================
    // SEED ADMIN SESSIONS
    // ============================================
    console.log("🔐 Creating admin sessions...");
    for (const admin of admins) {
      await prisma.adminSession.create({
        data: {
          adminId: admin.id,
          device: ["Chrome on MacOS", "Safari on iOS", "Firefox on Windows"][
            randomInt(0, 2)
          ],
          ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
          refreshToken: `REFRESH_TOKEN_${randomInt(1000000000, 9999999999)}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    console.log("✅ Admin sessions created");

    // ============================================
    // SEED ADMIN ACTIVITY LOGS
    // ============================================
    console.log("📋 Creating admin activity logs...");
    const actions = ["CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE"];
    const entityTypes = ["Product", "User", "Order", "Coupon", "Admin"];

    for (let i = 0; i < 20; i++) {
      await prisma.adminActivityLog.create({
        data: {
          adminId: admins[randomInt(0, admins.length - 1)].id,
          action: actions[randomInt(0, actions.length - 1)] as any,
          entityType: entityTypes[randomInt(0, entityTypes.length - 1)],
          entityId: `ID-${randomInt(1000, 9999)}`,
          oldData:
            Math.random() > 0.3 ? JSON.stringify({ field: "old_value" }) : null,
          newData:
            Math.random() > 0.3 ? JSON.stringify({ field: "new_value" }) : null,
        },
      });
    }

    console.log("✅ Admin activity logs created");

    console.log("\n🎉 Seed completed successfully!\n");
    console.log("Summary:");
    console.log(`  📑 Roles: 3`);
    console.log(`  👨‍💼 Admins: ${admins.length}`);
    console.log(`  👥 Users: ${users.length}`);
    console.log(`  👟 Products: ${products.length}`);
    console.log(`  🎨 Product Variants: ${variants.length}`);
    console.log(`  📦 Orders: ${orders.length}`);
    console.log(`  🎟️  Coupons: 5`);
    console.log(`  🚚 Shipping Methods: 5`);
  } catch (error) {
    console.error("❌ Seed error:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
