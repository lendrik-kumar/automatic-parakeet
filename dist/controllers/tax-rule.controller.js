import { z } from "zod";
import * as svc from "../services/tax-rule.service.js";
const createTaxRuleSchema = z.object({
    name: z.string().min(1),
    region: z.string().min(1).nullable().optional(),
    taxRate: z.number().min(0).max(1),
    isActive: z.boolean().optional(),
    priority: z.number().int().optional(),
});
const updateTaxRuleSchema = createTaxRuleSchema.partial();
const listTaxRulesSchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});
const bulkTaxRuleSchema = z.object({
    rules: z.array(createTaxRuleSchema).min(1),
});
const testTaxRuleSchema = z.object({
    region: z.string().min(1).nullable().optional(),
});
export const createTaxRule = async (req, res, next) => {
    try {
        const data = createTaxRuleSchema.parse(req.body);
        const taxRule = await svc.createTaxRule(req.admin.id, data);
        res
            .status(201)
            .json({ success: true, message: "Tax rule created", data: { taxRule } });
    }
    catch (e) {
        next(e);
    }
};
export const listTaxRules = async (req, res, next) => {
    try {
        const { page, limit } = listTaxRulesSchema.parse(req.query);
        const result = await svc.listTaxRules(page, limit);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
export const getTaxRule = async (req, res, next) => {
    try {
        const taxRule = await svc.getTaxRule(req.params.taxRuleId);
        res.status(200).json({ success: true, data: { taxRule } });
    }
    catch (e) {
        next(e);
    }
};
export const updateTaxRule = async (req, res, next) => {
    try {
        const data = updateTaxRuleSchema.parse(req.body);
        const taxRule = await svc.updateTaxRule(req.admin.id, req.params.taxRuleId, data);
        res
            .status(200)
            .json({ success: true, message: "Tax rule updated", data: { taxRule } });
    }
    catch (e) {
        next(e);
    }
};
export const deleteTaxRule = async (req, res, next) => {
    try {
        await svc.deleteTaxRule(req.admin.id, req.params.taxRuleId);
        res.status(200).json({ success: true, message: "Tax rule deleted" });
    }
    catch (e) {
        next(e);
    }
};
export const bulkCreateTaxRules = async (req, res, next) => {
    try {
        const { rules } = bulkTaxRuleSchema.parse(req.body);
        const result = await svc.bulkCreateTaxRules(req.admin.id, rules);
        res.status(201).json({ success: true, message: "Tax rules created", data: result });
    }
    catch (e) {
        next(e);
    }
};
export const testTaxRule = async (req, res, next) => {
    try {
        const { region } = testTaxRuleSchema.parse(req.body);
        const result = await svc.testTaxRule(region);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
