import { z } from "zod";
import * as svc from "../services/collection.service.js";
import { CollectionError } from "../services/collection.service.js";
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
    if (error instanceof CollectionError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[CollectionController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const createCollectionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    displayOrder: z.number().int().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
const updateCollectionSchema = createCollectionSchema.partial();
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
/** GET /admin/collections */
export const listCollections = async (req, res) => {
    try {
        const result = await svc.listCollections(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.status, req.query.search);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/collections */
export const createCollection = async (req, res) => {
    try {
        const data = createCollectionSchema.parse(req.body);
        const collection = await svc.createCollection(req.admin.id, data);
        res.status(201).json({
            success: true,
            message: "Collection created",
            data: { collection },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/collections/:collectionId */
export const getCollection = async (req, res) => {
    try {
        const collection = await svc.getCollection(req.params.collectionId);
        res.status(200).json({ success: true, data: { collection } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PUT /admin/collections/:collectionId */
export const updateCollection = async (req, res) => {
    try {
        const data = updateCollectionSchema.parse(req.body);
        const collection = await svc.updateCollection(req.admin.id, req.params.collectionId, data);
        res.status(200).json({
            success: true,
            message: "Collection updated",
            data: { collection },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /admin/collections/:collectionId */
export const deleteCollection = async (req, res) => {
    try {
        await svc.deleteCollection(req.admin.id, req.params.collectionId);
        res.status(200).json({ success: true, message: "Collection deleted" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/collections/:collectionId/status */
export const updateCollectionStatus = async (req, res) => {
    try {
        const { status } = statusSchema.parse(req.body);
        const collection = await svc.updateCollectionStatus(req.admin.id, req.params.collectionId, status);
        res.status(200).json({
            success: true,
            message: "Collection status updated",
            data: { collection },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/collections/reorder */
export const reorderCollections = async (req, res) => {
    try {
        const { order } = reorderSchema.parse(req.body);
        await svc.reorderCollections(req.admin.id, order);
        res.status(200).json({
            success: true,
            message: "Collections reordered",
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/collections/:collectionId/products */
export const getCollectionProducts = async (req, res) => {
    try {
        const result = await svc.getCollectionProducts(req.params.collectionId, Number(req.query.page) || 1, Number(req.query.limit) || 20);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/collections/:collectionId/stats */
export const getCollectionStats = async (req, res) => {
    try {
        const result = await svc.getCollectionStats(req.params.collectionId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
