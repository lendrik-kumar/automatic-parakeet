import prisma from "../lib/prisma.js";
import { slugify } from "./slugify.js";

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      brand: true,
      category: true,
      collectionId: true,
      categoryId: true,
    },
  });

  const uniqueBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
  const uniqueCategories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  const collectionSlugCount = new Map<string, number>();
  const categorySlugCount = new Map<string, number>();

  const collectionRows = uniqueBrands.map((name, index) => {
    const baseSlug = slugify(name);
    const existingCount = collectionSlugCount.get(baseSlug) ?? 0;
    collectionSlugCount.set(baseSlug, existingCount + 1);
    const slug = existingCount === 0 ? baseSlug : `${baseSlug}-${existingCount + 1}`;

    return {
      name,
      slug,
      displayOrder: index,
      status: "ACTIVE" as const,
    };
  });

  const categoryRows = uniqueCategories.map((name, index) => {
    const baseSlug = slugify(name);
    const existingCount = categorySlugCount.get(baseSlug) ?? 0;
    categorySlugCount.set(baseSlug, existingCount + 1);
    const slug = existingCount === 0 ? baseSlug : `${baseSlug}-${existingCount + 1}`;

    return {
      name,
      slug,
      displayOrder: index,
      status: "ACTIVE" as const,
    };
  });

  if (dryRun) {
    console.log("[DRY RUN] Migration preview");
    console.log(`Products: ${products.length}`);
    console.log(`Collections to ensure: ${collectionRows.length}`);
    console.log(`Categories to ensure: ${categoryRows.length}`);
  }

  if (!dryRun) {
    for (const row of collectionRows) {
      await prisma.collection.upsert({
        where: { name: row.name },
        update: {
          slug: row.slug,
          displayOrder: row.displayOrder,
          status: row.status,
        },
        create: row,
      });
    }

    for (const row of categoryRows) {
      await prisma.category.upsert({
        where: { name: row.name },
        update: {
          slug: row.slug,
          displayOrder: row.displayOrder,
          status: row.status,
        },
        create: row,
      });
    }
  }

  const collections = await prisma.collection.findMany({
    select: { id: true, name: true },
  });
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });

  const collectionByName = new Map(collections.map((c) => [c.name, c.id]));
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  let productUpdates = 0;

  for (const product of products) {
    const collectionId = collectionByName.get(product.brand);
    const categoryId = categoryByName.get(product.category);

    if (!collectionId && !categoryId) continue;

    const needsCollectionUpdate = product.collectionId !== collectionId;
    const needsCategoryUpdate = product.categoryId !== categoryId;

    if (!needsCollectionUpdate && !needsCategoryUpdate) continue;

    productUpdates += 1;

    if (!dryRun) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          collectionId,
          categoryId,
        },
      });
    }
  }

  const pendingReviewCount = await prisma.productReview.count({
    where: { status: "PENDING" },
  });

  if (!dryRun) {
    await prisma.productReview.updateMany({
      where: {},
      data: { status: "PENDING" },
    });
  }

  console.log(`Collections ensured: ${collectionRows.length}`);
  console.log(`Categories ensured: ${categoryRows.length}`);
  console.log(`Products linked: ${productUpdates}`);
  console.log(`Reviews already pending: ${pendingReviewCount}`);
  console.log(dryRun ? "Dry run completed" : "Data migration completed");
};

run()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
