const Scheme = require('../models/Scheme');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// GET /api/schemes?page=&limit=&active=  (public)
const listSchemes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';

  const [schemes, total] = await Promise.all([
    Scheme.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Scheme.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Schemes fetched',
    data: schemes,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

const getScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);
  if (!scheme) return error(res, { statusCode: 404, message: 'Scheme not found' });
  return success(res, { message: 'Scheme fetched', data: scheme });
});

// POST /api/admin/schemes  (admin)
const createScheme = asyncHandler(async (req, res) => {
  const {
    name, nameEn, nameHi,
    tag, tagEn, tagHi,
    benefit, benefitEn, benefitHi,
    description, descriptionEn, descriptionHi,
    active,
  } = req.body;
  if (!name || !nameEn) return error(res, { statusCode: 400, message: 'name and nameEn are required' });
  const scheme = await Scheme.create({
    name, nameEn, nameHi,
    tag, tagEn, tagHi,
    benefit, benefitEn, benefitHi,
    description, descriptionEn, descriptionHi,
    active,
  });
  return success(res, { statusCode: 201, message: 'Scheme created', data: scheme });
});

// PUT /api/admin/schemes/:id  (admin)
const updateScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);
  if (!scheme) return error(res, { statusCode: 404, message: 'Scheme not found' });

  const {
    name, nameEn, nameHi,
    tag, tagEn, tagHi,
    benefit, benefitEn, benefitHi,
    description, descriptionEn, descriptionHi,
    active,
  } = req.body;
  if (name !== undefined) scheme.name = name;
  if (nameEn !== undefined) scheme.nameEn = nameEn;
  if (nameHi !== undefined) scheme.nameHi = nameHi;
  if (tag !== undefined) scheme.tag = tag;
  if (tagEn !== undefined) scheme.tagEn = tagEn;
  if (tagHi !== undefined) scheme.tagHi = tagHi;
  if (benefit !== undefined) scheme.benefit = benefit;
  if (benefitEn !== undefined) scheme.benefitEn = benefitEn;
  if (benefitHi !== undefined) scheme.benefitHi = benefitHi;
  if (description !== undefined) scheme.description = description;
  if (descriptionEn !== undefined) scheme.descriptionEn = descriptionEn;
  if (descriptionHi !== undefined) scheme.descriptionHi = descriptionHi;
  if (active !== undefined) scheme.active = active;

  await scheme.save();
  return success(res, { message: 'Scheme updated', data: scheme });
});

// DELETE /api/admin/schemes/:id  (admin)
const deleteScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);
  if (!scheme) return error(res, { statusCode: 404, message: 'Scheme not found' });
  await scheme.deleteOne();
  return success(res, { message: 'Scheme deleted' });
});

// PATCH /api/admin/schemes/:id/toggle  (admin) — flips active on/off
const toggleScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);
  if (!scheme) return error(res, { statusCode: 404, message: 'Scheme not found' });
  scheme.active = !scheme.active;
  await scheme.save();
  return success(res, { message: 'Scheme status toggled', data: scheme });
});

module.exports = { listSchemes, getScheme, createScheme, updateScheme, deleteScheme, toggleScheme };
