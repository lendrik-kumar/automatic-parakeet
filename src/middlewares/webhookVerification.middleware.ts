/**
 * Webhook Verification Middleware
 * 
 * Verifies Razorpay webhook signatures for security
 * Enforces strict security requirements for production safety
 */

import { Request, Response, NextFunction } from "express";
import { getRazorpayWebhookSecret } from "../lib/razorpay.js";
import { verifyWebhookSignature } from "../utils/razorpayHelpers.js";
import { createLogger, redactSensitive } from "../utils/secureLogger.js";

const logger = createLogger("WebhookVerification");

/**
 * Verify Razorpay webhook signature
 * 
 * This middleware enforces strict security requirements:
 * 1. Webhook secret MUST be configured
 * 2. Request body MUST be raw Buffer (not parsed JSON)
 * 3. Signature MUST be valid
 * 
 * SECURITY: Any failure results in request rejection
 */
export const verifyRazorpayWebhook = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // ── Step 1: Validate Headers ──────────────────────────────────────────────
    
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      logger.error("Missing x-razorpay-signature header");
      res.status(400).json({
        success: false,
        message: "Missing webhook signature",
      });
      return;
    }

    // ── Step 2: Enforce Webhook Secret Requirement ───────────────────────────
    
    const webhookSecret = getRazorpayWebhookSecret();
    if (!webhookSecret) {
      logger.error(
        "Webhook secret not configured. This is a SECURITY VULNERABILITY!",
        {
          nodeEnv: process.env.NODE_ENV,
          recommendation: "Set RAZORPAY_WEBHOOK_SECRET in environment variables",
        },
      );
      
      // CRITICAL: Reject all requests when webhook secret is missing
      res.status(500).json({
        success: false,
        message: "Webhook verification not configured. Cannot process request.",
      });
      return;
    }

    // ── Step 3: Enforce Raw Body Requirement ─────────────────────────────────
    
    if (!Buffer.isBuffer(req.body)) {
      logger.error("Webhook body is not a Buffer", {
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body),
        recommendation: "Ensure express.raw() middleware is applied before this route",
      });
      
      res.status(400).json({
        success: false,
        message: "Invalid webhook body format. Expected raw buffer.",
      });
      return;
    }

    // ── Step 4: Convert Buffer to String for Verification ────────────────────
    
    const rawBody = req.body.toString("utf8");
    if (!rawBody || rawBody.length === 0) {
      logger.error("Webhook body is empty");
      res.status(400).json({
        success: false,
        message: "Empty webhook payload",
      });
      return;
    }

    // ── Step 5: Verify Signature ──────────────────────────────────────────────
    
    logger.debug("Verifying webhook signature", {
      signaturePrefix: redactSensitive(signature),
      bodyLength: rawBody.length,
    });

    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      logger.error("Invalid webhook signature detected", {
        signatureReceived: redactSensitive(signature),
        recommendation: "Check webhook secret configuration in Razorpay Dashboard",
      });
      
      res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
      return;
    }

    // ── Step 6: Parse Body for Handler ────────────────────────────────────────
    
    try {
      req.body = JSON.parse(rawBody);
      logger.info("Webhook signature verified successfully", {
        event: req.body?.event || "unknown",
      });
    } catch (parseError) {
      logger.error("Failed to parse webhook JSON payload", { error: parseError });
      res.status(400).json({
        success: false,
        message: "Invalid webhook JSON payload",
      });
      return;
    }

    // ── Step 7: Proceed to Handler ────────────────────────────────────────────
    
    next();
    
  } catch (error) {
    logger.error("Unexpected error during webhook verification", { error });
    res.status(500).json({
      success: false,
      message: "Webhook verification failed",
    });
    return;
  }
};
