/**
 * Environment Validation Utility
 * 
 * Validates required environment variables on startup
 * Fails fast if critical configuration is missing
 */

import { createLogger } from "./secureLogger.js";

const logger = createLogger("Environment");

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnvValidationConfig {
  variable: string;
  required: boolean;
  productionOnly?: boolean;
  description: string;
  format?: "url" | "email" | "number" | "boolean" | "jwt_secret" | "api_key";
}

// ─── Environment Configuration ──────────────────────────────────────────────

const ENV_VARIABLES: EnvValidationConfig[] = [
  // Database
  {
    variable: "DATABASE_URL",
    required: true,
    description: "PostgreSQL connection string",
    format: "url",
  },

  // Redis
  {
    variable: "REDIS_HOST",
    required: true,
    description: "Redis server hostname",
  },
  {
    variable: "REDIS_PORT",
    required: true,
    description: "Redis server port",
    format: "number",
  },

  // Authentication
  {
    variable: "JWT_SECRET",
    required: true,
    description: "JWT signing secret (minimum 32 characters)",
    format: "jwt_secret",
  },

  // Frontend
  {
    variable: "FRONTEND_URL",
    required: true,
    description: "Frontend application URL for CORS",
    format: "url",
  },

  // Razorpay - Required
  {
    variable: "RAZORPAY_KEY_ID",
    required: true,
    description: "Razorpay API key ID",
    format: "api_key",
  },
  {
    variable: "RAZORPAY_KEY_SECRET",
    required: true,
    description: "Razorpay API key secret",
    format: "api_key",
  },

  // Razorpay - Production Only
  {
    variable: "RAZORPAY_WEBHOOK_SECRET",
    required: true,
    productionOnly: true,
    description: "Razorpay webhook secret for signature verification",
    format: "api_key",
  },

  // Email (Optional but recommended)
  {
    variable: "RESEND_API_KEY",
    required: false,
    description: "Resend email service API key",
  },

  // SMS (Optional)
  {
    variable: "FAST2SMS_API_KEY",
    required: false,
    description: "Fast2SMS service API key",
  },
];

// ─── Validation Functions ────────────────────────────────────────────────────

/**
 * Validate URL format
 */
const validateUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return ["http:", "https:", "postgresql:", "postgres:"].includes(url.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate email format
 */
const validateEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * Validate number format
 */
const validateNumber = (value: string): boolean => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0;
};

/**
 * Validate JWT secret strength
 */
const validateJwtSecret = (value: string): boolean => {
  return value.length >= 32;
};

/**
 * Validate API key format
 */
const validateApiKey = (value: string): boolean => {
  return value.length >= 16 && !value.includes(" ");
};

/**
 * Validate environment variable value
 */
const validateValue = (config: EnvValidationConfig, value: string): boolean => {
  if (!value || value.trim().length === 0) {
    return false;
  }

  switch (config.format) {
    case "url":
      return validateUrl(value);
    case "email":
      return validateEmail(value);
    case "number":
      return validateNumber(value);
    case "jwt_secret":
      return validateJwtSecret(value);
    case "api_key":
      return validateApiKey(value);
    case "boolean":
      return ["true", "false", "1", "0"].includes(value.toLowerCase());
    default:
      return true;
  }
};

// ─── Main Validation Function ────────────────────────────────────────────────

/**
 * Validate all environment variables
 * @returns Array of validation errors (empty if all valid)
 */
export const validateEnvironment = (): string[] => {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  logger.info("Validating environment configuration", {
    nodeEnv: process.env.NODE_ENV,
    isProduction,
  });

  for (const config of ENV_VARIABLES) {
    const value = process.env[config.variable];

    // Check if required
    const isRequired = config.required && (!config.productionOnly || isProduction);

    if (isRequired && (!value || value.trim().length === 0)) {
      errors.push(
        `Missing required environment variable: ${config.variable} (${config.description})`,
      );
      continue;
    }

    // Skip validation if optional and not provided
    if (!value) {
      continue;
    }

    // Validate format
    if (!validateValue(config, value)) {
      errors.push(
        `Invalid format for ${config.variable}: ${config.description}${
          config.format ? ` (expected: ${config.format})` : ""
        }`,
      );
    }
  }

  return errors;
};

/**
 * Validate environment and exit process if errors found
 */
export const validateEnvironmentOrExit = (): void => {
  const errors = validateEnvironment();

  if (errors.length > 0) {
    logger.error("Environment validation failed", { errors });

    console.error("\n🚨 Environment Validation Failed!\n");
    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });
    console.error("\n💡 Please fix the above issues and restart the server.\n");

    process.exit(1);
  }

  logger.info("Environment validation completed successfully");
};

/**
 * Get environment summary for debugging
 */
export const getEnvironmentSummary = (): Record<string, unknown> => {
  const summary: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    isProduction: process.env.NODE_ENV === "production",
    configured: {},
    missing: [],
  };

  for (const config of ENV_VARIABLES) {
    const value = process.env[config.variable];
    const isRequired = config.required && (!config.productionOnly || summary.isProduction);

    if (value) {
      (summary.configured as Record<string, unknown>)[config.variable] = 
        config.format === "api_key" || config.variable.includes("SECRET")
          ? `${value.slice(0, 4)}...${value.slice(-4)}`
          : value;
    } else if (isRequired) {
      (summary.missing as string[]).push(config.variable);
    }
  }

  return summary;
};

export default validateEnvironment;