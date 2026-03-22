import { Request, Response } from "express";
import { z } from "zod";

import * as svc from "../services/address.service.js";
import { AddressError } from "../services/address.service.js";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  addressLine1: z.string().min(5, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(4, "Valid postal code is required"),
  landmark: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

const updateAddressSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  addressLine1: z.string().min(5).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  postalCode: z.string().min(4).optional(),
  landmark: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const addressIdSchema = z.object({
  addressId: z.string().uuid("Invalid address ID format"),
});

// ─── Error Handler ──────────────────────────────────────────────────────────

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.issues,
    });
    return;
  }

  if (error instanceof AddressError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error("[AddressController]", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// ─── Controller Handlers ────────────────────────────────────────────────────

/**
 * GET /user/addresses
 * List all addresses for authenticated user
 */
export const listAddresses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const addresses = await svc.listUserAddresses(userId);

    res.status(200).json({
      success: true,
      data: { addresses },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * GET /user/addresses/:addressId
 * Get a single address by ID
 */
export const getAddress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { addressId } = addressIdSchema.parse(req.params);

    const address = await svc.getAddressById(userId, addressId);

    res.status(200).json({
      success: true,
      data: { address },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * POST /user/addresses
 * Create a new address
 */
export const createAddress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = createAddressSchema.parse(req.body);

    const address = await svc.createAddress(userId, data);

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: { address },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * PATCH /user/addresses/:addressId
 * Update an address
 */
export const updateAddress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { addressId } = addressIdSchema.parse(req.params);
    const data = updateAddressSchema.parse(req.body);

    const address = await svc.updateAddress(userId, addressId, data);

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: { address },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * DELETE /user/addresses/:addressId
 * Delete an address
 */
export const deleteAddress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { addressId } = addressIdSchema.parse(req.params);

    const result = await svc.deleteAddress(userId, addressId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * PATCH /user/addresses/:addressId/set-default-shipping
 * Set address as default shipping
 */
export const setDefaultShipping = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { addressId } = addressIdSchema.parse(req.params);

    const address = await svc.setDefaultShipping(userId, addressId);

    res.status(200).json({
      success: true,
      message: "Default shipping address updated",
      data: { address },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * PATCH /user/addresses/:addressId/set-default-billing
 * Set address as default billing
 */
export const setDefaultBilling = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { addressId } = addressIdSchema.parse(req.params);

    const address = await svc.setDefaultBilling(userId, addressId);

    res.status(200).json({
      success: true,
      message: "Default billing address updated",
      data: { address },
    });
  } catch (e) {
    handleError(res, e);
  }
};
