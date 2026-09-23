const TradeCategory = require('../models/TradeCategory');
const TradePost = require('../models/TradePost');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/trade/categories  (public) — used to fill the "Type" dropdown
const listCategories = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';

  const categories = await TradeCategory.find(filter).sort({ createdAt: 1 });

  // Attach a live listing count, same shape the admin mock data used.
  const withCounts = await Promise.all(
    categories.map(async (cat) => {
      const listings = await TradePost.countDocuments({ category: cat._id });
      return { ...cat.toObject(), listings };
    }),
  );

  return success(res, { message: 'Trade categories fetched', data: withCounts });
});

// GET /api/trade/categories/:id
const getCategory = asyncHandler(async (req, res) => {
  const category = await TradeCategory.findById(req.params.id);
  if (!category) return error(res, { statusCode: 404, message: 'Category not found' });
  return success(res, { message: 'Category fetched', data: category });
});

// POST /api/admin/trade/categories  (admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, nameEn, nameHi, icon, active } = req.body;
  if (!name || !nameEn) {
    return error(res, { statusCode: 400, message: 'name and nameEn are required' });
  }
  const slug = slugify(nameEn);
  const exists = await TradeCategory.findOne({ slug });
  if (exists) return error(res, { statusCode: 409, message: 'A category with this name already exists' });

  const category = await TradeCategory.create({ name, nameEn, nameHi, slug, icon, active });
  return success(res, { statusCode: 201, message: 'Trade category created', data: category });
});

// PUT /api/admin/trade/categories/:id  (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const category = await TradeCategory.findById(req.params.id);
  if (!category) return error(res, { statusCode: 404, message: 'Category not found' });

  const { name, nameEn, nameHi, icon, active } = req.body;
  if (name !== undefined) category.name = name;
  if (nameEn !== undefined) {
    category.nameEn = nameEn;
    category.slug = slugify(nameEn);
  }
  if (nameHi !== undefined) category.nameHi = nameHi;
  if (icon !== undefined) category.icon = icon;
  if (active !== undefined) category.active = active;

  await category.save();
  return success(res, { message: 'Trade category updated', data: category });
});

// DELETE /api/admin/trade/categories/:id  (admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await TradeCategory.findById(req.params.id);
  if (!category) return error(res, { statusCode: 404, message: 'Category not found' });

  const inUse = await TradePost.countDocuments({ category: category._id });
  if (inUse > 0) {
    return error(res, {
      statusCode: 409,
      message: `Cannot delete: ${inUse} post(s) still use this category. Deactivate it instead.`,
    });
  }

  await category.deleteOne();
  return success(res, { message: 'Trade category deleted' });
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory, slugify };
