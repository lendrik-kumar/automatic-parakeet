import nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@sprintshoes.com";

// Create reusable transporter object using SMTP transport
let transporter: Transporter | null = null;

const createTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth:
        EMAIL_USER && EMAIL_PASSWORD
          ? {
              user: EMAIL_USER,
              pass: EMAIL_PASSWORD,
            }
          : undefined,
    });
  }
  return transporter;
};

// Interface for email options
interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Base function to send emails
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `Sprint Shoes <${EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// Send email verification email
export const sendEmailVerification = async (
  email: string,
  verificationToken: string,
  firstName: string,
): Promise<boolean> => {
  const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sprint Shoes</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${firstName}!</h2>
            <p>Thank you for registering with Sprint Shoes. Please verify your email address to complete your registration.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with Sprint Shoes, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Sprint Shoes. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Verify Your Email - Sprint Shoes",
    html,
    text: `Welcome to Sprint Shoes! Please verify your email by visiting: ${verificationUrl}`,
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  firstName: string,
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sprint Shoes</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2026 Sprint Shoes. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Reset Your Password - Sprint Shoes",
    html,
    text: `Reset your password by visiting: ${resetUrl}. This link will expire in 1 hour.`,
  });
};

// Send login notification email
export const sendLoginNotification = async (
  email: string,
  firstName: string,
  device: string,
  ipAddress: string,
  timestamp: Date,
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .info-box { background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 12px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sprint Shoes</h1>
          </div>
          <div class="content">
            <h2>New Login Detected</h2>
            <p>Hi ${firstName},</p>
            <p>We detected a new login to your Sprint Shoes account:</p>
            <div class="info-box">
              <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
              <p><strong>Device:</strong> ${device}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
            </div>
            <p>If this was you, you can safely ignore this email.</p>
            <p>If you don't recognize this activity, please secure your account immediately by changing your password.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Sprint Shoes. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "New Login to Your Account - Sprint Shoes",
    html,
    text: `New login detected at ${timestamp.toLocaleString()} from ${device} (${ipAddress})`,
  });
};

// Send welcome email after successful registration
export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sprint Shoes</h1>
          </div>
          <div class="content">
            <h2>Welcome to Sprint Shoes!</h2>
            <p>Hi ${firstName},</p>
            <p>Your account has been successfully created. We're excited to have you as part of our community!</p>
            <p>Start shopping for the best athletic shoes and gear:</p>
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/shop" class="button">Start Shopping</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Sprint Shoes. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Welcome to Sprint Shoes!",
    html,
    text: `Welcome to Sprint Shoes, ${firstName}! Your account has been successfully created.`,
  });
};

// Send OTP via email
export const sendOTPEmail = async (
  email: string,
  otp: string,
  firstName?: string,
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .otp-box { background-color: #1e40af; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 8px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sprint Shoes</h1>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            ${firstName ? `<p>Hi ${firstName},</p>` : "<p>Hello,</p>"}
            <p>Use the following OTP to complete your verification:</p>
            <div class="otp-box">${otp}</div>
            <div class="warning">
              <strong>Security Notice:</strong> This OTP will expire in 10 minutes. Never share this code with anyone.
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2026 Sprint Shoes. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Your Verification Code - Sprint Shoes",
    html,
    text: `Your OTP is: ${otp}. This code will expire in 10 minutes.`,
  });
};
