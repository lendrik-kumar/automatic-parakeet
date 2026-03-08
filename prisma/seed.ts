import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import pg from "pg";

// ─── Database Connection ──────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randFloat = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];

const nextImg = (() => {
  let c = 0;
  return (w = 600, h = 600) => `https://picsum.photos/${w}/${h}?random=${++c}`;
})();

// ─── Template Data ────────────────────────────────────────────────────────────

const shoeTemplates = [
  {
    name: "Air Max Pro",
    brand: "Nike",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 129.99,
  },
  {
    name: "Court Slam",
    brand: "Adidas",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 139.99,
  },
  {
    name: "Urban Motion",
    brand: "Puma",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 89.99,
  },
  {
    name: "Trail Blazer X",
    brand: "Nike",
    category: "Trail Running",
    shoeType: "RUNNING",
    price: 119.99,
  },
  {
    name: "City Flex 2.0",
    brand: "Adidas",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 99.99,
  },
  {
    name: "Speed Runner Elite",
    brand: "New Balance",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 109.99,
  },
  {
    name: "Court King Pro",
    brand: "Puma",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 149.99,
  },
  {
    name: "Comfort Walk Plus",
    brand: "Nike",
    category: "Walking Shoes",
    shoeType: "WALKING",
    price: 94.99,
  },
  {
    name: "ZoomX Ultra",
    brand: "Nike",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 179.99,
  },
  {
    name: "Ultraboost 23",
    brand: "Adidas",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 189.99,
  },
  {
    name: "Gel-Kayano 30",
    brand: "Asics",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 159.99,
  },
  {
    name: "Fresh Foam X",
    brand: "New Balance",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 134.99,
  },
  {
    name: "Clifton 9",
    brand: "Hoka",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 144.99,
  },
  {
    name: "Bondi 8",
    brand: "Hoka",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 164.99,
  },
  {
    name: "Classic Leather",
    brand: "Reebok",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 79.99,
  },
  {
    name: "Old Skool Pro",
    brand: "Vans",
    category: "Skateboarding",
    shoeType: "SKATEBOARDING",
    price: 74.99,
  },
  {
    name: "Chuck 70 Hi",
    brand: "Converse",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 89.99,
  },
  {
    name: "Dunk Low Retro",
    brand: "Nike",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 109.99,
  },
  {
    name: "Forum Low",
    brand: "Adidas",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 99.99,
  },
  {
    name: "Suede Classic",
    brand: "Puma",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 69.99,
  },
  {
    name: "574 Core",
    brand: "New Balance",
    category: "Lifestyle",
    shoeType: "LIFESTYLE",
    price: 84.99,
  },
  {
    name: "Air Jordan 1 Mid",
    brand: "Nike",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 124.99,
  },
  {
    name: "Trae Young 3",
    brand: "Adidas",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 119.99,
  },
  {
    name: "LeBron XXI",
    brand: "Nike",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 199.99,
  },
  {
    name: "Curry Flow 11",
    brand: "Under Armour",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 159.99,
  },
  {
    name: "GT Cut 3",
    brand: "Nike",
    category: "Basketball Shoes",
    shoeType: "BASKETBALL",
    price: 179.99,
  },
  {
    name: "Predator Edge",
    brand: "Adidas",
    category: "Football Boots",
    shoeType: "FOOTBALL",
    price: 199.99,
  },
  {
    name: "Mercurial Vapor 15",
    brand: "Nike",
    category: "Football Boots",
    shoeType: "FOOTBALL",
    price: 249.99,
  },
  {
    name: "Future 7 Ultimate",
    brand: "Puma",
    category: "Football Boots",
    shoeType: "FOOTBALL",
    price: 219.99,
  },
  {
    name: "Gel-Resolution 9",
    brand: "Asics",
    category: "Tennis Shoes",
    shoeType: "TENNIS",
    price: 139.99,
  },
  {
    name: "Barricade 13",
    brand: "Adidas",
    category: "Tennis Shoes",
    shoeType: "TENNIS",
    price: 149.99,
  },
  {
    name: "Air Zoom Vapor 11",
    brand: "Nike",
    category: "Tennis Shoes",
    shoeType: "TENNIS",
    price: 159.99,
  },
  {
    name: "SpeedForm Gemini",
    brand: "Under Armour",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 124.99,
  },
  {
    name: "Kinvara 14",
    brand: "Saucony",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 109.99,
  },
  {
    name: "Ghost 15",
    brand: "Brooks",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 139.99,
  },
  {
    name: "Glycerin 20",
    brand: "Brooks",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 159.99,
  },
  {
    name: "Wave Rider 27",
    brand: "Mizuno",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 134.99,
  },
  {
    name: "Speedcross 6",
    brand: "Salomon",
    category: "Trail Running",
    shoeType: "RUNNING",
    price: 139.99,
  },
  {
    name: "Terrex Free Hiker",
    brand: "Adidas",
    category: "Hiking Boots",
    shoeType: "HIKING",
    price: 199.99,
  },
  {
    name: "React Infinity Run",
    brand: "Nike",
    category: "Running Shoes",
    shoeType: "RUNNING",
    price: 159.99,
  },
];

const colors = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Gray",
  "Navy",
  "Lime",
  "Pink",
  "Olive",
  "Tan",
];
const sizes = ["6", "7", "8", "9", "10", "11", "12", "13"];
const materials = [
  "Mesh",
  "Leather",
  "Synthetic",
  "Knit",
  "Canvas",
  "Suede",
  "Nubuck",
  "Gore-Tex",
];
const genders: ("MEN" | "WOMEN" | "UNISEX" | "KIDS")[] = [
  "MEN",
  "WOMEN",
  "UNISEX",
  "KIDS",
];

const firstNames = [
  "James",
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Ethan",
  "Sophia",
  "Mason",
  "Isabella",
  "Lucas",
  "Mia",
  "Alexander",
  "Charlotte",
  "Benjamin",
  "Amelia",
  "Daniel",
  "Harper",
  "Matthew",
  "Evelyn",
  "Jackson",
  "Abigail",
  "Sebastian",
  "Emily",
  "David",
  "Ella",
  "Joseph",
  "Scarlett",
  "Carter",
  "Grace",
];
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Anderson",
  "Taylor",
  "Thomas",
  "Hernandez",
  "Moore",
  "Martin",
  "Jackson",
  "Thompson",
  "White",
  "Lopez",
  "Lee",
  "Harris",
  "Clark",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
];

const descriptions: Record<string, string> = {
  RUNNING:
    "Engineered for performance with responsive cushioning and lightweight breathable upper. Ideal for daily training and long-distance runs.",
  BASKETBALL:
    "Designed for explosive court play with enhanced ankle support, responsive cushioning, and durable rubber outsole for maximum traction.",
  LIFESTYLE:
    "Premium everyday sneakers combining street style with all-day comfort. Perfect for casual outfits and urban exploration.",
  WALKING:
    "Plush comfort meets supportive design for all-day wear. Features a cushioned insole and slip-resistant outsole.",
  SKATEBOARDING:
    "Built with vulcanized rubber sole and suede upper for superior board feel and durability. Designed by skaters, for skaters.",
  FOOTBALL:
    "Precision-engineered boots with textured upper for ball control and lightweight plate for agile movement on the pitch.",
  TENNIS:
    "Court-ready performance shoes with lateral stability, durable outsole, and cushioned midsole for quick direction changes.",
  HIKING:
    "Rugged outdoor footwear with waterproof construction, aggressive tread pattern, and supportive ankle collar for trail adventures.",
};

const reviewTitles = [
  "Absolutely love these!",
  "Best shoes I've ever owned",
  "Great value for money",
  "Super comfortable",
  "Perfect fit",
  "Exceeded expectations",
  "Solid quality",
  "Not bad, could be better",
  "Good everyday shoes",
  "Impressive design",
  "Love the color",
  "Very lightweight",
  "Great for running",
  "Stylish and comfy",
  "Would definitely recommend",
  "Top notch!",
  "Fantastic purchase",
  "Nice comfort level",
  "Sleek design",
  "Amazing feel",
];

const reviewTexts = [
  "These shoes have been my go-to for the past month. The cushioning is excellent and they look great with any outfit.",
  "I was skeptical at first, but after wearing them for a week, I'm completely sold. Super comfortable and great arch support.",
  "The quality is outstanding for the price. Very happy with this purchase and already thinking about getting another pair.",
  "Perfect fit right out of the box, no break-in period needed. I've been wearing them daily and they still look new.",
  "Love the design and the materials feel premium. Got several compliments already. Highly recommend!",
  "I run about 30 miles a week and these have been holding up beautifully. Great traction and cushioning.",
  "Bought these for my daily commute and they're incredibly comfortable. My feet don't hurt anymore after long days.",
  "The color is exactly as pictured. True to size and very breathable. Perfect for summer workouts.",
  "I've tried many brands and these are by far the best in this price range. The attention to detail is impressive.",
  "Ordered a half size up as recommended and they fit perfectly. The sole provides great shock absorption.",
  "These look even better in person! The stitching quality and material feel very durable and well-made.",
  "Great for both gym workouts and casual wear. Versatile enough for any occasion.",
];

const cities = [
  { city: "New York", state: "NY" },
  { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" },
  { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" },
  { city: "Austin", state: "TX" },
  { city: "Jacksonville", state: "FL" },
  { city: "San Jose", state: "CA" },
  { city: "Fort Worth", state: "TX" },
  { city: "Columbus", state: "OH" },
  { city: "Charlotte", state: "NC" },
  { city: "Indianapolis", state: "IN" },
  { city: "San Francisco", state: "CA" },
  { city: "Seattle", state: "WA" },
  { city: "Denver", state: "CO" },
  { city: "Boston", state: "MA" },
];

const streetNames = [
  "Main St",
  "Oak Ave",
  "Elm St",
  "Park Rd",
  "Cedar Ln",
  "Maple Dr",
  "Pine St",
  "Washington Blvd",
  "Broadway",
  "Market St",
  "Highland Ave",
  "Sunset Blvd",
  "River Rd",
  "Lake Ave",
  "Spring St",
];

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting comprehensive seed...\n");

  // ============================================
  // CLEAR ALL TABLES (in dependency order)
  // ============================================
  console.log("🗑️  Clearing database...");
  await prisma.returnItem.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderAddress.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.sizeGuide.deleteMany();
  await prisma.shoeSpecification.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.address.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.adminActivityLog.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.role.deleteMany();
  console.log("✅ Database cleared\n");

  // ============================================
  // ROLES
  // ============================================
  console.log("📝 Creating roles...");
  const superAdminRole = await prisma.role.create({
    data: {
      roleName: "Super Admin",
      description:
        "Full system access — can manage all admins, settings, and data",
    },
  });
  const adminRole = await prisma.role.create({
    data: {
      roleName: "Administrator",
      description:
        "Admin panel access — products, orders, inventory, and users",
    },
  });
  const moderatorRole = await prisma.role.create({
    data: {
      roleName: "Moderator",
      description: "Content moderation — manage reviews, returns, and support",
    },
  });
  const viewerRole = await prisma.role.create({
    data: {
      roleName: "Viewer",
      description: "Read-only access to admin dashboard and analytics",
    },
  });
  console.log("✅ 4 roles created");

  // ============================================
  // ADMINS (bcryptjs — matches auth service)
  // ============================================
  console.log("👨‍💼 Creating admins...");
  const hashed = await bcrypt.hash("Admin@123", 10);

  const adminData = [
    {
      firstName: "John",
      lastName: "Admin",
      email: "admin1@shoesprint.com",
      roleId: superAdminRole.id,
    },
    {
      firstName: "Sarah",
      lastName: "Manager",
      email: "admin2@shoesprint.com",
      roleId: adminRole.id,
    },
    {
      firstName: "Mike",
      lastName: "Moderator",
      email: "admin3@shoesprint.com",
      roleId: moderatorRole.id,
    },
    {
      firstName: "Emily",
      lastName: "Viewer",
      email: "admin4@shoesprint.com",
      roleId: viewerRole.id,
    },
    {
      firstName: "Robert",
      lastName: "Operations",
      email: "admin5@shoesprint.com",
      roleId: adminRole.id,
    },
  ];

  const admins = [];
  for (const a of adminData) {
    const admin = await prisma.admin.create({
      data: {
        ...a,
        passwordHash: hashed,
        profileImage: nextImg(200, 200),
        accountStatus: "ACTIVE",
        lastLogin: new Date(Date.now() - rand(0, 7 * 24 * 60 * 60 * 1000)),
      },
    });
    admins.push(admin);
  }
  console.log(`✅ ${admins.length} admins created (password: Admin@123)`);

  // ============================================
  // USERS (30 users)
  // ============================================
  console.log("👥 Creating users...");
  const users = [];

  for (let i = 0; i < 30; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];

    const user = await prisma.user.create({
      data: {
        firstName: fn,
        lastName: ln,
        username: `${fn.toLowerCase()}${ln.toLowerCase()}${i + 1}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@example.com`,
        passwordHash: hashed,
        phoneNumber: `+1${rand(2000000000, 9999999999)}`,
        status: i < 28 ? "ACTIVE" : i === 28 ? "SUSPENDED" : "DELETED",
        emailVerified: i < 25,
        phoneVerified: i < 20,
        lastLogin: new Date(Date.now() - rand(0, 30 * 24 * 60 * 60 * 1000)),
      },
    });
    users.push(user);

    // 2-3 addresses per user
    const numAddresses = rand(2, 3);
    for (let a = 0; a < numAddresses; a++) {
      const loc = pick(cities);
      await prisma.address.create({
        data: {
          userId: user.id,
          fullName: `${fn} ${ln}`,
          phone: `+1${rand(2000000000, 9999999999)}`,
          addressLine1: `${rand(1, 9999)} ${pick(streetNames)}`,
          addressLine2: a === 0 ? `Apt ${rand(1, 200)}` : null,
          city: loc.city,
          state: loc.state,
          postalCode: `${rand(10000, 99999)}`,
          landmark: a === 0 ? "Near Downtown" : null,
          latitude: randFloat(25, 48, 6),
          longitude: randFloat(-125, -66, 6),
          isDefaultShipping: a === 0,
          isDefaultBilling: a === 0,
        },
      });
    }

    // Cart + Wishlist for every active user
    if (user.status === "ACTIVE") {
      await prisma.cart.create({ data: { customerId: user.id } });
      await prisma.wishlist.create({ data: { customerId: user.id } });
    }
  }
  console.log(
    `✅ ${users.length} users created with addresses, carts, wishlists`,
  );

  // ============================================
  // SHIPPING METHODS
  // ============================================
  console.log("🚚 Creating shipping methods...");
  const shippingMethodsData = [
    {
      name: "Standard",
      description: "5-7 business days delivery",
      cost: 5.99,
      estimatedDeliveryDays: 6,
    },
    {
      name: "Express",
      description: "2-3 business days delivery",
      cost: 12.99,
      estimatedDeliveryDays: 2,
    },
    {
      name: "Overnight",
      description: "Next business day delivery",
      cost: 24.99,
      estimatedDeliveryDays: 1,
    },
    {
      name: "Economy",
      description: "7-10 business days delivery",
      cost: 2.99,
      estimatedDeliveryDays: 8,
    },
    {
      name: "Same Day",
      description: "Same day delivery (metro only)",
      cost: 39.99,
      estimatedDeliveryDays: 0,
    },
    {
      name: "Two-Day",
      description: "2 business days guaranteed",
      cost: 15.99,
      estimatedDeliveryDays: 2,
    },
  ];
  await prisma.shippingMethod.createMany({ data: shippingMethodsData });
  const shippingMethods = await prisma.shippingMethod.findMany();
  console.log(`✅ ${shippingMethods.length} shipping methods created`);

  // ============================================
  // COUPONS (10)
  // ============================================
  console.log("🎟️  Creating coupons...");
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  await prisma.coupon.createMany({
    data: [
      {
        code: "SAVE10",
        description: "10% off on any purchase",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minimumOrderValue: 50,
        usageLimit: 200,
        startDate: new Date(now - 30 * DAY),
        expiryDate: new Date(now + 365 * DAY),
        status: "ACTIVE",
      },
      {
        code: "SUMMER20",
        description: "20% off summer collection",
        discountType: "PERCENTAGE",
        discountValue: 20,
        minimumOrderValue: 100,
        usageLimit: 100,
        startDate: new Date(now),
        expiryDate: new Date(now + 60 * DAY),
        status: "ACTIVE",
      },
      {
        code: "FLAT15",
        description: "$15 off your order",
        discountType: "FIXED_AMOUNT",
        discountValue: 15,
        minimumOrderValue: 60,
        maximumDiscount: 15,
        usageLimit: 300,
        startDate: new Date(now),
        expiryDate: new Date(now + 90 * DAY),
        status: "ACTIVE",
      },
      {
        code: "WELCOME5",
        description: "$5 off for first-time buyers",
        discountType: "FIXED_AMOUNT",
        discountValue: 5,
        usageLimit: 1000,
        startDate: new Date(now),
        expiryDate: new Date(now + 365 * DAY),
        status: "ACTIVE",
      },
      {
        code: "SPRINT30",
        description: "30% off sprint collection",
        discountType: "PERCENTAGE",
        discountValue: 30,
        minimumOrderValue: 150,
        maximumDiscount: 50,
        usageLimit: 50,
        startDate: new Date(now),
        expiryDate: new Date(now + 45 * DAY),
        status: "ACTIVE",
      },
      {
        code: "FLAT25",
        description: "$25 off orders above $120",
        discountType: "FIXED_AMOUNT",
        discountValue: 25,
        minimumOrderValue: 120,
        maximumDiscount: 25,
        usageLimit: 150,
        startDate: new Date(now),
        expiryDate: new Date(now + 120 * DAY),
        status: "ACTIVE",
      },
      {
        code: "NEWYEAR10",
        description: "New Year special 10% off",
        discountType: "PERCENTAGE",
        discountValue: 10,
        usageLimit: 500,
        startDate: new Date(now),
        expiryDate: new Date(now + 30 * DAY),
        status: "ACTIVE",
      },
      {
        code: "BLACKFRI50",
        description: "Black Friday 50% off (max $75)",
        discountType: "PERCENTAGE",
        discountValue: 50,
        minimumOrderValue: 100,
        maximumDiscount: 75,
        usageLimit: 200,
        startDate: new Date(now),
        expiryDate: new Date(now + 7 * DAY),
        status: "ACTIVE",
      },
      {
        code: "EXPIRED2024",
        description: "Expired — was 25% off",
        discountType: "PERCENTAGE",
        discountValue: 25,
        startDate: new Date(now - 180 * DAY),
        expiryDate: new Date(now - 30 * DAY),
        status: "EXPIRED",
      },
      {
        code: "DISABLED10",
        description: "Inactive coupon for testing",
        discountType: "PERCENTAGE",
        discountValue: 10,
        startDate: new Date(now),
        expiryDate: new Date(now + 90 * DAY),
        status: "INACTIVE",
      },
    ],
  });
  console.log("✅ 10 coupons created");

  // ============================================
  // PRODUCT TAGS
  // ============================================
  console.log("🏷️  Creating product tags...");
  const tagNames = [
    "Best Seller",
    "New Arrival",
    "Limited Edition",
    "Sale",
    "Eco-Friendly",
    "Premium",
    "Lightweight",
    "Waterproof",
    "Breathable",
    "Cushioned",
    "Durable",
    "Vegan",
    "Retro",
    "Performance",
    "Trending",
  ];
  await prisma.productTag.createMany({
    data: tagNames.map((name) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    })),
  });
  console.log(`✅ ${tagNames.length} product tags created`);

  // ============================================
  // PRODUCTS (40 products, ~3-5 variants each)
  // ============================================
  console.log("👟 Creating products...");
  const products: Awaited<ReturnType<typeof prisma.product.create>>[] = [];
  const allVariants: Awaited<
    ReturnType<typeof prisma.productVariant.create>
  >[] = [];

  for (let i = 0; i < shoeTemplates.length; i++) {
    const t = shoeTemplates[i];
    const slug = t.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const gender = genders[i % genders.length];

    const product = await prisma.product.create({
      data: {
        name: t.name,
        slug: `${slug}-${i + 1}`,
        brand: t.brand,
        description: descriptions[t.shoeType] || descriptions["LIFESTYLE"],
        shortDescription: `${t.brand} ${t.name} — ${t.category}`,
        gender,
        shoeType: t.shoeType,
        category: t.category,
        releaseDate: new Date(now - rand(0, 365) * DAY),
        basePrice: t.price,
        featuredProduct: i < 12,
        newArrival: i >= shoeTemplates.length - 10,
        status:
          i < 37
            ? "ACTIVE"
            : i === 37
              ? "DRAFT"
              : i === 38
                ? "ARCHIVED"
                : "DISCONTINUED",
      },
    });
    products.push(product);

    // ── Shoe specification ──
    await prisma.shoeSpecification.create({
      data: {
        productId: product.id,
        material: pick(materials),
        soleMaterial: pick(["Rubber", "EVA", "Carbon Fiber Plate", "Vibram"]),
        upperMaterial: pick(materials),
        cushioningType: pick([
          "Air Cushion",
          "Gel",
          "React Foam",
          "Boost",
          "HOVR",
          "FuelCell",
          "Fresh Foam",
        ]),
        heelHeight: randFloat(0.5, 3.5),
        closureType: pick(["Lace-up", "Slip-on", "Velcro", "Zip", "BOA Dial"]),
        waterproof: Math.random() > 0.7,
        breathable: Math.random() > 0.3,
        weight: randFloat(180, 420),
      },
    });

    // ── Size guides (US, EU, UK) ──
    const sizeGuides = [
      { sizeSystem: "US" as const, sizeValue: "7", footLength: 25.0 },
      { sizeSystem: "US" as const, sizeValue: "8", footLength: 26.0 },
      { sizeSystem: "US" as const, sizeValue: "9", footLength: 27.0 },
      { sizeSystem: "US" as const, sizeValue: "10", footLength: 28.0 },
      { sizeSystem: "US" as const, sizeValue: "11", footLength: 29.0 },
      { sizeSystem: "EU" as const, sizeValue: "40", footLength: 25.5 },
      { sizeSystem: "EU" as const, sizeValue: "42", footLength: 27.0 },
      { sizeSystem: "EU" as const, sizeValue: "44", footLength: 28.5 },
      { sizeSystem: "UK" as const, sizeValue: "6", footLength: 24.5 },
      { sizeSystem: "UK" as const, sizeValue: "8", footLength: 26.5 },
      { sizeSystem: "UK" as const, sizeValue: "10", footLength: 28.5 },
    ];
    await prisma.sizeGuide.createMany({
      data: sizeGuides.map((g) => ({ productId: product.id, ...g })),
    });

    // ── Product images (4-6 per product) ──
    const numImages = rand(4, 6);
    for (let j = 0; j < numImages; j++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: nextImg(),
          altText: `${product.name} — view ${j + 1}`,
          position: j,
          isThumbnail: j === 0,
        },
      });
    }

    // ── Variants (3-5 color/size combos) ──
    const variantColors = [
      ...new Set(Array.from({ length: rand(3, 5) }, () => pick(colors))),
    ];
    const variantSizes = sizes.slice(rand(0, 2), rand(5, 8));

    for (const color of variantColors) {
      for (const size of variantSizes) {
        const sku = `${product.slug.toUpperCase().slice(0, 12)}-${color.slice(0, 3).toUpperCase()}-${size}`;
        const price = t.price + randFloat(-15, 30);
        const comparePrice =
          Math.random() > 0.5 ? price + randFloat(20, 60) : null;

        let variant;
        try {
          variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `${sku}-${rand(100, 999)}`,
              size,
              color,
              material: pick(materials),
              width: pick(["Narrow", "Regular", "Wide"]),
              price,
              comparePrice,
              weight: randFloat(200, 400),
              barcode: `${rand(1000000000000, 9999999999999)}`,
              status: "ACTIVE",
            },
          });
        } catch {
          // skip duplicate sku/barcode
          continue;
        }

        // Inventory with correct availableStock
        const stockQty = rand(20, 300);
        const reserved = rand(0, Math.min(10, stockQty));
        await prisma.inventory.create({
          data: {
            variantId: variant.id,
            stockQuantity: stockQty,
            reservedStock: reserved,
            availableStock: stockQty - reserved,
            reorderThreshold: rand(10, 30),
          },
        });

        // 1-2 variant-specific images
        for (let vi = 0; vi < rand(1, 2); vi++) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              variantId: variant.id,
              imageUrl: nextImg(),
              altText: `${product.name} — ${color} — view ${vi + 1}`,
              position: vi,
            },
          });
        }

        allVariants.push(variant);
      }
    }
  }

  console.log(
    `✅ ${products.length} products, ${allVariants.length} variants (with inventory, images, specs, size guides)`,
  );

  // ============================================
  // CART ITEMS — fill carts for ~60% of users
  // ============================================
  console.log("🛒 Filling carts...");
  let cartItemCount = 0;
  const activeUsers = users.filter((u) => u.status === "ACTIVE");

  for (const user of activeUsers) {
    if (Math.random() < 0.4) continue; // 60% chance to have items
    const cart = await prisma.cart.findUnique({
      where: { customerId: user.id },
    });
    if (!cart) continue;

    const numItems = rand(1, 4);
    const usedVariants = new Set<string>();

    for (let j = 0; j < numItems; j++) {
      const variant = pick(allVariants);
      if (usedVariants.has(variant.id)) continue;
      usedVariants.add(variant.id);

      const qty = rand(1, 3);
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: variant.productId,
          variantId: variant.id,
          size: variant.size,
          color: variant.color,
          quantity: qty,
          unitPrice: variant.price,
          totalPrice: variant.price * qty,
        },
      });
      cartItemCount++;
    }

    // Update cart totals
    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        totalItems: items.reduce((s, i) => s + i.quantity, 0),
        totalPrice: items.reduce((s, i) => s + i.totalPrice, 0),
      },
    });
  }
  console.log(`✅ ${cartItemCount} cart items added`);

  // ============================================
  // WISHLIST ITEMS
  // ============================================
  console.log("❤️  Filling wishlists...");
  let wishlistItemCount = 0;
  for (const user of activeUsers) {
    if (Math.random() < 0.3) continue;
    const wishlist = await prisma.wishlist.findUnique({
      where: { customerId: user.id },
    });
    if (!wishlist) continue;

    const numItems = rand(2, 6);
    const used = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      const variant = pick(allVariants);
      if (used.has(variant.productId)) continue;
      used.add(variant.productId);

      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: variant.productId,
          variantId: variant.id,
        },
      });
      wishlistItemCount++;
    }
  }
  console.log(`✅ ${wishlistItemCount} wishlist items added`);

  // ============================================
  // ORDERS (40 orders across various statuses)
  // ============================================
  console.log("📦 Creating orders...");
  const orders: Awaited<ReturnType<typeof prisma.order.create>>[] = [];

  const orderStatuses: (
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
  )[] = [
    "PENDING",
    "CONFIRMED",
    "CONFIRMED",
    "PROCESSING",
    "PROCESSING",
    "SHIPPED",
    "SHIPPED",
    "SHIPPED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "CANCELLED",
  ];

  for (let i = 0; i < 40; i++) {
    const user = pick(activeUsers);
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      take: 2,
    });
    const status = pick(orderStatuses);
    const paymentStatus =
      status === "CANCELLED"
        ? ("FAILED" as const)
        : status === "PENDING"
          ? ("PENDING" as const)
          : ("COMPLETED" as const);
    const fulfillmentStatus =
      status === "DELIVERED"
        ? ("DELIVERED" as const)
        : status === "SHIPPED"
          ? ("SHIPPED" as const)
          : status === "PROCESSING"
            ? ("PROCESSING" as const)
            : ("PENDING" as const);

    const shippingCost = pick(shippingMethods).cost;
    const discount = Math.random() > 0.7 ? randFloat(5, 40) : 0;
    const placedAt = new Date(now - rand(1, 90) * DAY);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}-${rand(1000, 9999)}-${i}`,
        customerId: user.id,
        orderStatus: status,
        paymentStatus,
        fulfillmentStatus,
        subtotal: 0,
        taxAmount: 0,
        shippingCost,
        discountAmount: discount,
        totalAmount: 0,
        currency: "USD",
        placedAt,
      },
    });

    // Order items (1-4)
    const numItems = rand(1, 4);
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const variant = pick(allVariants);
      const product = products.find((p) => p.id === variant.productId)!;
      const qty = rand(1, 3);
      const itemTotal = variant.price * qty;
      subtotal += itemTotal;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: variant.productId,
          variantId: variant.id,
          productNameSnapshot: `${product.name} — ${variant.color} (${variant.size})`,
          size: variant.size,
          color: variant.color,
          quantity: qty,
          price: variant.price,
          total: parseFloat(itemTotal.toFixed(2)),
        },
      });
    }

    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat(
      (subtotal + tax + shippingCost - discount).toFixed(2),
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxAmount: tax,
        totalAmount: Math.max(total, 0),
      },
    });

    // Order address snapshot
    if (addresses.length > 0) {
      const addr = addresses[0];
      await prisma.orderAddress.create({
        data: {
          orderId: order.id,
          shippingAddress: `${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.postalCode}`,
          billingAddress: `${(addresses[1] || addr).addressLine1}, ${(addresses[1] || addr).city}, ${(addresses[1] || addr).state}`,
        },
      });
    }

    orders.push({
      ...order,
      subtotal,
      taxAmount: tax,
      totalAmount: Math.max(total, 0),
    } as any);
  }
  console.log(`✅ ${orders.length} orders created with items and addresses`);

  // ============================================
  // PAYMENTS
  // ============================================
  console.log("💳 Creating payments...");
  const paymentMethods: (
    | "CREDIT_CARD"
    | "DEBIT_CARD"
    | "NET_BANKING"
    | "WALLET"
    | "UPI"
    | "COD"
  )[] = ["CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET", "UPI", "COD"];
  const paymentProviders: ("STRIPE" | "RAZORPAY" | "PAYPAL" | "INTERNAL")[] = [
    "STRIPE",
    "RAZORPAY",
    "PAYPAL",
    "INTERNAL",
  ];

  const payments: Awaited<ReturnType<typeof prisma.payment.create>>[] = [];

  for (const order of orders) {
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: pick(paymentMethods),
        paymentProvider: pick(paymentProviders),
        transactionId: `TXN-${rand(100000000, 999999999)}-${rand(1000, 9999)}`,
        paymentStatus: order.paymentStatus,
        amount: order.totalAmount,
        paidAt:
          order.paymentStatus === "COMPLETED"
            ? new Date(
                new Date(order.placedAt).getTime() + rand(1, 60) * 60 * 1000,
              )
            : null,
      },
    });
    payments.push(payment);
  }
  console.log(`✅ ${payments.length} payments created`);

  // ============================================
  // SHIPMENTS
  // ============================================
  console.log("🚚 Creating shipments...");
  const couriers = [
    "FedEx",
    "UPS",
    "DHL",
    "USPS",
    "BlueDart",
    "Amazon Logistics",
  ];
  let shipmentCount = 0;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (
      order.orderStatus === "PENDING" ||
      order.orderStatus === "CONFIRMED" ||
      order.orderStatus === "CANCELLED"
    )
      continue;

    const shippedAt = new Date(
      new Date(order.placedAt).getTime() + rand(1, 3) * DAY,
    );

    await prisma.shipment.create({
      data: {
        orderId: order.id,
        courierName: pick(couriers),
        trackingNumber: `TRK${rand(100000000, 999999999)}${rand(100, 999)}`,
        shippingMethod: pick(shippingMethods).name,
        shippedAt,
        deliveredAt:
          order.orderStatus === "DELIVERED"
            ? new Date(shippedAt.getTime() + rand(1, 5) * DAY)
            : null,
        shippingStatus:
          order.orderStatus === "DELIVERED" ? "DELIVERED" : "IN_TRANSIT",
      },
    });
    shipmentCount++;
  }
  console.log(`✅ ${shipmentCount} shipments created`);

  // ============================================
  // REFUNDS (for some completed payments)
  // ============================================
  console.log("💸 Creating refunds...");
  let refundCount = 0;
  for (let i = 0; i < payments.length; i++) {
    if (payments[i].paymentStatus !== "COMPLETED") continue;
    if (Math.random() > 0.15) continue; // ~15% get refunds

    await prisma.refund.create({
      data: {
        paymentId: payments[i].id,
        orderId: orders[i].id,
        refundAmount: randFloat(10, (orders[i] as any).totalAmount * 0.8),
        refundReason: pick([
          "Product defect",
          "Wrong size delivered",
          "Changed mind",
          "Better price elsewhere",
          "Duplicate order",
        ]),
        refundStatus: pick(["PENDING", "PROCESSING", "COMPLETED"]),
        processedAt: Math.random() > 0.5 ? new Date() : null,
      },
    });
    refundCount++;
  }
  console.log(`✅ ${refundCount} refunds created`);

  // ============================================
  // RETURN REQUESTS
  // ============================================
  console.log("↩️  Creating return requests...");
  let returnCount = 0;
  const deliveredOrders = orders.filter((o) => o.orderStatus === "DELIVERED");

  for (const order of deliveredOrders) {
    if (Math.random() > 0.25) continue; // ~25% of delivered orders get returns

    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        reason: pick([
          "Product is defective",
          "Wrong size/fit",
          "Color differs from pictures",
          "Changed my mind",
          "Arrived too late",
          "Quality not as expected",
        ]),
        returnStatus: pick([
          "PENDING",
          "APPROVED",
          "RECEIVED",
          "REFUNDED",
          "REJECTED",
        ]),
      },
    });

    // Add return items
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      take: 2,
    });
    for (const oi of orderItems) {
      await prisma.returnItem.create({
        data: {
          returnId: returnReq.id,
          orderItemId: oi.id,
          quantity: Math.min(oi.quantity, rand(1, 2)),
          refundAmount: oi.price * Math.min(oi.quantity, rand(1, 2)),
        },
      });
    }
    returnCount++;
  }
  console.log(`✅ ${returnCount} return requests created (with items)`);

  // ============================================
  // PRODUCT REVIEWS (60+ reviews)
  // ============================================
  console.log("⭐ Creating product reviews...");
  let reviewCount = 0;
  const reviewedPairs = new Set<string>();

  for (let i = 0; i < 80; i++) {
    const user = pick(activeUsers);
    const product = pick(products.filter((p) => p.status === "ACTIVE"));
    const key = `${user.id}-${product.id}`;
    if (reviewedPairs.has(key)) continue;
    reviewedPairs.add(key);

    // Check if this user ordered this product (for verified purchase)
    const hasOrdered = await prisma.orderItem.findFirst({
      where: { order: { customerId: user.id }, productId: product.id },
    });

    await prisma.productReview.create({
      data: {
        customerId: user.id,
        productId: product.id,
        rating: rand(1, 5),
        reviewTitle: pick(reviewTitles),
        reviewText: pick(reviewTexts),
        images:
          Math.random() > 0.7
            ? JSON.stringify([nextImg(400, 400), nextImg(400, 400)])
            : null,
        verifiedPurchase: !!hasOrdered,
      },
    });
    reviewCount++;
  }
  console.log(`✅ ${reviewCount} product reviews created`);

  // ============================================
  // ADMIN SESSIONS
  // ============================================
  console.log("🔐 Creating admin sessions...");
  for (const admin of admins) {
    const numSessions = rand(1, 3);
    for (let s = 0; s < numSessions; s++) {
      await prisma.adminSession.create({
        data: {
          adminId: admin.id,
          device: pick([
            "Chrome on MacOS",
            "Safari on iOS",
            "Firefox on Windows",
            "Edge on Windows",
            "Chrome on Android",
          ]),
          ipAddress: `${rand(10, 200)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`,
          refreshToken: `SEED_REFRESH_${rand(1000000000, 9999999999)}_${s}`,
          expiresAt: new Date(now + 7 * DAY),
        },
      });
    }
  }
  console.log("✅ Admin sessions created");

  // ============================================
  // ADMIN ACTIVITY LOGS (60)
  // ============================================
  console.log("📋 Creating admin activity logs...");
  const actionTypes: (
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "ACTIVATE"
    | "DEACTIVATE"
  )[] = ["CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE"];
  const entityTypes = [
    "Product",
    "User",
    "Order",
    "Coupon",
    "Admin",
    "Inventory",
    "ShippingMethod",
    "Review",
  ];

  for (let i = 0; i < 60; i++) {
    const action = pick(actionTypes);
    const entityType = pick(entityTypes);
    await prisma.adminActivityLog.create({
      data: {
        adminId: pick(admins).id,
        action,
        entityType,
        entityId: `${entityType.toLowerCase()}-${rand(1000, 9999)}`,
        oldData:
          action !== "CREATE"
            ? JSON.stringify({
                status: "old_value",
                updatedAt: new Date(now - rand(1, 30) * DAY),
              })
            : null,
        newData:
          action !== "DELETE"
            ? JSON.stringify({ status: "new_value", updatedAt: new Date() })
            : null,
        timestamp: new Date(now - rand(0, 60) * DAY),
      },
    });
  }
  console.log("✅ 60 admin activity logs created");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n🎉 Seed completed successfully!\n");
  console.log("─────────────────────────────────────────");
  console.log("  📑 Roles:             4");
  console.log(`  👨‍💼 Admins:            ${admins.length}`);
  console.log(`  👥 Users:             ${users.length}`);
  console.log(`  🚚 Shipping Methods:  ${shippingMethods.length}`);
  console.log("  🎟️  Coupons:           10");
  console.log(`  🏷️  Product Tags:      ${tagNames.length}`);
  console.log(`  👟 Products:          ${products.length}`);
  console.log(`  🎨 Variants:          ${allVariants.length}`);
  console.log(`  🛒 Cart Items:        ${cartItemCount}`);
  console.log(`  ❤️  Wishlist Items:    ${wishlistItemCount}`);
  console.log(`  📦 Orders:            ${orders.length}`);
  console.log(`  💳 Payments:          ${payments.length}`);
  console.log(`  🚚 Shipments:         ${shipmentCount}`);
  console.log(`  💸 Refunds:           ${refundCount}`);
  console.log(`  ↩️  Returns:           ${returnCount}`);
  console.log(`  ⭐ Reviews:           ${reviewCount}`);
  console.log("  📋 Activity Logs:     60");
  console.log("─────────────────────────────────────────");
  console.log("\n🔑 Login credentials:");
  console.log("  Admin:  admin1@shoesprint.com / Admin@123");
  console.log("  User:   james.smith1@example.com / Admin@123\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
