const MarketCategory = require('../models/MarketCategory');
const MarketAd = require('../models/MarketAd');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/market/categories?group=  (public) — fills the category grid +
// the New Advertisement "Select Category" step.
const listCategories = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  if (req.query.group) filter.group = req.query.group;

  const categories = await MarketCategory.find(filter).sort({ createdAt: 1 });

  const withCounts = await Promise.all(
    categories.map(async (cat) => {
      const listings = await MarketAd.countDocuments({ category: cat._id });
      return { ...cat.toObject(), listings };
    }),
  );

  return success(res, { message: 'Market categories fetched', data: withCounts });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await MarketCategory.findById(req.params.id);
  if (!category) return error(res, { statusCode: 404, message: 'Category not found' });
  return success(res, { message: 'Category fetched', data: category });
});

// POST /api/admin/market/categories  (admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, nameEn, icon, group, active } = req.body;
  if (!name || !nameEn || !group) {
    return error(res, { statusCode: 400, message: 'name, nameEn and group are required' });
  }
  const slug = slugify(nameEn);
  const exists = await MarketCategory.findOne({ slug });
  if (exists) return error(res, { statusCode: 409, message: 'A category with this name already exists' });

  const category = await MarketCategory.create({ name, nameEn, slug, icon, group, active });
  return success(res, { statusCode: 201, message: 'Market category created', data: category });
});

// PUT /api/admin/market/categories/:id  (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const category = await MarketCategory.findById(req.params.id);
  if (!category) return error(res, { statusCode: 404, message: 'Category not found' });

  const { name, nameEn, icon, group, active } = req.body;
  if (name !== undefined) category.name = name;
  if (nameEn !== undefined) {
    category.nameEn = nameEn;
    category.slug = slugify(nameEn);
  }
  if (icon !== undefined) category.icon = icon;
  if (group !== undefined) category.group = group;
  if (active !== undefined) category.active = active;

  await category.save();
  return success(res, { message: 'Market category updated', data: category });
});

// DELETE /api/admin/market/categories/:id  (admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await MarketCategory.findById(req.params.id);
  if (!category) return error(res, { statusCode: 404, message: 'Category not found' });

  const inUse = await MarketAd.countDocuments({ category: category._id });
  if (inUse > 0) {
    return error(res, {
      statusCode: 409,
      message: `Cannot delete: ${inUse} ad(s) still use this category. Deactivate it instead.`,
    });
  }

  await category.deleteOne();
  return success(res, { message: 'Market category deleted' });
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory, slugify };
