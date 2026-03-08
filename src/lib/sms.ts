import { storeOTP } from "./redis.js";

// SMS Provider Configuration
const SMS_PROVIDER = process.env.SMS_PROVIDER || "dummy"; // Can be 'dummy', 'twilio', 'fast2sms', etc.

// Interface for SMS options
interface SMSOptions {
  phoneNumber: string;
  message: string;
}

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Base function to send SMS
 * This is a dummy implementation that logs to console
 * In production, replace with actual SMS provider (Twilio, Fast2SMS, etc.)
 */
export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  try {
    if (SMS_PROVIDER === "dummy") {
      // Dummy implementation - just log to console
      console.log("=".repeat(50));
      console.log("📱 SMS NOTIFICATION (Dummy Mode)");
      console.log("=".repeat(50));
      console.log(`To: ${options.phoneNumber}`);
      console.log(`Message: ${options.message}`);
      console.log("=".repeat(50));
      return true;
    }

    // TODO: Implement actual SMS provider integration
    // Example for Twilio:
    // const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: options.message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: options.phoneNumber
    // });

    console.log(`SMS sent successfully to ${options.phoneNumber}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};

/**
 * Send OTP via SMS for phone verification
 */
export const sendOTPViaSMS = async (
  phoneNumber: string,
  purpose: "registration" | "login" | "verification" = "verification",
): Promise<{ success: boolean; otp?: string }> => {
  try {
    // Generate OTP
    const otp = generateOTP();

    // Store OTP in Redis with 10 minutes expiry
    await storeOTP(phoneNumber, otp, 10);

    // Compose message based on purpose
    let message = "";
    switch (purpose) {
      case "registration":
        message = `Welcome to Sprint Shoes! Your registration OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
        break;
      case "login":
        message = `Your Sprint Shoes login OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
        break;
      default:
        message = `Your Sprint Shoes verification code is: ${otp}. Valid for 10 minutes.`;
    }

    // Send SMS
    const sent = await sendSMS({
      phoneNumber,
      message,
    });

    if (sent) {
      // Return OTP in response (only for development/dummy mode)
      // In production, never return the OTP in the response
      return {
        success: true,
        otp: SMS_PROVIDER === "dummy" ? otp : undefined,
      };
    }

    return { success: false };
  } catch (error) {
    console.error("Error sending OTP via SMS:", error);
    return { success: false };
  }
};

/**
 * Send login notification via SMS
 */
export const sendLoginNotificationSMS = async (
  phoneNumber: string,
  firstName: string,
  device: string,
  ipAddress: string,
): Promise<boolean> => {
  try {
    const message = `Hi ${firstName}, a new login was detected on your Sprint Shoes account from ${device} (${ipAddress}). If this wasn't you, secure your account immediately.`;

    return await sendSMS({
      phoneNumber,
      message,
    });
  } catch (error) {
    console.error("Error sending login notification SMS:", error);
    return false;
  }
};

/**
 * Send password reset notification via SMS
 */
export const sendPasswordResetNotificationSMS = async (
  phoneNumber: string,
  firstName: string,
): Promise<boolean> => {
  try {
    const message = `Hi ${firstName}, a password reset was requested for your Sprint Shoes account. If you didn't request this, please contact support immediately.`;

    return await sendSMS({
      phoneNumber,
      message,
    });
  } catch (error) {
    console.error("Error sending password reset notification SMS:", error);
    return false;
  }
};

/**
 * Send order confirmation via SMS
 */
export const sendOrderConfirmationSMS = async (
  phoneNumber: string,
  orderId: string,
  amount: number,
): Promise<boolean> => {
  try {
    const message = `Thank you for your order! Order #${orderId} for $${amount.toFixed(2)} has been confirmed. Track your order at sprintshoes.com`;

    return await sendSMS({
      phoneNumber,
      message,
    });
  } catch (error) {
    console.error("Error sending order confirmation SMS:", error);
    return false;
  }
};

/**
 * Send shipment notification via SMS
 */
export const sendShipmentNotificationSMS = async (
  phoneNumber: string,
  orderId: string,
  trackingNumber: string,
): Promise<boolean> => {
  try {
    const message = `Your order #${orderId} has been shipped! Tracking number: ${trackingNumber}. Track at sprintshoes.com`;

    return await sendSMS({
      phoneNumber,
      message,
    });
  } catch (error) {
    console.error("Error sending shipment notification SMS:", error);
    return false;
  }
};
