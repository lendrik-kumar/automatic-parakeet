/**
 * Razorpay Configuration
 *
 * Centralized Razorpay SDK initialization with validation
 */
import Razorpay from "razorpay";
// ─── Environment Variable Validation ─────────────────────────────────────────
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file");
}
// ─── Razorpay Instance ───────────────────────────────────────────────────────
export const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});
// ─── Configuration Helpers ───────────────────────────────────────────────────
/**
 * Get Razorpay Key ID (for frontend)
 * @returns Razorpay Key ID
 */
export const getRazorpayKeyId = () => {
    return RAZORPAY_KEY_ID;
};
/**
 * Get Razorpay Key Secret (for backend only)
 * @returns Razorpay Key Secret
 */
export const getRazorpayKeySecret = () => {
    return RAZORPAY_KEY_SECRET;
};
/**
 * Get Razorpay Webhook Secret
 * @returns Razorpay Webhook Secret or undefined
 */
export const getRazorpayWebhookSecret = () => {
    return process.env.RAZORPAY_WEBHOOK_SECRET;
};
/**
 * Check if Razorpay is properly configured
 * @returns True if configured
 */
export const isRazorpayConfigured = () => {
    return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
};
// ─── Order Creation Wrapper ──────────────────────────────────────────────────
/**
 * Create Razorpay order with proper error handling
 * @param options - Order creation options
 * @returns Razorpay order
 */
export const createRazorpayOrder = async (options) => {
    try {
        const order = await razorpay.orders.create(options);
        return order;
    }
    catch (error) {
        console.error("[Razorpay] Order creation failed:", error);
        throw error;
    }
};
/**
 * Fetch Razorpay order details
 * @param orderId - Razorpay order ID
 * @returns Razorpay order
 */
export const fetchRazorpayOrder = async (orderId) => {
    try {
        const order = await razorpay.orders.fetch(orderId);
        return order;
    }
    catch (error) {
        console.error("[Razorpay] Order fetch failed:", error);
        throw error;
    }
};
/**
 * Fetch Razorpay payment details
 * @param paymentId - Razorpay payment ID
 * @returns Razorpay payment
 */
export const fetchRazorpayPayment = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    }
    catch (error) {
        console.error("[Razorpay] Payment fetch failed:", error);
        throw error;
    }
};
// ─── Logging ─────────────────────────────────────────────────────────────────
console.log("[Razorpay] Configuration loaded successfully");
console.log("[Razorpay] Key ID:", RAZORPAY_KEY_ID?.substring(0, 12) + "...");
console.log("[Razorpay] Webhook Secret:", getRazorpayWebhookSecret() ? "Configured" : "Not configured (optional)");
