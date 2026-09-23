const Admin = require('../models/Admin');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { generateAdminToken } = require('../utils/generateToken');

function sanitizeAdmin(admin) {
  return { id: admin._id, name: admin.name, email: admin.email, role: admin.role };
}

// POST /api/admin/auth/login  { email, password }
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return error(res, { statusCode: 400, message: 'email and password are required' });
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin) return error(res, { statusCode: 401, message: 'Invalid email or password' });

  const match = await admin.comparePassword(password);
  if (!match) return error(res, { statusCode: 401, message: 'Invalid email or password' });

  const token = generateAdminToken(admin._id);
  return success(res, {
    message: 'Login successful',
    data: { token, admin: sanitizeAdmin(admin) },
  });
});

// GET /api/admin/auth/me (protected)
const getMe = asyncHandler(async (req, res) => {
  return success(res, { message: 'Admin fetched', data: sanitizeAdmin(req.admin) });
});

module.exports = { adminLogin, getMe, sanitizeAdmin };
