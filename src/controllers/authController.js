const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { generateUserToken } = require('../utils/generateToken');

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    mobile: user.mobile,
    location: user.location,
    avatar: user.avatar,
    verified: user.verified,
    status: user.status,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register  { username, mobile, password }
const register = asyncHandler(async (req, res) => {
  const { username, mobile, password } = req.body;

  if (!username || !mobile || !password) {
    return error(res, { statusCode: 400, message: 'username, mobile and password are required' });
  }
  if (!/^[0-9]{10}$/.test(mobile)) {
    return error(res, { statusCode: 400, message: 'Mobile number must be exactly 10 digits' });
  }
  if (password.length < 6) {
    return error(res, { statusCode: 400, message: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ mobile });
  if (existing) {
    return error(res, { statusCode: 409, message: 'An account with this mobile number already exists' });
  }

  const user = await User.create({ username, mobile, password });
  const token = generateUserToken(user._id);

  return success(res, {
    statusCode: 201,
    message: 'Account created successfully',
    data: { token, user: sanitizeUser(user) },
  });
});

// POST /api/auth/login  { mobile, password }
const login = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return error(res, { statusCode: 400, message: 'mobile and password are required' });
  }

  const user = await User.findOne({ mobile }).select('+password');
  if (!user) {
    return error(res, { statusCode: 401, message: 'Invalid mobile number or password' });
  }
  if (user.status === 'deactivated') {
    return error(res, { statusCode: 403, message: 'Your account has been deactivated. Contact support.' });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    return error(res, { statusCode: 401, message: 'Invalid mobile number or password' });
  }

  const token = generateUserToken(user._id);
  return success(res, {
    message: 'Login successful',
    data: { token, user: sanitizeUser(user) },
  });
});

// GET /api/user/profile  (protected)
const getProfile = asyncHandler(async (req, res) => {
  return success(res, { message: 'Profile fetched', data: sanitizeUser(req.user) });
});

// PUT /api/user/profile  (protected)
const updateProfile = asyncHandler(async (req, res) => {
  const { username, location, avatar } = req.body;
  if (username !== undefined) req.user.username = username;
  if (location !== undefined) req.user.location = location;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  return success(res, { message: 'Profile updated', data: sanitizeUser(req.user) });
});

// PUT /api/user/change-password (protected)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return error(res, { statusCode: 400, message: 'currentPassword and newPassword are required' });
  }
  const user = await User.findById(req.user._id).select('+password');
  const match = await user.comparePassword(currentPassword);
  if (!match) return error(res, { statusCode: 401, message: 'Current password is incorrect' });
  if (newPassword.length < 6) {
    return error(res, { statusCode: 400, message: 'New password must be at least 6 characters' });
  }
  user.password = newPassword;
  await user.save();
  return success(res, { message: 'Password changed successfully' });
});

module.exports = { register, login, getProfile, updateProfile, changePassword, sanitizeUser };
