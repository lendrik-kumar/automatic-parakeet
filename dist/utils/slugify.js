/**
 * Convert a string to a URL-friendly slug.
 * Optionally appends a short random suffix for uniqueness.
 */
export const slugify = (text, unique = true) => {
    let slug = text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (unique) {
        const suffix = Math.random().toString(36).substring(2, 8);
        slug = `${slug}-${suffix}`;
    }
    return slug;
};
