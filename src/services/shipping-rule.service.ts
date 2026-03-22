import { adminRepository } from "../repositories/admin.repository.js";
import { shippingRuleRepository } from "../repositories/shipping-rule.repository.js";
import { AppError } from "../utils/AppError.js";

export class ShippingRuleError extends AppError {}

interface CreateShippingRuleInput {
  name: string;
  region?: string | null;
  minimumOrder?: number;
  maximumOrder?: number | null;
  shippingCost: number;
  isFreeShipping?: boolean;
  isActive?: boolean;
  priority?: number;
}

interface UpdateShippingRuleInput {
  name?: string;
  region?: string | null;
  minimumOrder?: number;
  maximumOrder?: number | null;
  shippingCost?: number;
  isFreeShipping?: boolean;
  isActive?: boolean;
  priority?: number;
}

const validateRule = (data: { minimumOrder?: number; maximumOrder?: number | null }) => {
  if (
    data.maximumOrder !== undefined &&
    data.maximumOrder !== null &&
    data.minimumOrder !== undefined &&
    data.maximumOrder < data.minimumOrder
  ) {
    throw new ShippingRuleError(
      400,
      "Maximum order amount must be greater than or equal to minimum order amount",
    );
  }
};

export const createShippingRule = async (
  adminId: string,
  data: CreateShippingRuleInput,
) => {
  validateRule(data);

  const shippingRule = await shippingRuleRepository.create(data);

  await adminRepository.logActivity(
    adminId,
    "CREATE",
    "ShippingRule",
    shippingRule.id,
    undefined,
    shippingRule as unknown as Record<string, unknown>,
  );

  return shippingRule;
};

export const listShippingRules = async (page = 1, limit = 20) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [shippingRules, total] = await shippingRuleRepository.findMany(skip, safeLimit);

  return {
    shippingRules,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getShippingRule = async (shippingRuleId: string) => {
  const shippingRule = await shippingRuleRepository.findById(shippingRuleId);
  if (!shippingRule) {
    throw new ShippingRuleError(404, "Shipping rule not found");
  }
  return shippingRule;
};

export const updateShippingRule = async (
  adminId: string,
  shippingRuleId: string,
  data: UpdateShippingRuleInput,
) => {
  const existing = await shippingRuleRepository.findById(shippingRuleId);
  if (!existing) {
    throw new ShippingRuleError(404, "Shipping rule not found");
  }

  validateRule({
    minimumOrder: data.minimumOrder ?? existing.minimumOrder,
    maximumOrder:
      data.maximumOrder !== undefined ? data.maximumOrder : existing.maximumOrder,
  });

  const updated = await shippingRuleRepository.update(shippingRuleId, data);

  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ShippingRule",
    updated.id,
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
  );

  return updated;
};

export const deleteShippingRule = async (
  adminId: string,
  shippingRuleId: string,
) => {
  const existing = await shippingRuleRepository.findById(shippingRuleId);
  if (!existing) {
    throw new ShippingRuleError(404, "Shipping rule not found");
  }

  const deleted = await shippingRuleRepository.delete(shippingRuleId);

  await adminRepository.logActivity(
    adminId,
    "DELETE",
    "ShippingRule",
    deleted.id,
    existing as unknown as Record<string, unknown>,
  );

  return deleted;
};

export const bulkCreateShippingRules = async (
  adminId: string,
  shippingRules: CreateShippingRuleInput[],
) => {
  for (const rule of shippingRules) {
    validateRule(rule);
  }

  await shippingRuleRepository.createMany(shippingRules);

  await adminRepository.logActivity(
    adminId,
    "CREATE",
    "ShippingRule",
    undefined,
    undefined,
    { count: shippingRules.length },
  );

  return { count: shippingRules.length };
};

export const testShippingRule = async (
  orderTotal: number,
  region?: string | null,
) => {
  const rule = await shippingRuleRepository.findMatchingRule(orderTotal, region ?? null);
  return {
    orderTotal,
    region: region ?? null,
    appliedRule: rule,
  };
};
