import { adminRepository } from "../repositories/admin.repository.js";
import { taxRuleRepository } from "../repositories/tax-rule.repository.js";
import { AppError } from "../utils/AppError.js";
export class TaxRuleError extends AppError {
}
export const createTaxRule = async (adminId, data) => {
    if (data.taxRate < 0 || data.taxRate > 1) {
        throw new TaxRuleError(400, "Tax rate must be between 0 and 1");
    }
    const taxRule = await taxRuleRepository.create(data);
    await adminRepository.logActivity(adminId, "CREATE", "TaxRule", taxRule.id, undefined, taxRule);
    return taxRule;
};
export const listTaxRules = async (page = 1, limit = 20) => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;
    const [taxRules, total] = await taxRuleRepository.findMany(skip, safeLimit);
    return {
        taxRules,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
        },
    };
};
export const getTaxRule = async (taxRuleId) => {
    const taxRule = await taxRuleRepository.findById(taxRuleId);
    if (!taxRule) {
        throw new TaxRuleError(404, "Tax rule not found");
    }
    return taxRule;
};
export const updateTaxRule = async (adminId, taxRuleId, data) => {
    const existing = await taxRuleRepository.findById(taxRuleId);
    if (!existing) {
        throw new TaxRuleError(404, "Tax rule not found");
    }
    if (data.taxRate !== undefined && (data.taxRate < 0 || data.taxRate > 1)) {
        throw new TaxRuleError(400, "Tax rate must be between 0 and 1");
    }
    const updated = await taxRuleRepository.update(taxRuleId, data);
    await adminRepository.logActivity(adminId, "UPDATE", "TaxRule", updated.id, existing, updated);
    return updated;
};
export const deleteTaxRule = async (adminId, taxRuleId) => {
    const existing = await taxRuleRepository.findById(taxRuleId);
    if (!existing) {
        throw new TaxRuleError(404, "Tax rule not found");
    }
    const deleted = await taxRuleRepository.delete(taxRuleId);
    await adminRepository.logActivity(adminId, "DELETE", "TaxRule", deleted.id, existing);
    return deleted;
};
export const bulkCreateTaxRules = async (adminId, taxRules) => {
    for (const rule of taxRules) {
        if (rule.taxRate < 0 || rule.taxRate > 1) {
            throw new TaxRuleError(400, "Tax rate must be between 0 and 1");
        }
    }
    await taxRuleRepository.createMany(taxRules);
    await adminRepository.logActivity(adminId, "CREATE", "TaxRule", undefined, undefined, { count: taxRules.length });
    return { count: taxRules.length };
};
export const testTaxRule = async (region) => {
    const rule = await taxRuleRepository.findApplicable(region ?? null);
    return {
        region: region ?? null,
        appliedRule: rule,
    };
};
