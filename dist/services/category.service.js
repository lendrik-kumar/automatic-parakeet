import { categoryRepository, } from "../repositories/category.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { slugify } from "../utils/slugify.js";
export class CategoryError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "CategoryError";
    }
}
export const listCategories = async (page = 1, limit = 20, status, search, parentId) => {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
        categoryRepository.findAll({ skip, take: limit, status, search, parentId }),
        categoryRepository.count({ status, search, parentId }),
    ]);
    return {
        categories,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getCategory = async (id) => {
    const category = await categoryRepository.findById(id);
    if (!category)
        throw new CategoryError(404, "Category not found");
    return category;
};
export const getCategoryBySlug = async (slug) => {
    const category = await categoryRepository.findBySlug(slug);
    if (!category)
        throw new CategoryError(404, "Category not found");
    return category;
};
export const getCategoryTree = async () => {
    return categoryRepository.findRootCategories();
};
export const createCategory = async (adminId, data) => {
    // Generate slug from name if not provided
    const slug = data.slug || slugify(data.name);
    // Validate parent category exists if parentId provided
    if (data.parentId) {
        const parent = await categoryRepository.findById(data.parentId);
        if (!parent)
            throw new CategoryError(404, "Parent category not found");
    }
    // Check if name or slug already exists
    const [existingByName, existingBySlug] = await Promise.all([
        categoryRepository.findByName(data.name),
        categoryRepository.findBySlug(slug),
    ]);
    if (existingByName)
        throw new CategoryError(400, "Category with this name already exists");
    if (existingBySlug)
        throw new CategoryError(400, "Category with this slug already exists");
    const category = await categoryRepository.create({
        ...data,
        slug,
    });
    await adminRepository.logActivity(adminId, "CREATE", "Category", category.id);
    return category;
};
export const updateCategory = async (adminId, id, data) => {
    const existing = await categoryRepository.findById(id);
    if (!existing)
        throw new CategoryError(404, "Category not found");
    // Prevent setting self as parent
    if (data.parentId === id) {
        throw new CategoryError(400, "Category cannot be its own parent");
    }
    // Validate parent category exists if parentId provided
    if (data.parentId) {
        const parent = await categoryRepository.findById(data.parentId);
        if (!parent)
            throw new CategoryError(404, "Parent category not found");
        // Prevent circular references (parent-child loop)
        if (parent.parentId === id) {
            throw new CategoryError(400, "Cannot create circular parent-child relationship");
        }
    }
    // If updating name, generate new slug
    if (data.name && !data.slug) {
        data.slug = slugify(data.name);
    }
    // Check for name/slug conflicts
    if (data.name && data.name !== existing.name) {
        const existingByName = await categoryRepository.findByName(data.name);
        if (existingByName && existingByName.id !== id) {
            throw new CategoryError(400, "Category with this name already exists");
        }
    }
    if (data.slug && data.slug !== existing.slug) {
        const existingBySlug = await categoryRepository.findBySlug(data.slug);
        if (existingBySlug && existingBySlug.id !== id) {
            throw new CategoryError(400, "Category with this slug already exists");
        }
    }
    const category = await categoryRepository.update(id, data);
    await adminRepository.logActivity(adminId, "UPDATE", "Category", id);
    return category;
};
export const deleteCategory = async (adminId, id) => {
    const existing = await categoryRepository.findById(id);
    if (!existing)
        throw new CategoryError(404, "Category not found");
    // Check if category has subcategories
    if (existing._count.subcategories > 0) {
        throw new CategoryError(400, `Cannot delete category with ${existing._count.subcategories} subcategories. Please delete or reassign subcategories first.`);
    }
    // Check if category has products
    const productCount = await categoryRepository.countProducts(id);
    if (productCount > 0) {
        throw new CategoryError(400, `Cannot delete category with ${productCount} products. Please reassign or delete products first.`);
    }
    await categoryRepository.hardDelete(id);
    await adminRepository.logActivity(adminId, "DELETE", "Category", id);
};
export const updateCategoryStatus = async (adminId, id, status) => {
    const existing = await categoryRepository.findById(id);
    if (!existing)
        throw new CategoryError(404, "Category not found");
    const category = await categoryRepository.updateStatus(id, status);
    await adminRepository.logActivity(adminId, "UPDATE", "Category", id);
    return category;
};
export const reorderCategories = async (adminId, orderMap) => {
    // Validate all categories exist
    const categories = await Promise.all(orderMap.map((item) => categoryRepository.findById(item.id)));
    if (categories.some((c) => !c)) {
        throw new CategoryError(400, "One or more categories not found");
    }
    await categoryRepository.reorder(orderMap);
    await adminRepository.logActivity(adminId, "UPDATE", "Category", "bulk-reorder");
};
export const getCategorySubcategories = async (id) => {
    const category = await categoryRepository.findWithSubcategories(id);
    if (!category)
        throw new CategoryError(404, "Category not found");
    return category;
};
export const getCategoryProducts = async (id, page = 1, limit = 20) => {
    const category = await categoryRepository.findById(id);
    if (!category)
        throw new CategoryError(404, "Category not found");
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
        categoryRepository.getProducts(id, skip, limit),
        categoryRepository.countProducts(id),
    ]);
    return {
        category,
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getCategoryStats = async (id) => {
    const category = await categoryRepository.findById(id);
    if (!category)
        throw new CategoryError(404, "Category not found");
    const stats = await categoryRepository.getStats(id);
    return {
        category,
        stats,
    };
};
