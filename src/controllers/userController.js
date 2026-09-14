const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// GET /api/admin/users?page=&limit=&search=&status=&verified=  (admin)
const adminListUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const { search, status, verified } = req.query;

  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (verified !== undefined) filter.verified = verified === 'true';
  if (search) {
    filter.$or = [
      { username: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
      { location: new RegExp(search, 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return success(res, {
    message: 'Users fetched',
    data: users,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

const adminGetUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return error(res, { statusCode: 404, message: 'User not found' });
  return success(res, { message: 'User fetched', data: user });
});

// PATCH /api/admin/users/:id/status  { status: active|deactivated }  (admin)
const adminUpdateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'deactivated'].includes(status)) {
    return error(res, { statusCode: 400, message: 'status must be active or deactivated' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return error(res, { statusCode: 404, message: 'User not found' });
  user.status = status;
  await user.save();
  return success(res, { message: 'User status updated', data: user });
});

// PATCH /api/admin/users/:id/verify  (admin)
const adminVerifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return error(res, { statusCode: 404, message: 'User not found' });
  user.verified = req.body.verified !== undefined ? req.body.verified : !user.verified;
  await user.save();
  return success(res, { message: 'User verification updated', data: user });
});

module.exports = { adminListUsers, adminGetUser, adminUpdateUserStatus, adminVerifyUser };
