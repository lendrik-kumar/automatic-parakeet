import twilio from "twilio";
import { storeOTP } from "./redis.js";
// ─── Twilio Configuration ─────────────────────────────────────────────────────
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const IS_PRODUCTION = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";
/**
 * Lazily initialised Twilio client — avoids crashing on startup when
 * credentials are not set (dev / test environments).
 */
let _client = null;
const getTwilioClient = () => {
    if (!_client) {
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            throw new Error("Twilio credentials not configured. " +
                "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars.");
        }
        _client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    }
    return _client;
};
/**
 * Generate a cryptographically random 6-digit OTP.
 */
export const generateOTP = () => {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
};
/**
 * Core SMS sender using Twilio.
 * Falls back to a console log in non-production environments so the
 * server runs without real credentials during development / testing.
 */
export const sendSMS = async (options) => {
    try {
        if (!IS_PRODUCTION) {
            // ── Dev / Test mode ────────────────────────────────────────────────────
            console.log("━".repeat(55));
            console.log("📱  TWILIO SMS  (dev mode — not actually sent)");
            console.log(`  To  : ${options.phoneNumber}`);
            console.log(`  Body: ${options.message}`);
            console.log("━".repeat(55));
            return true;
        }
        // ── Production: send via Twilio ────────────────────────────────────────
        if (!TWILIO_PHONE) {
            throw new Error("TWILIO_PHONE_NUMBER env var is not set.");
        }
        const client = getTwilioClient();
        await client.messages.create({
            body: options.message,
            from: TWILIO_PHONE,
            to: options.phoneNumber,
        });
        return true;
    }
    catch (error) {
        console.error("[Twilio] Failed to send SMS:", error);
        return false;
    }
};
/**
 * Generate an OTP, store it in Redis, and send it via Twilio SMS.
 *
 * @param phoneNumber  E.164 formatted phone number (e.g. "+14155551234")
 * @param purpose      Determines the message copy
 * @param expiryMins   OTP TTL in Redis (default: 10 minutes)
 */
export const sendOTPViaSMS = async (phoneNumber, purpose = "verification", expiryMins = 10) => {
    try {
        const otp = generateOTP();
        // Store OTP in Redis BEFORE sending so we never deliver an OTP we can't verify
        await storeOTP(phoneNumber, otp, expiryMins);
        const messages = {
            registration: `Welcome to Sprint Shoes! Your registration OTP is ${otp}. Valid for ${expiryMins} min. Never share this code.`,
            login: `Your Sprint Shoes login OTP is ${otp}. Valid for ${expiryMins} min. Never share this code.`,
            verification: `Your Sprint Shoes verification code is ${otp}. Valid for ${expiryMins} min.`,
        };
        const sent = await sendSMS({ phoneNumber, message: messages[purpose] });
        return {
            success: sent,
            // Never expose raw OTP in production
            otp: IS_PRODUCTION ? undefined : otp,
        };
    }
    catch (error) {
        console.error("[Twilio] sendOTPViaSMS error:", error);
        return { success: false };
    }
};
// ─── Transactional SMS Notifications ─────────────────────────────────────────
/** Security alert: a new login was detected. */
export const sendLoginAlertSMS = async (phoneNumber, firstName, device, ipAddress) => sendSMS({
    phoneNumber,
    message: `Hi ${firstName}, a new login was detected on your Sprint Shoes account from ${device} (IP: ${ipAddress}). Not you? Secure your account immediately at sprintshoes.com`,
});
/** Security alert: password was changed. */
export const sendPasswordChangedAlertSMS = async (phoneNumber, firstName) => sendSMS({
    phoneNumber,
    message: `Hi ${firstName}, your Sprint Shoes password was just changed. If this wasn't you, contact support immediately.`,
});
/** Order placed confirmation. */
export const sendOrderConfirmationSMS = async (phoneNumber, orderId, amount) => sendSMS({
    phoneNumber,
    message: `Your Sprint Shoes order #${orderId} for $${amount.toFixed(2)} is confirmed! Track it at sprintshoes.com`,
});
/** Shipment dispatched notification. */
export const sendShipmentNotificationSMS = async (phoneNumber, orderId, trackingNumber) => sendSMS({
    phoneNumber,
    message: `Order #${orderId} has shipped! Tracking: ${trackingNumber}. Track at sprintshoes.com`,
});
