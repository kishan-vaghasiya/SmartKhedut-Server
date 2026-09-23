const jwt = require('jsonwebtoken');

function generateUserToken(userId) {
  return jwt.sign({ id: userId, type: 'user' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

function generateAdminToken(adminId) {
  return jwt.sign({ id: adminId, type: 'admin' }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { generateUserToken, generateAdminToken };
