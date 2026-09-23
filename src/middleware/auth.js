const jwt = require('jsonwebtoken');
const { error } = require('../utils/apiResponse');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Protects app-facing routes. Expects: Authorization: Bearer <token>
async function protectUser(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return error(res, { statusCode: 401, message: 'Not authorized, token missing' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return error(res, { statusCode: 401, message: 'User not found' });
    if (user.status === 'deactivated') {
      return error(res, { statusCode: 403, message: 'Your account has been deactivated' });
    }
    req.user = user;
    next();
  } catch (err) {
    return error(res, { statusCode: 401, message: 'Not authorized, invalid or expired token' });
  }
}

// Like protectUser, but does not fail the request when no/invalid token is
// supplied. Useful for public list endpoints that want to know `isOwner`.
async function attachUserIfPresent(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (_err) {
    // ignore invalid token for optional auth
  }
  next();
}

// Protects admin-panel routes. Expects: Authorization: Bearer <adminToken>
async function protectAdmin(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return error(res, { statusCode: 401, message: 'Not authorized, token missing' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) return error(res, { statusCode: 401, message: 'Admin not found' });
    req.admin = admin;
    next();
  } catch (err) {
    return error(res, { statusCode: 401, message: 'Not authorized, invalid or expired admin token' });
  }
}

module.exports = { protectUser, attachUserIfPresent, protectAdmin };
