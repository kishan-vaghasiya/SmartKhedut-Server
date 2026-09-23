const MarketAd = require('../models/MarketAd');
const MarketCategory = require('../models/MarketCategory');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { toPublicUrl } = require('../utils/fileUrl');

function serialize(req, ad) {
  const obj = ad.toObject ? ad.toObject() : ad;
  return { ...obj, photos: (obj.photos || []).map((p) => toPublicUrl(req, p)) };
}

// GET /api/market/ads?page=&limit=&category=&group=&search=&location=&status=&sort=
const listAds = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { category, search, location, sort, group } = req.query;

  const filter = { status: req.query.status || 'active' };
  if (category) filter.category = category;
  if (location) filter.location = new RegExp(location, 'i');
  if (search) filter.$text = { $search: search };

  if (group && group !== 'all') {
    const catsInGroup = await MarketCategory.find({ group }).select('_id');
    filter.category = { $in: catsInGroup.map((c) => c._id) };
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_low: { price: 1 },
    price_high: { price: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const [ads, total] = await Promise.all([
    MarketAd.find(filter)
      .populate('category', 'name nameEn slug icon group')
      .populate('postedByUser', 'username mobile location verified')
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    MarketAd.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Market ads fetched',
    data: ads.map((a) => serialize(req, a)),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

const getAd = asyncHandler(async (req, res) => {
  const ad = await MarketAd.findById(req.params.id)
    .populate('category', 'name nameEn slug icon group')
    .populate('postedByUser', 'username mobile location verified');
  if (!ad) return error(res, { statusCode: 404, message: 'Advertisement not found' });
  return success(res, { message: 'Advertisement fetched', data: serialize(req, ad) });
});

// GET /api/market/ads/mine  (protected)
const listMyAds = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { postedByUser: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [ads, total] = await Promise.all([
    MarketAd.find(filter).populate('category', 'name nameEn slug icon group').sort({ createdAt: -1 }).skip(skip).limit(limit),
    MarketAd.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Your advertisements fetched',
    data: ads.map((a) => serialize(req, a)),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// POST /api/market/ads  (protected, multipart/form-data, field "photos" up to 4)
const createAd = asyncHandler(async (req, res) => {
  const { title, category, price, year, location, phone, description, condition, negotiable } = req.body;

  if (!title || !category || !price || !location || !phone) {
    return error(res, { statusCode: 400, message: 'title, category, price, location and phone are required' });
  }

  const categoryDoc = await MarketCategory.findById(category);
  if (!categoryDoc) return error(res, { statusCode: 400, message: 'Invalid category' });

  const files = req.files || [];
  if (files.length === 0) {
    return error(res, { statusCode: 400, message: 'At least one photo is required' });
  }
  const photos = files.map((f) => `/uploads/market/${f.filename}`);

  const ad = await MarketAd.create({
    title,
    category,
    price: Number(price),
    year,
    location,
    phone,
    description,
    condition: condition === 'new' || condition === 'New' ? 'New' : 'Used',
    negotiable: negotiable === undefined ? true : negotiable === 'true' || negotiable === true,
    photos,
    postedByUser: req.user._id,
    postedBy: 'farmer',
    status: 'active',
  });

  const populated = await ad.populate([
    { path: 'category', select: 'name nameEn slug icon group' },
    { path: 'postedByUser', select: 'username mobile location verified' },
  ]);

  return success(res, { statusCode: 201, message: 'Advertisement submitted for review', data: serialize(req, populated) });
});

// PUT /api/market/ads/:id  (protected — owner only)
const updateAd = asyncHandler(async (req, res) => {
  const ad = await MarketAd.findById(req.params.id);
  if (!ad) return error(res, { statusCode: 404, message: 'Advertisement not found' });
  if (String(ad.postedByUser) !== String(req.user._id)) {
    return error(res, { statusCode: 403, message: 'You can only edit your own advertisements' });
  }

  const { title, category, price, year, location, phone, description, condition, negotiable } = req.body;
  if (title !== undefined) ad.title = title;
  if (category !== undefined) ad.category = category;
  if (price !== undefined) ad.price = Number(price);
  if (year !== undefined) ad.year = year;
  if (location !== undefined) ad.location = location;
  if (phone !== undefined) ad.phone = phone;
  if (description !== undefined) ad.description = description;
  if (condition !== undefined) ad.condition = condition === 'new' || condition === 'New' ? 'New' : 'Used';
  if (negotiable !== undefined) ad.negotiable = negotiable === 'true' || negotiable === true;

  const files = req.files || [];
  if (files.length > 0) {
    const newPhotos = files.map((f) => `/uploads/market/${f.filename}`);
    ad.photos = [...ad.photos, ...newPhotos].slice(0, 4);
  }

  ad.status = 'active';
  await ad.save();

  return success(res, { message: 'Advertisement updated', data: serialize(req, ad) });
});

const deleteAd = asyncHandler(async (req, res) => {
  const ad = await MarketAd.findById(req.params.id);
  if (!ad) return error(res, { statusCode: 404, message: 'Advertisement not found' });
  if (String(ad.postedByUser) !== String(req.user._id)) {
    return error(res, { statusCode: 403, message: 'You can only delete your own advertisements' });
  }
  await ad.deleteOne();
  return success(res, { message: 'Advertisement deleted' });
});

// ---- Admin moderation ----

const adminListAds = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, category, search } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const [ads, total] = await Promise.all([
    MarketAd.find(filter)
      .populate('category', 'name nameEn slug icon group')
      .populate('postedByUser', 'username mobile location verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MarketAd.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Market ads fetched',
    data: ads.map((a) => serialize(req, a)),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

const adminUpdateAdStatus = asyncHandler(async (req, res) => {
  const { status, verified } = req.body;
  const ad = await MarketAd.findById(req.params.id);
  if (!ad) return error(res, { statusCode: 404, message: 'Advertisement not found' });

  if (status) {
    if (!['active', 'rejected', 'hidden'].includes(status)) {
      return error(res, { statusCode: 400, message: 'status must be active, rejected or hidden' });
    }
    ad.status = status;
  }
  if (verified !== undefined) ad.verified = verified;

  await ad.save();
  return success(res, { message: 'Advertisement status updated', data: serialize(req, ad) });
});

// Admin can create ads either the app's way (multipart "photos" files) or
// the admin panel's way (JSON body with an `images`/`photos` array of
// already-hosted URLs and no linked app account).
const adminCreateAd = asyncHandler(async (req, res) => {
  const { title, category, price, year, location, phone, description, condition, sellerId, verified, status } = req.body;
  if (!title || !category || !price || !location || !phone) {
    return error(res, { statusCode: 400, message: 'title, category, price, location and phone are required' });
  }

  const files = req.files || [];
  let photos = files.map((f) => `/uploads/market/${f.filename}`);
  if (photos.length === 0 && req.body.images) {
    photos = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
  }
  if (photos.length === 0 && req.body.photos) {
    photos = Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos];
  }

  const ad = await MarketAd.create({
    title,
    category,
    price: Number(price),
    year,
    location,
    phone,
    description,
    condition: condition === 'New' ? 'New' : 'Used',
    photos,
    postedByUser: sellerId || undefined,
    postedBy: 'admin',
    status: status || 'active',
    verified: verified === undefined ? true : verified,
  });

  const populated = await ad.populate({ path: 'category', select: 'name nameEn slug icon group' });
  return success(res, { statusCode: 201, message: 'Advertisement created', data: serialize(req, populated) });
});

// PUT /api/admin/market/ads/:id  (admin) — full edit
const adminUpdateAd = asyncHandler(async (req, res) => {
  const ad = await MarketAd.findById(req.params.id);
  if (!ad) return error(res, { statusCode: 404, message: 'Advertisement not found' });

  const { title, category, price, year, location, phone, description, condition, verified, status } = req.body;
  if (title !== undefined) ad.title = title;
  if (category !== undefined) ad.category = category;
  if (price !== undefined) ad.price = Number(price);
  if (year !== undefined) ad.year = year;
  if (location !== undefined) ad.location = location;
  if (phone !== undefined) ad.phone = phone;
  if (description !== undefined) ad.description = description;
  if (condition !== undefined) ad.condition = condition === 'New' ? 'New' : 'Used';
  if (verified !== undefined) ad.verified = verified;
  if (status !== undefined) {
    if (!['active', 'rejected', 'hidden'].includes(status)) {
      return error(res, { statusCode: 400, message: 'status must be active, rejected or hidden' });
    }
    ad.status = status;
  }

  const files = req.files || [];
  if (files.length > 0) {
    ad.photos = files.map((f) => `/uploads/market/${f.filename}`).slice(0, 4);
  } else if (req.body.images !== undefined) {
    ad.photos = (Array.isArray(req.body.images) ? req.body.images : [req.body.images]).filter(Boolean).slice(0, 4);
  } else if (req.body.photos !== undefined) {
    ad.photos = (Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos]).filter(Boolean).slice(0, 4);
  }

  await ad.save();
  const populated = await ad.populate({ path: 'category', select: 'name nameEn slug icon group' });
  return success(res, { message: 'Advertisement updated', data: serialize(req, populated) });
});

const adminDeleteAd = asyncHandler(async (req, res) => {
  const ad = await MarketAd.findById(req.params.id);
  if (!ad) return error(res, { statusCode: 404, message: 'Advertisement not found' });
  await ad.deleteOne();
  return success(res, { message: 'Advertisement deleted' });
});

module.exports = {
  listAds,
  getAd,
  listMyAds,
  createAd,
  updateAd,
  deleteAd,
  adminListAds,
  adminUpdateAdStatus,
  adminCreateAd,
  adminUpdateAd,
  adminDeleteAd,
};
