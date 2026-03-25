/**
 * Razorpay TypeScript Type Definitions
 * 
 * Types for Razorpay API requests and responses
 */

import type { PaymentMethod } from "../generated/prisma/enums.js";

// ─── Razorpay Order Types ────────────────────────────────────────────────────

export interface RazorpayOrderOptions {
  amount: number; // Amount in smallest currency unit (paise for INR, cents for USD)
  currency: string; // 'INR' or 'USD'
  receipt: string; // Unique receipt ID for tracking
  notes?: Record<string, string>; // Additional metadata
  payment_capture?: 0 | 1; // 0 = manual, 1 = automatic (default)
}

export interface RazorpayOrder {
  id: string; // Razorpay order ID (e.g., order_xxxxx)
  entity: string; // 'order'
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string>;
  created_at: number; // Unix timestamp
}

// ─── Razorpay Payment Types ──────────────────────────────────────────────────

export interface RazorpayPayment {
  id: string; // Razorpay payment ID (e.g., pay_xxxxx)
  entity: string; // 'payment'
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: string; // 'card', 'netbanking', 'wallet', 'upi', etc.
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  notes: Record<string, string>;
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  created_at: number;
}

// ─── Razorpay Verification Types ─────────────────────────────────────────────

export interface RazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// ─── Razorpay Webhook Types ──────────────────────────────────────────────────

export interface RazorpayWebhookPayload {
  entity: string; // 'event'
  account_id: string;
  event: RazorpayWebhookEvent;
  contains: string[];
  payload: {
    payment: {
      entity: RazorpayPayment;
    };
    order?: {
      entity: RazorpayOrder;
    };
  };
  created_at: number;
}

export type RazorpayWebhookEvent =
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'order.paid'
  | 'refund.created'
  | 'refund.processed'
  | 'refund.speed_changed';

// ─── Payment Creation Types ──────────────────────────────────────────────────

export interface CreatePaymentSessionInput {
  orderId: string;
  amount: number; // In base currency (dollars/rupees)
  currency: 'USD' | 'INR';
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  orderNumber: string;
}

export interface PaymentSessionResponse {
  paymentId: string;
  orderId: string;
  razorpayOrderId: string;
  amount: number; // In smallest unit (cents/paise)
  currency: string;
  keyId: string; // For frontend Razorpay checkout
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

// ─── Payment Method Mapping ──────────────────────────────────────────────────

export interface RazorpayMethodMapping {
  card: PaymentMethod[]; // CREDIT_CARD, DEBIT_CARD
  netbanking: PaymentMethod[]; // NET_BANKING
  wallet: PaymentMethod[]; // WALLET
  upi: PaymentMethod[]; // UPI
}

// ─── Currency Types ──────────────────────────────────────────────────────────

export type SupportedCurrency = 'USD' | 'INR';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  smallestUnitName: string; // 'cents' for USD, 'paise' for INR
  multiplier: number; // 100 for both
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface RazorpayError {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: Record<string, unknown>;
  };
}

export interface RazorpayApiError extends Error {
  statusCode: number;
  error: RazorpayError['error'];
}
