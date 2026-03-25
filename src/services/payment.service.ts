/**
 * Payment Service - Razorpay Integration
 *
 * Handles Razorpay payment processing, verification, and webhooks
 * with enhanced security and idempotency protections
 */

import { paymentRepository } from "../repositories/payment.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { AppError } from "../utils/AppError.js";
import { createLogger } from "../utils/secureLogger.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  checkEventStatus,
  acquireProcessingLock,
  releaseProcessingLock,
  markEventAsProcessed,
} from "../utils/webhookEventTracker.js";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
} from "../lib/razorpay.js";
import {
  convertToSmallestUnit,
  verifyPaymentSignature,
  generateOrderReceipt,
  parseRazorpayError,
  isValidRazorpayOrderId,
  isValidRazorpayPaymentId,
} from "../utils/razorpayHelpers.js";
import type {
  CreatePaymentSessionInput,
  PaymentSessionResponse,
  PaymentVerificationInput,
  RazorpayWebhookPayload,
  SupportedCurrency,
} from "../types/razorpay.types.js";

const logger = createLogger("PaymentService");

export class PaymentError extends AppError {}

// ─── Create Razorpay Payment Session ─────────────────────────────────────────

/**
 * Create Razorpay order and return session details for frontend
 * @param input - Payment session creation input
 * @returns Payment session response for frontend
 */
export const createRazorpayPaymentSession = async (
  input: CreatePaymentSessionInput,
): Promise<PaymentSessionResponse> => {
  try {
    const { orderId, amount, currency, customerDetails, orderNumber } = input;

    // Validate currency
    if (currency !== "USD" && currency !== "INR") {
      throw new PaymentError(400, "Unsupported currency");
    }

    // Convert amount to smallest unit (cents/paise)
    const amountInSmallestUnit = convertToSmallestUnit(
      amount,
      currency as SupportedCurrency,
    );

    // Generate unique receipt
    const receipt = generateOrderReceipt(orderNumber);

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: amountInSmallestUnit,
      currency,
      receipt,
      notes: {
        orderId,
        orderNumber,
        customerEmail: customerDetails.email,
      },
      payment_capture: 1, // Automatic capture
    });

    logger.info("Razorpay order created", {
      orderId: razorpayOrder.id,
      orderNumber,
    });

    // Find or create payment record
    let payment = await paymentRepository.findByRazorpayOrderId(razorpayOrder.id);

    if (!payment) {
      // Find existing payment by orderId
      const existingOrder = await orderRepository.findById(orderId);
      const existingPayment = existingOrder?.payments?.[0];

      if (existingPayment) {
        // Update existing payment with Razorpay order ID
        payment = await paymentRepository.updateRazorpayDetails(
          existingPayment.id,
          {
            razorpayOrderId: razorpayOrder.id,
            paymentGatewayResponse: razorpayOrder as unknown as Prisma.InputJsonValue,
          },
        );
      } else {
        throw new PaymentError(404, "Payment record not found");
      }
    }

    if (!payment) {
      throw new PaymentError(500, "Failed to retrieve payment record");
    }

    // Return session details for frontend
    return {
      paymentId: payment.id,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInSmallestUnit,
      currency,
      keyId: getRazorpayKeyId(),
      customerDetails,
    };
  } catch (error) {
    logger.error("Error creating Razorpay session", { 
      orderId: input.orderId,
      error: parseRazorpayError(error)
    });
    const message = parseRazorpayError(error);
    throw new PaymentError(500, message);
  }
};

// ─── Verify Payment ──────────────────────────────────────────────────────────

/**
 * Verify Razorpay payment signature and update payment status
 * @param input - Payment verification input
 * @returns Updated payment record
 */
export const verifyRazorpayPayment = async (
  input: PaymentVerificationInput,
) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

    // Validate input
    if (!isValidRazorpayOrderId(razorpayOrderId)) {
      throw new PaymentError(400, "Invalid Razorpay order ID");
    }
    if (!isValidRazorpayPaymentId(razorpayPaymentId)) {
      throw new PaymentError(400, "Invalid Razorpay payment ID");
    }

    // Find payment by Razorpay order ID
    const payment = await paymentRepository.findByRazorpayOrderId(
      razorpayOrderId,
    );

    if (!payment) {
      throw new PaymentError(404, "Payment not found");
    }

    // Check if already completed (idempotency)
    if (payment.paymentStatus === "COMPLETED") {
      console.log(
        "[PaymentService] Payment already completed (idempotent):",
        payment.id,
      );
      return payment;
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      input,
      process.env.RAZORPAY_KEY_SECRET!,
    );

    if (!isValid) {
      logger.error("Invalid payment signature detected", {
        paymentId: payment.id,
        orderId: payment.orderId,
      });
      await paymentRepository.markAsFailed(payment.id, "Invalid signature");
      throw new PaymentError(401, "Payment verification failed");
    }

    // Fetch payment details from Razorpay (optional but recommended for logging)
    await fetchRazorpayPayment(razorpayPaymentId);

    // Update payment status
    const updatedPayment = await paymentRepository.markAsCompleted(payment.id, {
      razorpayPaymentId,
      razorpaySignature,
      transactionId: razorpayPaymentId,
    });

    // Update order status
    await orderRepository.updatePaymentStatus(payment.orderId, "COMPLETED");
    await orderRepository.updateStatus(payment.orderId, "CONFIRMED");

    logger.info("Payment verified and completed", {
      paymentId: updatedPayment.id,
      orderId: updatedPayment.orderId,
    });

    return updatedPayment;
  } catch (error) {
    if (error instanceof PaymentError) throw error;

    logger.error("Error verifying payment", { 
      razorpayOrderId: input.razorpayOrderId,
      error: parseRazorpayError(error) 
    });
    const message = parseRazorpayError(error);
    throw new PaymentError(500, message);
  }
};

// ─── Helper Functions for Webhook Processing ────────────────────────────────

/**
 * Handle successful payment webhook events
 */
const handlePaymentSuccess = async (
  webhookPayload: { payment: { entity: unknown } }, 
  event: string
): Promise<{status: string, paymentId: string, orderId: string}> => {
  const razorpayPayment = webhookPayload.payment.entity as { 
    id: string; 
    order_id: string; 
  };
  const razorpayOrderId = razorpayPayment.order_id;

  // Find payment by Razorpay order ID
  const payment = await paymentRepository.findByRazorpayOrderId(razorpayOrderId);

  if (!payment) {
    logger.warn("Payment not found for webhook", {
      razorpayOrderId,
      event,
    });
    return { status: "payment_not_found", paymentId: "", orderId: "" };
  }

  // Check if already completed (additional idempotency check)
  if (payment.paymentStatus === "COMPLETED") {
    logger.info("Payment already completed", {
      paymentId: payment.id,
      event,
    });
    return { 
      status: "already_completed", 
      paymentId: payment.id, 
      orderId: payment.orderId 
    };
  }

  // Update payment status
  await paymentRepository.markAsCompleted(payment.id, {
    razorpayPaymentId: razorpayPayment.id,
    razorpaySignature: "", // Signature not available in webhook
    transactionId: razorpayPayment.id,
  });

  // Update order status
  await orderRepository.updatePaymentStatus(payment.orderId, "COMPLETED");
  await orderRepository.updateStatus(payment.orderId, "CONFIRMED");

  logger.info("Payment completed via webhook", {
    paymentId: payment.id,
    orderId: payment.orderId,
    event,
  });

  return { 
    status: "completed", 
    paymentId: payment.id, 
    orderId: payment.orderId 
  };
};

/**
 * Handle failed payment webhook events
 */
const handlePaymentFailure = async (
  webhookPayload: { payment: { entity: unknown } }, 
  event: string
): Promise<{status: string, paymentId: string, orderId: string}> => {
  const razorpayPayment = webhookPayload.payment.entity as { 
    id: string; 
    order_id: string; 
    error_description?: string; 
  };
  const razorpayOrderId = razorpayPayment.order_id;

  // Find payment by Razorpay order ID
  const payment = await paymentRepository.findByRazorpayOrderId(razorpayOrderId);

  if (!payment) {
    logger.warn("Payment not found for webhook", {
      razorpayOrderId,
      event,
    });
    return { status: "payment_not_found", paymentId: "", orderId: "" };
  }

  // Update payment status
  const failureReason = razorpayPayment.error_description || "Payment failed";
  await paymentRepository.markAsFailed(payment.id, failureReason);
  await orderRepository.updatePaymentStatus(payment.orderId, "FAILED");

  logger.info("Payment failed via webhook", {
    paymentId: payment.id,
    orderId: payment.orderId,
    failureReason,
    event,
  });

  return { 
    status: "failed", 
    paymentId: payment.id, 
    orderId: payment.orderId 
  };
};

// ─── Handle Webhook ──────────────────────────────────────────────────────────

/**
 * Handle Razorpay webhook events with enhanced security and idempotency
 * @param payload - Webhook payload
 * @returns Success response
 */
export const handleRazorpayWebhook = async (
  payload: RazorpayWebhookPayload,
) => {
  // Extract event ID for tracking (use unique event ID if available)
  const eventId = (payload as unknown as { id?: string }).id || 
    `${payload.event}-${payload.created_at}-${Date.now()}`;
  
  let lockId = "";

  try {
    logger.info("Webhook received", {
      event: payload.event,
      eventId,
      hasPayload: !!payload.payload,
    });

    // ── Step 1: Check if event already processed ─────────────────────────────
    const eventStatus = await checkEventStatus(eventId);
    
    if (!eventStatus.isNewEvent) {
      logger.info("Webhook event already processed (idempotent)", {
        eventId,
        event: payload.event,
      });
      return { received: true, message: "Event already processed" };
    }

    if (eventStatus.isProcessing) {
      logger.warn("Webhook event currently being processed by another instance", {
        eventId,
        event: payload.event,
      });
      return { received: true, message: "Event being processed" };
    }

    // ── Step 2: Acquire processing lock ──────────────────────────────────────
    const processingLock = await acquireProcessingLock(eventId);
    
    if (!processingLock.locked) {
      logger.warn("Failed to acquire processing lock - concurrent processing", {
        eventId,
        event: payload.event,
      });
      return { received: true, message: "Concurrent processing detected" };
    }
    
    lockId = processingLock.lockId;

    const { event, payload: webhookPayload } = payload;

    // ── Step 3: Handle different webhook events ──────────────────────────────
    let processingResult = { status: "unknown", paymentId: "", orderId: "" };

    switch (event) {
      case "payment.captured":
      case "payment.authorized": {
        processingResult = await handlePaymentSuccess(webhookPayload, event);
        break;
      }

      case "payment.failed": {
        processingResult = await handlePaymentFailure(webhookPayload, event);
        break;
      }

      case "order.paid": {
        logger.info("Order paid webhook received", { eventId });
        processingResult = { status: "acknowledged", paymentId: "", orderId: "" };
        break;
      }

      default:
        logger.warn("Unhandled webhook event", { event, eventId });
        processingResult = { status: "unhandled", paymentId: "", orderId: "" };
    }

    // ── Step 4: Mark event as processed ──────────────────────────────────────
    await markEventAsProcessed(eventId, {
      event,
      paymentId: processingResult.paymentId,
      orderId: processingResult.orderId,
      status: processingResult.status,
      processedAt: new Date().toISOString(),
    });

    logger.info("Webhook processed successfully", {
      eventId,
      event,
      status: processingResult.status,
    });

    return { received: true, status: processingResult.status };

  } catch (error) {
    logger.error("Webhook processing error", { eventId, error });
    
    // Mark event as failed (don't retry processing)
    await markEventAsProcessed(eventId, {
      event: payload.event,
      status: "error",
      processedAt: new Date().toISOString(),
    }).catch(() => {}); // Ignore marking errors
    
    // Don't throw error - return success to Razorpay to avoid retries
    return { received: true, error: "Processing failed" };
    
  } finally {
    // ── Step 5: Always release processing lock ───────────────────────────────
    if (lockId) {
      await releaseProcessingLock(eventId, lockId);
    }
  }
};

// ─── Get Payment ─────────────────────────────────────────────────────────────

/**
 * Get payment details
 * @param paymentId - Payment ID
 * @param userId - User ID (for authorization)
 * @returns Payment record
 */
export const getPayment = async (paymentId: string, userId?: string) => {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) throw new PaymentError(404, "Payment not found");

  // Verify ownership if userId provided (client request)
  if (userId && payment.order.customerId !== userId) {
    throw new PaymentError(403, "Not your payment");
  }

  return payment;
};

// ─── Legacy Functions (Deprecated) ───────────────────────────────────────────

/** @deprecated Use createRazorpayPaymentSession instead */
export const createPaymentSession = createRazorpayPaymentSession;

/** @deprecated Use handleRazorpayWebhook instead */
export const handleWebhook = handleRazorpayWebhook;
