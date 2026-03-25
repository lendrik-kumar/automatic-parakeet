/**
 * Razorpay Helper Utilities
 * 
 * Utility functions for Razorpay payment integration
 */

import crypto from "crypto";
import type { PaymentMethod } from "../generated/prisma/enums.js";
import type {
  SupportedCurrency,
  CurrencyConfig,
  PaymentVerificationInput,
} from "../types/razorpay.types.js";

// ─── Currency Configuration ──────────────────────────────────────────────────

const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: "USD",
    symbol: "$",
    smallestUnitName: "cents",
    multiplier: 100,
  },
  INR: {
    code: "INR",
    symbol: "₹",
    smallestUnitName: "paise",
    multiplier: 100,
  },
};

/**
 * Convert amount to smallest currency unit (cents for USD, paise for INR)
 * @param amount - Amount in base currency (dollars/rupees)
 * @param currency - Currency code
 * @returns Amount in smallest unit
 */
export const convertToSmallestUnit = (
  amount: number,
  currency: SupportedCurrency,
): number => {
  const config = CURRENCY_CONFIGS[currency];
  return Math.round(amount * config.multiplier);
};

/**
 * Convert amount from smallest currency unit to base currency
 * @param amount - Amount in smallest unit (cents/paise)
 * @param currency - Currency code
 * @returns Amount in base currency
 */
export const convertFromSmallestUnit = (
  amount: number,
  currency: SupportedCurrency,
): number => {
  const config = CURRENCY_CONFIGS[currency];
  return amount / config.multiplier;
};

/**
 * Get currency configuration
 * @param currency - Currency code
 * @returns Currency configuration
 */
export const getCurrencyConfig = (
  currency: SupportedCurrency,
): CurrencyConfig => {
  return CURRENCY_CONFIGS[currency];
};

// ─── Payment Signature Verification ──────────────────────────────────────────

/**
 * Verify Razorpay payment signature
 * @param data - Payment verification data
 * @param secret - Razorpay key secret
 * @returns True if signature is valid
 */
export const verifyPaymentSignature = (
  data: PaymentVerificationInput,
  secret: string,
): boolean => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Generate expected signature
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    // Compare signatures (timing-safe comparison)
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature),
    );
  } catch (error) {
    console.error("[RazorpayHelpers] Signature verification error:", error);
    return false;
  }
};

/**
 * Verify Razorpay webhook signature
 * @param payload - Webhook payload (raw body)
 * @param signature - Signature from x-razorpay-signature header
 * @param secret - Razorpay webhook secret
 * @returns True if signature is valid
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error("[RazorpayHelpers] Webhook signature verification error:", error);
    return false;
  }
};

// ─── Order Receipt Generation ────────────────────────────────────────────────

/**
 * Generate unique receipt ID for Razorpay order
 * @param orderNumber - Internal order number
 * @returns Unique receipt ID
 */
export const generateOrderReceipt = (orderNumber: string): string => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(2).toString("hex");
  return `${orderNumber}_${timestamp}_${random}`;
};

// ─── Payment Method Mapping ──────────────────────────────────────────────────

/**
 * Check if payment method requires Razorpay processing
 * @param paymentMethod - Payment method
 * @returns True if online payment (not COD)
 */
export const isPaymentMethodOnline = (paymentMethod: PaymentMethod): boolean => {
  return paymentMethod !== "COD";
};

/**
 * Map internal payment method to Razorpay method
 * @param paymentMethod - Internal payment method enum
 * @returns Razorpay method string
 */
export const mapPaymentMethodToRazorpay = (
  paymentMethod: PaymentMethod,
): string | null => {
  const mapping: Record<PaymentMethod, string | null> = {
    CREDIT_CARD: "card",
    DEBIT_CARD: "card",
    NET_BANKING: "netbanking",
    WALLET: "wallet",
    UPI: "upi",
    COD: null, // COD doesn't use Razorpay
  };

  return mapping[paymentMethod];
};

/**
 * Map Razorpay method to internal payment method
 * @param razorpayMethod - Razorpay method string
 * @returns Internal payment method enum
 */
export const mapRazorpayMethodToInternal = (
  razorpayMethod: string,
): PaymentMethod => {
  const mapping: Record<string, PaymentMethod> = {
    card: "CREDIT_CARD", // Default to credit card for cards
    netbanking: "NET_BANKING",
    wallet: "WALLET",
    upi: "UPI",
  };

  return mapping[razorpayMethod] || "CREDIT_CARD";
};

// ─── Error Parsing ───────────────────────────────────────────────────────────

/**
 * Parse Razorpay error into user-friendly message
 * @param error - Razorpay error object
 * @returns User-friendly error message
 */
export const parseRazorpayError = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const err = error as {
      error?: {
        code?: string;
        description?: string;
        reason?: string;
      };
      message?: string;
    };

    if (err.error?.description) {
      return err.error.description;
    }

    if (err.error?.reason) {
      return err.error.reason;
    }

    if (err.message) {
      return err.message;
    }
  }

  return "Payment processing failed. Please try again.";
};

/**
 * Get error code from Razorpay error
 * @param error - Razorpay error object
 * @returns Error code or null
 */
export const getRazorpayErrorCode = (error: unknown): string | null => {
  if (typeof error === "object" && error !== null) {
    const err = error as { error?: { code?: string } };
    return err.error?.code || null;
  }
  return null;
};

// ─── Currency Detection ──────────────────────────────────────────────────────

/**
 * Detect currency based on customer location or preference
 * Currently defaults to USD, but can be enhanced with geo-detection
 * @returns Currency code
 */
export const detectCurrency = (): SupportedCurrency => {
  // Default to USD
  // In future, you can detect based on:
  // - Customer's address country
  // - Email domain (.in for India)
  // - IP geolocation
  // - User preference

  const defaultCurrency = (process.env.RAZORPAY_DEFAULT_CURRENCY ||
    "USD") as SupportedCurrency;

  return defaultCurrency;
};

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate Razorpay order ID format
 * @param orderId - Razorpay order ID
 * @returns True if valid
 */
export const isValidRazorpayOrderId = (orderId: string): boolean => {
  return /^order_[a-zA-Z0-9]+$/.test(orderId);
};

/**
 * Validate Razorpay payment ID format
 * @param paymentId - Razorpay payment ID
 * @returns True if valid
 */
export const isValidRazorpayPaymentId = (paymentId: string): boolean => {
  return /^pay_[a-zA-Z0-9]+$/.test(paymentId);
};

// ─── Amount Formatting ───────────────────────────────────────────────────────

/**
 * Format amount for display
 * @param amount - Amount in base currency
 * @param currency - Currency code
 * @returns Formatted amount string
 */
export const formatAmount = (
  amount: number,
  currency: SupportedCurrency,
): string => {
  const config = CURRENCY_CONFIGS[currency];
  return `${config.symbol}${amount.toFixed(2)}`;
};

/**
 * Format amount in smallest unit for display
 * @param amountInSmallestUnit - Amount in smallest unit
 * @param currency - Currency code
 * @returns Formatted amount string
 */
export const formatAmountFromSmallestUnit = (
  amountInSmallestUnit: number,
  currency: SupportedCurrency,
): string => {
  const amount = convertFromSmallestUnit(amountInSmallestUnit, currency);
  return formatAmount(amount, currency);
};
