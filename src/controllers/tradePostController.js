const TradePost = require('../models/TradePost');
const TradeCategory = require('../models/TradeCategory');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { toPublicUrl } = require('../utils/fileUrl');

function serialize(req, post) {
  const obj = post.toObject ? post.toObject() : post;
  return {
    ...obj,
    photos: (obj.photos || []).map((p) => toPublicUrl(req, p)),
  };
}

// GET /api/trade/posts?page=&limit=&category=&search=&status=&location=
// Public list — the app's Trade tab. Only "active" posts are visible unless
// the caller is the owner or an admin explicitly asks for another status.
const listPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { category, search, location, sort } = req.query;

  const filter = {};
  const status = req.query.status;
  filter.status = status || 'active';

  if (category) filter.category = category;
  if (location) filter.location = new RegExp(location, 'i');
  if (search) filter.$text = { $search: search };

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_low: { price: 1 },
    price_high: { price: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const [posts, total] = await Promise.all([
    TradePost.find(filter)
      .populate('category', 'name nameEn slug icon')
      .populate('seller', 'username mobile location verified')
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    TradePost.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Trade posts fetched',
    data: posts.map((p) => serialize(req, p)),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// GET /api/trade/posts/:id
const getPost = asyncHandler(async (req, res) => {
  const post = await TradePost.findById(req.params.id)
    .populate('category', 'name nameEn slug icon')
    .populate('seller', 'username mobile location verified');
  if (!post) return error(res, { statusCode: 404, message: 'Post not found' });
  return success(res, { message: 'Post fetched', data: serialize(req, post) });
});

// GET /api/trade/posts/mine  (protected) — current user's own posts, any status
const listMyPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { seller: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [posts, total] = await Promise.all([
    TradePost.find(filter).populate('category', 'name nameEn slug icon').sort({ createdAt: -1 }).skip(skip).limit(limit),
    TradePost.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Your trade posts fetched',
    data: posts.map((p) => serialize(req, p)),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// POST /api/trade/posts  (protected, multipart/form-data, field "photos" up to 5)
const createPost = asyncHandler(async (req, res) => {
  const { name, nameEn, category, price, quantity, unit, description, location } = req.body;

  if (!name || !category || !price || !quantity) {
    return error(res, { statusCode: 400, message: 'name, category, price and quantity are required' });
  }

  const categoryDoc = await TradeCategory.findById(category);
  if (!categoryDoc) return error(res, { statusCode: 400, message: 'Invalid category' });

  const files = req.files || [];
  if (files.length === 0) {
    return error(res, { statusCode: 400, message: 'At least one photo is required' });
  }
  const photos = files.map((f) => `/uploads/trade/${f.filename}`);

  const post = await TradePost.create({
    name,
    nameEn,
    category,
    price: Number(price),
    quantity: Number(quantity),
    unit: unit || 'kg',
    description,
    location,
    photos,
    seller: req.user._id,
    postedBy: 'farmer',
    status: 'pending', // goes live after admin approval, mirrors admin's moderation queue
  });

  const populated = await post.populate([
    { path: 'category', select: 'name nameEn slug icon' },
    { path: 'seller', select: 'username mobile location verified' },
  ]);

  return success(res, { statusCode: 201, message: 'Post submitted for review', data: serialize(req, populated) });
});

// PUT /api/trade/posts/:id  (protected — owner only; multipart optional to add more photos)
const updatePost = asyncHandler(async (req, res) => {
  const post = await TradePost.findById(req.params.id);
  if (!post) return error(res, { statusCode: 404, message: 'Post not found' });
  if (String(post.seller) !== String(req.user._id)) {
    return error(res, { statusCode: 403, message: 'You can only edit your own posts' });
  }

  const { name, nameEn, category, price, quantity, unit, description, location } = req.body;
  if (name !== undefined) post.name = name;
  if (nameEn !== undefined) post.nameEn = nameEn;
  if (category !== undefined) post.category = category;
  if (price !== undefined) post.price = Number(price);
  if (quantity !== undefined) post.quantity = Number(quantity);
  if (unit !== undefined) post.unit = unit;
  if (description !== undefined) post.description = description;
  if (location !== undefined) post.location = location;

  const files = req.files || [];
  if (files.length > 0) {
    const newPhotos = files.map((f) => `/uploads/trade/${f.filename}`);
    post.photos = [...post.photos, ...newPhotos].slice(0, 5);
  }

  post.status = 'pending'; // re-review after edits
  await post.save();

  return success(res, { message: 'Post updated', data: serialize(req, post) });
});

// DELETE /api/trade/posts/:id  (protected — owner only)
const deletePost = asyncHandler(async (req, res) => {
  const post = await TradePost.findById(req.params.id);
  if (!post) return error(res, { statusCode: 404, message: 'Post not found' });
  if (String(post.seller) !== String(req.user._id)) {
    return error(res, { statusCode: 403, message: 'You can only delete your own posts' });
  }
  await post.deleteOne();
  return success(res, { message: 'Post deleted' });
});

// ---- Admin moderation ----

// GET /api/admin/trade/posts?page=&limit=&status=&category=&search=
const adminListPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, category, search } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const [posts, total] = await Promise.all([
    TradePost.find(filter)
      .populate('category', 'name nameEn slug icon')
      .populate('seller', 'username mobile location verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TradePost.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Trade posts fetched',
    data: posts.map((p) => serialize(req, p)),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// PATCH /api/admin/trade/posts/:id/status  { status: active|pending|rejected|hidden }
const adminUpdatePostStatus = asyncHandler(async (req, res) => {
  const { status, verified } = req.body;
  const post = await TradePost.findById(req.params.id);
  if (!post) return error(res, { statusCode: 404, message: 'Post not found' });

  if (status) {
    if (!['active', 'pending', 'rejected', 'hidden'].includes(status)) {
      return error(res, { statusCode: 400, message: 'status must be active, pending, rejected or hidden' });
    }
    post.status = status;
  }
  if (verified !== undefined) post.verified = verified;

  await post.save();
  return success(res, { message: 'Post status updated', data: serialize(req, post) });
});

// Admin can create posts either the same way the app does (multipart
// "photos" files) or the way the admin panel does (JSON body with a
// `photos`/`image` array or string of already-hosted URLs, plus a freeform
// `sellerName`/`phone` instead of a linked app account).
const adminCreatePost = asyncHandler(async (req, res) => {
  const { name, nameEn, category, price, quantity, unit, description, location, sellerId, sellerName, phone, verified, status, rating } = req.body;
  if (!name || !category || !price || !quantity) {
    return error(res, { statusCode: 400, message: 'name, category, price and quantity are required' });
  }

  const files = req.files || [];
  let photos = files.map((f) => `/uploads/trade/${f.filename}`);
  if (photos.length === 0 && req.body.photos) {
    photos = Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos];
  }
  if (photos.length === 0 && req.body.image) {
    photos = [req.body.image];
  }

  const post = await TradePost.create({
    name,
    nameEn,
    category,
    price: Number(price),
    quantity: Number(quantity),
    unit: unit || 'kg',
    description,
    location,
    photos,
    seller: sellerId || undefined,
    sellerName: sellerName || '',
    phone: phone || '',
    postedBy: 'admin',
    status: status || 'active',
    verified: verified === undefined ? true : verified,
    rating: rating || 0,
  });

  const populated = await post.populate({ path: 'category', select: 'name nameEn slug icon' });
  return success(res, { statusCode: 201, message: 'Post created', data: serialize(req, populated) });
});

// PUT /api/admin/trade/posts/:id  (admin) — full edit, same flexible photo/seller handling as create
const adminUpdatePost = asyncHandler(async (req, res) => {
  const post = await TradePost.findById(req.params.id);
  if (!post) return error(res, { statusCode: 404, message: 'Post not found' });

  const { name, nameEn, category, price, quantity, unit, description, location, sellerName, phone, verified, status, rating } = req.body;
  if (name !== undefined) post.name = name;
  if (nameEn !== undefined) post.nameEn = nameEn;
  if (category !== undefined) post.category = category;
  if (price !== undefined) post.price = Number(price);
  if (quantity !== undefined) post.quantity = Number(quantity);
  if (unit !== undefined) post.unit = unit;
  if (description !== undefined) post.description = description;
  if (location !== undefined) post.location = location;
  if (sellerName !== undefined) post.sellerName = sellerName;
  if (phone !== undefined) post.phone = phone;
  if (verified !== undefined) post.verified = verified;
  if (rating !== undefined) post.rating = rating;
  if (status !== undefined) {
    if (!['active', 'pending', 'rejected', 'hidden'].includes(status)) {
      return error(res, { statusCode: 400, message: 'status must be active, pending, rejected or hidden' });
    }
    post.status = status;
  }

  const files = req.files || [];
  if (files.length > 0) {
    post.photos = files.map((f) => `/uploads/trade/${f.filename}`).slice(0, 5);
  } else if (req.body.photos) {
    post.photos = (Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos]).slice(0, 5);
  } else if (req.body.image !== undefined) {
    post.photos = req.body.image ? [req.body.image] : [];
  }

  await post.save();
  const populated = await post.populate({ path: 'category', select: 'name nameEn slug icon' });
  return success(res, { message: 'Post updated', data: serialize(req, populated) });
});

const adminDeletePost = asyncHandler(async (req, res) => {
  const post = await TradePost.findById(req.params.id);
  if (!post) return error(res, { statusCode: 404, message: 'Post not found' });
  await post.deleteOne();
  return success(res, { message: 'Post deleted' });
});

module.exports = {
  listPosts,
  getPost,
  listMyPosts,
  createPost,
  updatePost,
  deletePost,
  adminListPosts,
  adminUpdatePostStatus,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
};
