-- AddRazorpayFields
-- Add Razorpay-specific fields to Payment model

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "razorpayOrderId" VARCHAR(255),
ADD COLUMN "razorpayPaymentId" VARCHAR(255),
ADD COLUMN "razorpaySignature" TEXT,
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "paymentGatewayResponse" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_razorpayPaymentId_idx" ON "Payment"("razorpayPaymentId");
