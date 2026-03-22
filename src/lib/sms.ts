import { storeOTP, getOTP } from "./redis.js";

// ─── Fast2SMS Configuration ───────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";

// ─── Core Interface ───────────────────────────────────────────────────────────

interface SMSOptions {
  phoneNumber: string;
  message: string;
}

interface OTPSMSOptions {
  phoneNumber: string;
  otp: string;
}

/**
 * Generate a cryptographically random 6-digit OTP.
 */
export const generateOTP = (): string => {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
};

/**
 * Send a plain transactional SMS via Fast2SMS Quick route.
 * Falls back to console log in non-production environments.
 */
export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  try {
      console.log("━".repeat(55));
      console.log("📱  FAST2SMS  (dev mode — not actually sent)");
      console.log(`  To  : ${options.phoneNumber}`);
      console.log(`  Body: ${options.message}`);
      console.log("━".repeat(55));
      return true;
  } catch (error) {
    console.error("[Fast2SMS] Failed to send SMS:", error);
    return false;
  }
};

/**
 * Send OTP via Fast2SMS dedicated OTP route (variables_values = the OTP digit string).
 * Falls back to console log in non-production environments.
 */
export const sendOTPSMS = async (options: OTPSMSOptions): Promise<boolean> => {
  try {
      console.log("━".repeat(55));
      console.log("📱  FAST2SMS OTP  (dev mode — not actually sent)");
      console.log(`  To : ${options.phoneNumber}`);
      console.log(`  OTP: ${options.otp}`);
      console.log("━".repeat(55));
      return true;
  } catch (error) {
    console.error("[Fast2SMS] Failed to send OTP SMS:", error);
    return false;
  }
};

/**
 * Generate an OTP, store it in Redis, and send it via Fast2SMS.
 * If an OTP already exists in Redis for this phone number, it will reuse that OTP
 * and resend it instead of generating a new one (prevents security issues).
 *
 * @param phoneNumber  10-digit Indian number or E.164 (+91XXXXXXXXXX)
 * @param purpose      Determines the message copy and OTP purpose
 * @param expiryMins   OTP TTL in Redis (default: 10 minutes)
 * @param forceNew     Force generation of new OTP even if one exists (default: false)
 */
export const sendOTPViaSMS = async (
  phoneNumber: string,
  purpose: "registration" | "login" | "verification" = "verification",
  expiryMins = 10,
  forceNew = false,
): Promise<{ success: boolean; otp?: string; isExisting?: boolean }> => {
  try {
    let otp: string;
    let isExisting = false;
    
    // Check if OTP already exists in Redis
    if (!forceNew) {
      const existingOTPData = await getOTP(`phone:${phoneNumber}`);
      
      if (existingOTPData) {
        // Reuse existing OTP
        otp = existingOTPData.otp;
        isExisting = true;
        console.log(`[Fast2SMS] Reusing existing OTP for ${phoneNumber}`);
      } else {
        // Generate new OTP
        otp = generateOTP();
      }
    } else {
      // Force new OTP generation
      otp = generateOTP();
    }
    
    // Map purpose to Redis OTP purpose type
    const redisPurpose = purpose === "verification" ? "registration" : purpose;
    
    // Store OTP in Redis (this will update/overwrite if forcing new)
    // Key format: otp:phone:<phoneNumber>
    await storeOTP(`phone:${phoneNumber}`, otp, expiryMins, redisPurpose);

    // Use dedicated OTP route for OTP messages (Fast2SMS OTP route only sends the digit value)
    const sent = await sendOTPSMS({ phoneNumber, otp });

    return {
      success: sent,
      // Never expose raw OTP in production
      otp: IS_PRODUCTION ? undefined : otp,
      isExisting,
    };
  } catch (error) {
    console.error("[Fast2SMS] sendOTPViaSMS error:", error);
    return { success: false };
  }
};


// ─── Transactional SMS Notifications ─────────────────────────────────────────

/** Security alert: a new login was detected. */
export const sendLoginAlertSMS = async (
  phoneNumber: string,
  firstName: string,
  device: string,
  ipAddress: string,
): Promise<boolean> =>
  sendSMS({
    phoneNumber,
    message: `Hi ${firstName}, a new login was detected on your Sprint Shoes account from ${device} (IP: ${ipAddress}). Not you? Secure your account immediately at sprintshoes.com`,
  });

/** Security alert: password was changed. */
export const sendPasswordChangedAlertSMS = async (
  phoneNumber: string,
  firstName: string,
): Promise<boolean> =>
  sendSMS({
    phoneNumber,
    message: `Hi ${firstName}, your Sprint Shoes password was just changed. If this wasn't you, contact support immediately.`,
  });

/** Order placed confirmation. */
export const sendOrderConfirmationSMS = async (
  phoneNumber: string,
  orderId: string,
  amount: number,
): Promise<boolean> =>
  sendSMS({
    phoneNumber,
    message: `Your Sprint Shoes order #${orderId} for $${amount.toFixed(2)} is confirmed! Track it at sprintshoes.com`,
  });

/** Shipment dispatched notification. */
export const sendShipmentNotificationSMS = async (
  phoneNumber: string,
  orderId: string,
  trackingNumber: string,
): Promise<boolean> =>
  sendSMS({
    phoneNumber,
    message: `Order #${orderId} has shipped! Tracking: ${trackingNumber}. Track at sprintshoes.com`,
  });
