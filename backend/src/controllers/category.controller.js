const prisma = require("../config/prisma");
const { uploadImage, deleteImage, keyFromUrl } = require("../services/storage");
const { slugify, cleanText, parseBoolean, toId } = require("../utils/helpers");

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sendError = (res, error, fallback) => {
  if (error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
};

const uniqueSlug = async (base, ignoreId = null) => {
  const root = slugify(base) || `category-${Date.now()}`;
  let candidate = root;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${root}-${counter++}`;
  }
};

// ======================================
// GET ALL CATEGORIES (public)
// ======================================

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: { id: "asc" },
    });

    res.json({ success: true, categories });
  } catch (error) {
    sendError(res, error, "Failed to fetch categories");
  }
};

// ======================================
// GET SINGLE CATEGORY (public)
// ======================================

const getCategoryById = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) throw httpError(404, "Category not found");

    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: { where: { isActive: true } } },
    });

    if (!category) throw httpError(404, "Category not found");

    res.json({ success: true, category });
  } catch (error) {
    sendError(res, error, "Failed to fetch category");
  }
};

// ======================================
// CREATE CATEGORY (admin) - multipart: name, nameAr, image(file)
// ======================================

const createCategory = async (req, res) => {
  let uploaded = null;

  try {
    const nameAr = cleanText(req.body.nameAr, 191);
    const name = cleanText(req.body.name, 191) || nameAr;

    if (!name) throw httpError(400, "Category name is required");

    const duplicate = await prisma.category.findFirst({
      where: { OR: [{ name }, ...(nameAr ? [{ nameAr }] : [])] },
    });
    if (duplicate) throw httpError(409, "A category with this name already exists");

    const slug = await uniqueSlug(req.body.slug || name);

    uploaded = await uploadImage(req.file, "categories");

    const category = await prisma.category.create({
      data: {
        name,
        nameAr: nameAr || null,
        slug,
        image: uploaded?.url || cleanText(req.body.image, 500) || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (uploaded) await deleteImage(uploaded.key);
    sendError(res, error, "Failed to create category");
  }
};

// ======================================
// UPDATE CATEGORY (admin)
// ======================================

const updateCategory = async (req, res) => {
  let uploaded = null;

  try {
    const id = toId(req.params.id);
    if (!id) throw httpError(400, "Invalid category ID");

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Category not found");

    const data = {};

    if (req.body.name !== undefined || req.body.nameAr !== undefined) {
      const nameAr = cleanText(req.body.nameAr ?? existing.nameAr, 191);
      const name = cleanText(req.body.name ?? existing.name, 191) || nameAr;
      if (!name) throw httpError(400, "Category name is required");

      const duplicate = await prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [{ name }, ...(nameAr ? [{ nameAr }] : [])],
        },
      });
      if (duplicate) throw httpError(409, "A category with this name already exists");

      data.name = name;
      data.nameAr = nameAr || null;
    }

    uploaded = await uploadImage(req.file, "categories");

    if (uploaded) {
      data.image = uploaded.url;
    } else if (parseBoolean(req.body.removeImage)) {
      data.image = null;
    }

    const category = await prisma.category.update({ where: { id }, data });

    if (data.image !== undefined && existing.image && existing.image !== data.image) {
      await deleteImage(keyFromUrl(existing.image));
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    if (uploaded) await deleteImage(uploaded.key);
    sendError(res, error, "Failed to update category");
  }
};

// ======================================
// DELETE CATEGORY (admin)
// ======================================

const deleteCategory = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) throw httpError(400, "Invalid category ID");

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) throw httpError(404, "Category not found");

    if (category._count.products > 0) {
      throw httpError(400, "Cannot delete a category that contains products");
    }

    await prisma.category.delete({ where: { id } });
    await deleteImage(keyFromUrl(category.image));

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    sendError(res, error, "Failed to delete category");
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
