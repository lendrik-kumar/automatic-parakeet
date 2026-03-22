import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/shipping-rule.service.js";

const createShippingRuleSchema = z.object({
  name: z.string().min(1),
  region: z.string().min(1).nullable().optional(),
  minimumOrder: z.number().min(0).optional(),
  maximumOrder: z.number().min(0).nullable().optional(),
  shippingCost: z.number().min(0),
  isFreeShipping: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
});

const updateShippingRuleSchema = createShippingRuleSchema.partial();

const listShippingRulesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const bulkShippingRuleSchema = z.object({
  rules: z.array(createShippingRuleSchema).min(1),
});

const testShippingRuleSchema = z.object({
  orderTotal: z.number().min(0),
  region: z.string().min(1).nullable().optional(),
});

export const createShippingRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = createShippingRuleSchema.parse(req.body);
    const shippingRule = await svc.createShippingRule(req.admin!.id, data);
    res.status(201).json({
      success: true,
      message: "Shipping rule created",
      data: { shippingRule },
    });
  } catch (e) {
    next(e);
  }
};

export const listShippingRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = listShippingRulesSchema.parse(req.query);
    const result = await svc.listShippingRules(page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const getShippingRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const shippingRule = await svc.getShippingRule(req.params.shippingRuleId);
    res.status(200).json({ success: true, data: { shippingRule } });
  } catch (e) {
    next(e);
  }
};

export const updateShippingRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = updateShippingRuleSchema.parse(req.body);
    const shippingRule = await svc.updateShippingRule(
      req.admin!.id,
      req.params.shippingRuleId,
      data,
    );
    res.status(200).json({
      success: true,
      message: "Shipping rule updated",
      data: { shippingRule },
    });
  } catch (e) {
    next(e);
  }
};

export const deleteShippingRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await svc.deleteShippingRule(req.admin!.id, req.params.shippingRuleId);
    res.status(200).json({ success: true, message: "Shipping rule deleted" });
  } catch (e) {
    next(e);
  }
};

export const bulkCreateShippingRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rules } = bulkShippingRuleSchema.parse(req.body);
    const result = await svc.bulkCreateShippingRules(req.admin!.id, rules);
    res.status(201).json({
      success: true,
      message: "Shipping rules created",
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export const testShippingRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderTotal, region } = testShippingRuleSchema.parse(req.body);
    const result = await svc.testShippingRule(orderTotal, region);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};
