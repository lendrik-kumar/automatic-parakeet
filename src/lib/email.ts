import { Resend } from "resend";

// ─── Resend Configuration ──────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@sprintshoes.com";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const IS_PRODUCTION = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";

// Lazily initialised — avoids crashing on startup without credentials in dev
let _resend: Resend | null = null;
const getResend = (): Resend => {
  if (!_resend) {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY env var is not set.");
    }
    _resend = new Resend(RESEND_API_KEY);
  }
  return _resend;
};

// ─── Core Interface ────────────────────────────────────────────────────────

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

// ─── Base Send Function ───────────────────────────────────────────────────

/**
 * Low-level email sender via Resend.
 * Falls back to a console log in non-production environments so the
 * server starts without real credentials during development / testing.
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    if (!IS_PRODUCTION) {
      console.log("━".repeat(55));
      console.log("✉️  RESEND EMAIL (dev mode — not actually sent)");
      console.log(`  To     : ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log("━".repeat(55));
      return true;
    }

    const resend = getResend();
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text ?? "",
      html: options.html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("[Resend] Failed to send email:", error);
    return false;
  }
};

// ─── Shared HTML Layout Helper ─────────────────────────────────────────────────

const layout = (body: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body  { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 0 auto; }
    .hdr  { background: #2563eb; color: #fff; padding: 24px; text-align: center; }
    .hdr h1 { margin: 0; font-size: 24px; }
    .body { padding: 24px; background: #f9fafb; }
    .btn  { display: inline-block; padding: 12px 28px; background: #2563eb; color: #fff;
            text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .warn { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px; }
    .info { background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px; margin: 20px 0; border-radius: 4px; }
    .otp  { background: #1e40af; color: #fff; font-size: 34px; font-weight: bold;
            text-align: center; padding: 20px; margin: 24px 0; border-radius: 8px; letter-spacing: 10px; }
    .ftr  { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body><div class="wrap">
  <div class="hdr"><h1>Sprint Shoes</h1></div>
  <div class="body">${body}</div>
  <div class="ftr">&copy; 2026 Sprint Shoes. All rights reserved.</div>
</div></body>
</html>`;

// ─── Transactional Email Senders ─────────────────────────────────────────────────

/** Welcome email sent immediately after registration. */
export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
): Promise<boolean> =>
  sendEmail({
    to: email,
    subject: "Welcome to Sprint Shoes!",
    text: `Welcome to Sprint Shoes, ${firstName}! Your account has been successfully created.`,
    html: layout(`
      <h2>Welcome, ${firstName}!</h2>
      <p>Your Sprint Shoes account has been created successfully. We're thrilled to have you onboard!</p>
      <a href="${FRONTEND_URL}/shop" class="btn">Start Shopping</a>
      <p>If you have any questions, our support team is always here to help.</p>
    `),
  });

/** Email-address verification link. */
export const sendEmailVerification = async (
  email: string,
  verificationToken: string,
  firstName: string,
): Promise<boolean> => {
  const url = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  return sendEmail({
    to: email,
    subject: "Verify Your Email — Sprint Shoes",
    text: `Hi ${firstName}, verify your email: ${url} (expires in 24 h)`,
    html: layout(`
      <h2>Verify Your Email</h2>
      <p>Hi ${firstName},</p>
      <p>Click the button below to verify your Sprint Shoes email address:</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p>Or paste this URL into your browser:</p>
      <p style="word-break:break-all">${url}</p>
      <div class="warn">This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.</div>
    `),
  });
};

/** OTP-style email verification code. */
export const sendOTPEmail = async (
  email: string,
  otp: string,
  firstName?: string,
): Promise<boolean> =>
  sendEmail({
    to: email,
    subject: "Your Verification Code — Sprint Shoes",
    text: `Your OTP is: ${otp}. Expires in 10 minutes. Never share this code.`,
    html: layout(`
      <h2>Your Verification Code</h2>
      ${firstName ? `<p>Hi ${firstName},</p>` : ""}
      <p>Use the code below to complete your verification:</p>
      <div class="otp">${otp}</div>
      <div class="warn"><strong>Security:</strong> This OTP expires in 10 minutes. Never share it with anyone.</div>
    `),
  });

/** Password reset OTP. */
export const sendPasswordResetEmail = async (
  email: string,
  otp: string,
  firstName: string,
): Promise<boolean> =>
  sendEmail({
    to: email,
    subject: "Password Reset OTP — Sprint Shoes",
    text: `Hi ${firstName}, use OTP ${otp} to reset your password. It expires in 10 minutes.`,
    html: layout(`
      <h2>Password Reset Request</h2>
      <p>Hi ${firstName},</p>
      <p>Use the OTP below to reset your Sprint Shoes account password:</p>
      <div class="otp">${otp}</div>
      <div class="warn"><strong>Security:</strong> This OTP expires in <strong>10 minutes</strong>. If you didn't request a reset, you can safely ignore this email.</div>
    `),
  });

/** Security notification: new login detected. */
export const sendLoginNotification = async (
  email: string,
  firstName: string,
  device: string,
  ipAddress: string,
  timestamp: Date,
): Promise<boolean> =>
  sendEmail({
    to: email,
    subject: "New Login Detected — Sprint Shoes",
    text: `Hi ${firstName}, new login at ${timestamp.toLocaleString()} from ${device} (${ipAddress}).`,
    html: layout(`
      <h2>New Login Detected</h2>
      <p>Hi ${firstName},</p>
      <p>A new login was detected on your account:</p>
      <div class="info">
        <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
        <p><strong>Device:</strong> ${device}</p>
        <p><strong>IP Address:</strong> ${ipAddress}</p>
      </div>
      <p>If this was you, no action is required.</p>
      <div class="warn">If you don't recognise this activity, <strong>change your password immediately</strong>.</div>
    `),
  });

/** Security notification: password was changed. */
export const sendPasswordChangedNotification = async (
  email: string,
  firstName: string,
): Promise<boolean> =>
  sendEmail({
    to: email,
    subject: "Your Password Was Changed — Sprint Shoes",
    text: `Hi ${firstName}, your Sprint Shoes password was just changed. If this wasn't you, contact support.`,
    html: layout(`
      <h2>Password Changed</h2>
      <p>Hi ${firstName},</p>
      <p>Your Sprint Shoes account password was changed successfully.</p>
      <div class="warn">If you didn't make this change, please <strong>contact support immediately</strong> at support@sprintshoes.com.</div>
    `),
  });
