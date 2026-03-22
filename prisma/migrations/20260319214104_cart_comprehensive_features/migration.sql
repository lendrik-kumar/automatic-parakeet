-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "appliedCouponId" TEXT,
ADD COLUMN     "appliedDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SavedItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "color" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "region" VARCHAR(100),
    "taxRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "region" VARCHAR(100),
    "minimumOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maximumOrder" DOUBLE PRECISION,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "isFreeShipping" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedItem_customerId_idx" ON "SavedItem"("customerId");

-- CreateIndex
CREATE INDEX "SavedItem_productId_idx" ON "SavedItem"("productId");

-- CreateIndex
CREATE INDEX "SavedItem_variantId_idx" ON "SavedItem"("variantId");

-- CreateIndex
CREATE INDEX "TaxRule_region_idx" ON "TaxRule"("region");

-- CreateIndex
CREATE INDEX "TaxRule_isActive_idx" ON "TaxRule"("isActive");

-- CreateIndex
CREATE INDEX "TaxRule_priority_idx" ON "TaxRule"("priority");

-- CreateIndex
CREATE INDEX "ShippingRule_region_idx" ON "ShippingRule"("region");

-- CreateIndex
CREATE INDEX "ShippingRule_isActive_idx" ON "ShippingRule"("isActive");

-- CreateIndex
CREATE INDEX "ShippingRule_priority_idx" ON "ShippingRule"("priority");

-- CreateIndex
CREATE INDEX "Cart_appliedCouponId_idx" ON "Cart"("appliedCouponId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_appliedCouponId_fkey" FOREIGN KEY ("appliedCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
