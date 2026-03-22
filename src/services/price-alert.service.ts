import { AppError } from "../utils/AppError.js";
import { priceAlertRepository } from "../repositories/price-alert.repository.js";
import { productRepository } from "../repositories/product.repository.js";

export class PriceAlertError extends AppError {}

export const listPriceAlerts = async (userId: string) =>
  priceAlertRepository.listByUserId(userId);

export const createPriceAlert = async (
  userId: string,
  data: { productId: string; wishlistItemId?: string; targetPrice: number },
) => {
  const product = await productRepository.findById(data.productId);
  if (!product) {
    throw new PriceAlertError(404, "Product not found");
  }

  if (data.targetPrice <= 0) {
    throw new PriceAlertError(400, "Target price must be greater than 0");
  }

  return priceAlertRepository.create({
    userId,
    productId: data.productId,
    wishlistItemId: data.wishlistItemId ?? null,
    targetPrice: data.targetPrice,
    currentPrice: product.basePrice,
    isActive: true,
  });
};

export const updatePriceAlert = async (
  userId: string,
  alertId: string,
  data: { targetPrice?: number; isActive?: boolean },
) => {
  const existing = await priceAlertRepository.findById(alertId);
  if (!existing || existing.userId !== userId) {
    throw new PriceAlertError(404, "Price alert not found");
  }

  if (data.targetPrice !== undefined && data.targetPrice <= 0) {
    throw new PriceAlertError(400, "Target price must be greater than 0");
  }

  return priceAlertRepository.update(alertId, data);
};

export const deletePriceAlert = async (userId: string, alertId: string) => {
  const existing = await priceAlertRepository.findById(alertId);
  if (!existing || existing.userId !== userId) {
    throw new PriceAlertError(404, "Price alert not found");
  }

  await priceAlertRepository.delete(alertId);
  return { id: alertId };
};
