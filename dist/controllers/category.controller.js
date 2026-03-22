import { z } from "zod";
import * as svc from "../services/category.service.js";
import { CategoryError } from "../services/category.service.js";
const handleError = (res, error) => {
    if (error instanceof z.ZodError) {
        res
            .status(400)
            .json({
            success: false,
            message: "Validation error",
            errors: error.issues,
        });
        return;
    }
    if (error instanceof CategoryError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[CategoryController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const createCategorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    displayOrder: z.number().int().optional(),
    parentId: z.string().uuid().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
const updateCategorySchema = createCategorySchema.partial();
const statusSchema = z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
const reorderSchema = z.object({
    order: z.array(z.object({
        id: z.string().uuid(),
        displayOrder: z.number().int(),
    })),
});
// ─── Handlers ─────────────────────────────────────────────────────────────────
/** GET /admin/categories */
export const listCategories = async (req, res) => {
    try {
        const result = await svc.listCategories(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.status, req.query.search, req.query.parentId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/categories/tree */
export const getCategoryTree = async (req, res) => {
    try {
        const categories = await svc.getCategoryTree();
        res.status(200).json({ success: true, data: { categories } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/categories */
export const createCategory = async (req, res) => {
    try {
        const data = createCategorySchema.parse(req.body);
        const category = await svc.createCategory(req.admin.id, data);
        res.status(201).json({
            success: true,
            message: "Category created",
            data: { category },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/categories/:categoryId */
export const getCategory = async (req, res) => {
    try {
        const category = await svc.getCategory(req.params.categoryId);
        res.status(200).json({ success: true, data: { category } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PUT /admin/categories/:categoryId */
export const updateCategory = async (req, res) => {
    try {
        const data = updateCategorySchema.parse(req.body);
        const category = await svc.updateCategory(req.admin.id, req.params.categoryId, data);
        res.status(200).json({
            success: true,
            message: "Category updated",
            data: { category },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /admin/categories/:categoryId */
export const deleteCategory = async (req, res) => {
    try {
        await svc.deleteCategory(req.admin.id, req.params.categoryId);
        res.status(200).json({ success: true, message: "Category deleted" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/categories/:categoryId/status */
export const updateCategoryStatus = async (req, res) => {
    try {
        const { status } = statusSchema.parse(req.body);
        const category = await svc.updateCategoryStatus(req.admin.id, req.params.categoryId, status);
        res.status(200).json({
            success: true,
            message: "Category status updated",
            data: { category },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/categories/reorder */
export const reorderCategories = async (req, res) => {
    try {
        const { order } = reorderSchema.parse(req.body);
        await svc.reorderCategories(req.admin.id, order);
        res.status(200).json({
            success: true,
            message: "Categories reordered",
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/categories/:categoryId/subcategories */
export const getCategorySubcategories = async (req, res) => {
    try {
        const category = await svc.getCategorySubcategories(req.params.categoryId);
        res.status(200).json({ success: true, data: { category } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/categories/:categoryId/products */
export const getCategoryProducts = async (req, res) => {
    try {
        const result = await svc.getCategoryProducts(req.params.categoryId, Number(req.query.page) || 1, Number(req.query.limit) || 20);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/categories/:categoryId/stats */
export const getCategoryStats = async (req, res) => {
    try {
        const result = await svc.getCategoryStats(req.params.categoryId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
